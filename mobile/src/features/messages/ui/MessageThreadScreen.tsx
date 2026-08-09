import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Lock,
  Paperclip,
  SendHorizonal,
  ShieldCheck,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useKeyboard } from '@/hooks/use-keyboard';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useMarkRead, useSendAttachment, useSendMessage, useThread } from '../data/messagesApi';
import { useChatSocket } from '../data/useChatSocket';
import { useUploadFile } from '@/features/upload/data/uploadApi';

/**
 * Deal / vendor chat — the phone version of `web/src/pages/MessageThread.tsx`.
 *
 * Same anatomy: a tappable counterparty header, the immutable-log notice, the
 * bubble thread, and a composer with an attachment button. The deal page links
 * here with `?redirect=/escrow/:id`, and Back honours it, exactly as the web's
 * back link does.
 *
 * Two transports, deliberately. Text goes over REST (`POST /api/messages/…`);
 * attachments go over the socket, because the REST endpoint has no attachment
 * field and the socket does. Photos and PDFs both, matching the web's
 * `accept="image/*,application/pdf"`. The socket also keeps the thread live, so
 * the other side's messages arrive without a refresh.
 */

/** The server's cap, mirrored so an oversized pick fails before uploading. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface LocalMessage {
  id: string;
  body: string;
  mine: boolean;
  at: string;
  /**
   * Delivery state, shown only on your own messages.
   *
   * Anything the thread returns has been persisted by the server, so its mere
   * presence means delivered — one tick. `readAt` is stamped when the other
   * party opens the thread, which is the second tick.
   */
  readAt: string | null;
  /** Set when the message is a photo — rendered inline. */
  imageUri?: string;
  /**
   * Set when the message is a non-image file, e.g. a PDF receipt. Kept separate
   * from `imageUri` because feeding a PDF URL to `<Image>` renders nothing at
   * all — the evidence would be sent, stored, and invisible.
   */
  file?: { url: string; name: string };
}

const clockTime = (iso?: string) =>
  (iso ? new Date(iso) : new Date()).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

export function MessageThreadScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { username = '', redirect } = useLocalSearchParams<{
    username: string;
    redirect?: string;
  }>();

  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [attachError, setAttachError] = useState<string | null>(null);
  // Android is edge-to-edge from SDK 54, so the window no longer shrinks for
  // the keyboard and KeyboardAvoidingView has nothing to do. Padding by the
  // measured height lifts the composer on both platforms instead.
  const { keyboardHeight } = useKeyboard();

  /**
   * The real thread. `mine` is decided server-side, so the bubble alignment
   * doesn't depend on comparing usernames here.
   */
  const threadQuery = useThread(username);
  const sendMessage = useSendMessage(username);
  const sendAttachment = useSendAttachment(username);
  const markRead = useMarkRead(username);
  const uploadFile = useUploadFile();

  /**
   * Joins this thread's socket room, so the other party's messages — including
   * their photos — land here without a pull-to-refresh.
   */
  useChatSocket(username);

  /** Covers both legs — the Cloudinary upload and the socket send. */
  const attaching = uploadFile.isPending || sendAttachment.isPending;

  const messages = useMemo<LocalMessage[]>(
    () =>
      (threadQuery.data?.messages ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        mine: m.mine,
        at: clockTime(m.createdAt),
        readAt: m.readAt,
        // The URL lives on the attachment object, not on the message itself.
        // Images render inline; anything else becomes a tappable file chip.
        imageUri:
          m.type === 'file' && m.attachment?.mime.startsWith('image/')
            ? m.attachment.url
            : undefined,
        file:
          m.type === 'file' && m.attachment && !m.attachment.mime.startsWith('image/')
            ? { url: m.attachment.url, name: m.attachment.name }
            : undefined,
      })),
    [threadQuery.data],
  );

  /** Comes with the thread — no user directory lookup needed. */
  const counterparty = threadQuery.data?.counterparty;

  // Opening the thread clears its unread badge, as on the web.
  useEffect(() => {
    if (threadQuery.data && username) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.data?.counterparty.username]);

  // Keep the newest message in view — on send, and when the keyboard opens and
  // steals the bottom of the thread.
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length, keyboardHeight]);

  /** Back honours the `redirect` the caller passed, like the web's back link. */
  const goBack = () => {
    if (redirect && redirect.startsWith('/')) router.replace(redirect as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/marketplace');
  };

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    // Cleared up front so the composer feels immediate; restored on failure so
    // nothing typed is lost.
    setDraft('');
    try {
      await sendMessage.mutateAsync(body);
    } catch (err) {
      setDraft(body);
      setAttachError(apiErrorMessage(err));
    }
  };

  /**
   * Attach a photo or a PDF — two steps, the same pair the web's paperclip takes.
   *
   * 1. Upload to Cloudinary over REST, turning the picker's on-device
   *    `file:///…` path into a URL the other party can actually fetch.
   * 2. Send it over the **socket**, because that is the only transport that
   *    accepts an attachment. `POST /api/messages/:username` validates `body`
   *    and nothing else, so the same file sent that way would be stored as a
   *    text message containing a link — no name, no mime, no size, and `type`
   *    left as `text`. For evidence in a dispute, being a real `file` message is
   *    the whole point.
   */
  const attach = async () => {
    setAttachError(null);
    try {
      /**
       * A document picker rather than the image picker, and this is the reason:
       * the web's file input is `accept="image/*,application/pdf"`, and the
       * upload endpoint's multer filter allows exactly that set. Photos alone
       * would leave a seller unable to send the receipt or invoice that settles
       * a dispute.
       *
       * It also needs no permission prompt — the system picker hands back only
       * what the user chose — and it returns `name`, `mimeType` and `size`
       * directly, which are three of the four fields the server requires.
       */
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const picked = result.assets[0];

      // The server rejects anything over 10MB, and it's kinder to say so before
      // a long upload than after it.
      if (picked.size && picked.size > MAX_ATTACHMENT_BYTES) {
        setAttachError('That file is over 10MB. Please send a smaller one.');
        return;
      }

      const mime = picked.mimeType || 'application/octet-stream';
      const name = picked.name || 'attachment';

      try {
        const uploaded = await uploadFile.mutateAsync({ uri: picked.uri, name, type: mime });
        await sendAttachment.mutateAsync({
          url: uploaded.url,
          // All four are required by the server's schema. Size comes from the
          // upload response — the bytes actually stored — falling back to the
          // picker's figure, and finally to 1, since the schema's minimum is 1
          // and a rejected send would be worse than a slightly wrong number.
          name: uploaded.originalName || name,
          mime,
          size: uploaded.size || picked.size || 1,
        });
      } catch (err) {
        setAttachError(apiErrorMessage(err));
      }
    } catch {
      setAttachError("Couldn't open the file picker on this device.");
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      {/* The whole column shrinks by the keyboard height, so the thread and the
          composer both stay above it. */}
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <View style={styles.column}>
          {/* Back */}
          <View style={styles.backWrap}>
            <Pressable
              onPress={goBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [
                styles.backRow,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            >
              <ArrowLeft size={20} color={theme.text} />
              <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
            </Pressable>
          </View>

          {/* Counterparty header — taps through to the profile, as on the web */}
          <Pressable
            onPress={() => router.push(`/seller/${username}`)}
            style={({ pressed }) => [
              styles.header,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.card,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerText}>
              <View style={styles.headerNameRow}>
                <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
                  {counterparty?.storeName ?? `@${username}`}
                </Text>
                {counterparty?.verified ? <ShieldCheck size={14} color={theme.primary} /> : null}
              </View>
              <Text style={[styles.headerSub, { color: theme.textTertiary }]} numberOfLines={1}>
                @{username} · view profile
              </Text>
            </View>
          </Pressable>

          {/* Thread */}
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={[styles.lockNotice, { backgroundColor: theme.backgroundElement }]}>
              <Lock size={11} color={theme.textTertiary} />
              <Text style={[styles.lockText, { color: theme.textSecondary }]}>
                Messages are immutably logged and become dispute evidence for any deal between you
                two.
              </Text>
            </View>

            {messages.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textTertiary }]}>
                Say hello — ask about a listing or coordinate a delivery.
              </Text>
            ) : null}

            {messages.map((m) => (
              <View key={m.id} style={[styles.bubbleRow, m.mine ? styles.mineRow : styles.theirRow]}>
                <View
                  style={[
                    styles.bubble,
                    m.mine
                      ? [styles.mineBubble, { backgroundColor: theme.primary }]
                      : [
                          styles.theirBubble,
                          { backgroundColor: theme.card, borderColor: theme.cardBorder },
                        ],
                  ]}
                >
                  {m.imageUri ? (
                    <Image source={m.imageUri} style={styles.bubbleImage} contentFit="cover" />
                  ) : null}

                  {/* A PDF can't render inline, so it gets a chip that opens it
                      in the device's viewer — which is what makes it usable as
                      evidence rather than just a row in the database. */}
                  {m.file ? (
                    <Pressable
                      onPress={() => Linking.openURL(m.file!.url)}
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${m.file.name}`}
                      style={({ pressed }) => [
                        styles.fileChip,
                        {
                          backgroundColor: m.mine
                            ? 'rgba(255,255,255,0.18)'
                            : theme.backgroundElement,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <FileText size={16} color={m.mine ? '#ffffff' : theme.text} />
                      <Text
                        numberOfLines={1}
                        style={[styles.fileName, { color: m.mine ? '#ffffff' : theme.text }]}
                      >
                        {m.file.name}
                      </Text>
                    </Pressable>
                  ) : null}

                  {/* An attachment-only message has an empty body — rendering an
                      empty Text would still add a line of height under it. */}
                  {m.body ? (
                    <Text style={[styles.bubbleText, { color: m.mine ? '#ffffff' : theme.text }]}>
                      {m.body}
                    </Text>
                  ) : null}
                  {/* Time, and on your own messages a delivery tick beside it.
                      Only on yours — a tick on the other person's message would
                      be telling them something they already know. */}
                  <View style={styles.bubbleFooter}>
                    <Text
                      style={[
                        styles.bubbleTime,
                        { color: m.mine ? 'rgba(255,255,255,0.75)' : theme.textTertiary },
                      ]}
                    >
                      {m.at}
                    </Text>
                    {m.mine ? (
                      m.readAt ? (
                        <CheckCheck size={13} color="#ffffff" accessibilityLabel="Read" />
                      ) : (
                        <Check
                          size={13}
                          color="rgba(255,255,255,0.75)"
                          accessibilityLabel="Delivered"
                        />
                      )
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {attachError ? (
            <View style={styles.attachError}>
              <Text style={styles.attachErrorText}>{attachError}</Text>
            </View>
          ) : null}

          {/* Composer — stays above the keyboard */}
          <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <Pressable
              onPress={attach}
              // Uploading a photo over a slow link takes seconds, and without
              // this the paperclip looks idle and invites a second tap — which
              // would send the same evidence twice.
              disabled={attaching}
              accessibilityRole="button"
              accessibilityLabel={attaching ? 'Sending attachment' : 'Attach a photo or PDF'}
              style={({ pressed }) => [
                styles.attach,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.inputBackground,
                  borderColor: theme.inputBorder,
                  opacity: attaching ? 0.5 : 1,
                },
              ]}
            >
              {attaching ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <Paperclip size={16} color={theme.text} />
              )}
            </Pressable>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message @${username}...`}
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                },
              ]}
              returnKeyType="send"
              onSubmitEditing={send}
            />

            <Pressable
              onPress={send}
              disabled={!draft.trim()}
              accessibilityLabel="Send message"
              style={[
                styles.send,
                { backgroundColor: theme.primary, opacity: draft.trim() ? 1 : 0.4 },
              ]}
            >
              <SendHorizonal size={16} color="#ffffff" />
            </Pressable>
          </View>

          <Text style={[styles.footNote, { color: theme.textTertiary }]}>
            UI preview — messages are local until the API is wired.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },

  backWrap: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans[700] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  avatar: {
    height: 38,
    width: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontFamily: Fonts.sans[700], color: '#ffffff' },
  headerText: { flex: 1, gap: 1 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerName: { flexShrink: 1, fontSize: 13.5, fontFamily: Fonts.sans[700] },
  headerSub: { fontSize: 10.5, fontFamily: Fonts.sans[400] },

  thread: { padding: Spacing.four, gap: Spacing.two },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    alignSelf: 'center',
    maxWidth: 340,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  lockText: { flex: 1, fontSize: 10.5, lineHeight: 14, fontFamily: Fonts.sans[400] },
  empty: { fontSize: 12, textAlign: 'center', marginTop: Spacing.five, fontFamily: Fonts.sans[400] },

  bubbleRow: { flexDirection: 'row' },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  mineBubble: { borderBottomRightRadius: Radius.xs },
  theirBubble: { borderWidth: 1, borderBottomLeftRadius: Radius.xs },
  bubbleImage: {
    height: 170,
    width: 200,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
    maxWidth: 220,
  },
  fileName: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[600] },
  bubbleText: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans[400] },
  // Right-aligned so the tick sits at the bubble's trailing edge, where the eye
  // already goes for the timestamp.
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  bubbleTime: { fontSize: 9.5, fontFamily: Fonts.sans[500] },

  attachError: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    backgroundColor: '#fee2e2',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachErrorText: { fontSize: 11.5, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  attach: {
    height: 44,
    width: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  send: {
    height: 44,
    width: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footNote: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: Fonts.sans[400],
    paddingVertical: Spacing.two,
  },
});
