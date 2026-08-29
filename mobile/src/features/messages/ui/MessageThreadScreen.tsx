import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Lock,
  Paperclip,
  RotateCcw,
  SendHorizonal,
  ShieldCheck,
  TriangleAlert,
  X,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboard } from '@/hooks/use-keyboard';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useChat } from '../data/useChat';
import { useUploadFile } from '@/features/upload/data/uploadApi';

/**
 * Deal / vendor chat — the phone version of `web/src/pages/MessageThread.tsx`.
 *
 * Same anatomy: a tappable counterparty header, the immutable-log notice, the
 * bubble thread, and a composer with an attachment button. The deal page links
 * here with `?redirect=/escrow/:id`, and Back honours it, exactly as the web's
 * back link does.
 *
 * Everything runs on the socket now (see `useChat`), where it previously used
 * REST for history and text and treated the socket as a doorbell that triggered
 * a refetch. That refetch is what made an incoming message take seconds to
 * appear when it had already arrived over the wire.
 */

/** The server's cap, mirrored so an oversized pick fails before uploading. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface LocalMessage {
  id: string;
  body: string;
  mine: boolean;
  at: string;
  /**
   * A deal-lifecycle notice written by the server, not by either party. Rendered
   * as a centred chip rather than a bubble — it belongs to the conversation, not
   * to a side of it, and aligning it left or right implies someone said it.
   */
  system: boolean;
  /** Set on a system notice about a deal — makes the chip tappable. */
  escrowId: string | null;
  /**
   * Delivery state, shown only on your own messages.
   *
   * A persisted message means delivered — one tick. `readAt` is stamped when the
   * other party opens the thread, which is the second tick. `pending` is the
   * step before either: on screen, not yet acknowledged.
   */
  readAt: string | null;
  pending: boolean;
  failed: boolean;
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
   * The live thread. History, sends, read receipts and typing all ride the one
   * socket connection; opening it is also what clears the unread badge, so
   * there is no separate mark-read call here.
   */
  const chat = useChat(username);
  const uploadFile = useUploadFile();

  /** Covers both legs — the Cloudinary upload and the socket send. */
  const attaching = uploadFile.isPending;

  const messages = useMemo<LocalMessage[]>(
    () =>
      chat.messages.map((m) => ({
        id: m.id,
        body: m.body,
        // No server-sent `mine` on this transport: one payload is broadcast to
        // both parties, so the side is derived from the sender, as the web does.
        mine: m.senderId === chat.meId,
        at: clockTime(m.createdAt),
        system: m.type === 'system',
        escrowId: m.escrowId,
        readAt: m.readAt,
        pending: Boolean(m.pending),
        failed: Boolean(m.failed),
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
    [chat.messages, chat.meId],
  );

  /** Comes with the `conversation:open` ack — no directory lookup needed. */
  const counterparty = chat.counterparty;

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

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    /*
      Clear and send, without awaiting.

      `sendText` puts the message in the thread immediately as a pending bubble
      and reconciles it against the server's copy when the ack lands. A refused
      send leaves that bubble marked failed with a retry beside it, so the text
      is still recoverable — which is why the draft is not restored here as it
      used to be. Restoring it as well would put the same message in two places.
    */
    setDraft('');
    chat.sendText(body);
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
        // Only the upload is awaited. The send itself is optimistic — the file
        // appears in the thread at once and marks itself failed if refused.
        chat.sendFile({
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

            {messages.map((m) =>
              /*
                A deal-lifecycle notice, written by the server rather than by
                either party — centred, as the web's ChatPanel renders it. This
                branch did not exist before, so these came out as ordinary
                bubbles aligned to whichever side the server happened to have
                recorded as the sender, reading as if a person had said them.
              */
              m.system ? (
                <View key={m.id} style={styles.systemRow}>
                  <Pressable
                    disabled={!m.escrowId}
                    onPress={() => m.escrowId && router.push(`/escrow/${m.escrowId}`)}
                    accessibilityRole={m.escrowId ? 'button' : 'text'}
                    style={({ pressed }) => [
                      styles.systemChip,
                      {
                        backgroundColor:
                          m.escrowId && pressed ? theme.backgroundSelected : theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.systemText, { color: theme.textSecondary }]}>{m.body}</Text>
                    {m.escrowId ? (
                      <View style={styles.systemLink}>
                        <Text style={[styles.systemLinkText, { color: theme.primary }]}>
                          View deal
                        </Text>
                        <ArrowRight size={11} color={theme.primary} />
                      </View>
                    ) : null}
                  </Pressable>
                  <Text style={[styles.systemTime, { color: theme.textTertiary }]}>{m.at}</Text>
                </View>
              ) : (
              <View key={m.id} style={[styles.bubbleRow, m.mine ? styles.mineRow : styles.theirRow]}>
                <View
                  style={[
                    styles.bubble,
                    m.mine
                      ? [
                          styles.mineBubble,
                          {
                            backgroundColor: theme.primary,
                            // A message still in flight sits back a little, so
                            // "sent" and "sending" are distinguishable at a
                            // glance without reading the tick.
                            opacity: m.pending ? 0.65 : 1,
                          },
                        ]
                      : [
                          styles.theirBubble,
                          { backgroundColor: theme.card, borderColor: theme.cardBorder },
                        ],
                    m.failed ? { backgroundColor: '#b91c1c' } : null,
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
                      m.failed ? (
                        <TriangleAlert size={13} color="#ffffff" accessibilityLabel="Not sent" />
                      ) : m.pending ? (
                        <Clock
                          size={13}
                          color="rgba(255,255,255,0.75)"
                          accessibilityLabel="Sending"
                        />
                      ) : m.readAt ? (
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

                  {/* A refused send stays put with the two ways out, rather
                      than disappearing and taking the text with it. */}
                  {m.failed ? (
                    <View style={styles.failedActions}>
                      <Pressable
                        onPress={() => chat.retry(m.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Retry sending"
                        style={styles.failedBtn}
                      >
                        <RotateCcw size={12} color="#ffffff" />
                        <Text style={styles.failedBtnText}>Retry</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => chat.discard(m.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Discard message"
                        style={styles.failedBtn}
                      >
                        <X size={12} color="#ffffff" />
                        <Text style={styles.failedBtnText}>Discard</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
              ),
            )}

            {/* Live typing indicator — new; the REST thread had no way to know. */}
            {chat.counterpartyTyping ? (
              <View style={[styles.bubbleRow, styles.theirRow]}>
                <View
                  style={[
                    styles.bubble,
                    styles.theirBubble,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}
                >
                  <Text style={[styles.typingText, { color: theme.textTertiary }]}>
                    @{username} is typing…
                  </Text>
                </View>
              </View>
            ) : null}
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
              onChangeText={(text) => {
                setDraft(text);
                // Throttled inside the hook, with a trailing "stopped typing".
                chat.notifyTyping();
              }}
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

  // System notices: centred, full-width row so the chip can sit in the middle
  // regardless of which account the server recorded as the sender.
  systemRow: { alignItems: 'center', gap: 3, paddingVertical: Spacing.one },
  systemChip: {
    maxWidth: '85%',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    gap: 3,
  },
  systemText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.sans[500],
    textAlign: 'center',
  },
  systemLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  systemLinkText: { fontSize: 10.5, fontFamily: Fonts.sans[700] },
  systemTime: { fontSize: 9.5, fontFamily: Fonts.sans[400] },

  failedActions: { flexDirection: 'row', gap: Spacing.two, marginTop: 4 },
  failedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  failedBtnText: { fontSize: 10.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  typingText: { fontSize: 11.5, fontFamily: Fonts.sans[500], fontStyle: 'italic' },

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
