import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock, Paperclip, SendHorizonal, ShieldCheck } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useKeyboard } from '@/hooks/use-keyboard';
import { mockMessages, mockProducts } from '@/constants/mockData';

/**
 * Deal / vendor chat — the phone version of `web/src/pages/MessageThread.tsx`.
 *
 * Same anatomy: a tappable counterparty header, the immutable-log notice, the
 * bubble thread, and a composer with an attachment button. The deal page links
 * here with `?redirect=/escrow/:id`, and Back honours it, exactly as the web's
 * back link does.
 *
 * Like the web's version this is **local state** — the server has
 * /api/messages, but neither client is wired to it yet, so a sent message
 * lives only until you leave the screen.
 */

interface LocalMessage {
  id: string;
  body: string;
  mine: boolean;
  at: string;
  /** Set when the message is a photo attachment rather than plain text. */
  imageUri?: string;
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

  // Seed from the mock thread between these two, newest last.
  const [messages, setMessages] = useState<LocalMessage[]>(() =>
    mockMessages
      .filter(
        (m) =>
          (m.from === username && m.to === user?.username) ||
          (m.to === username && m.from === user?.username),
      )
      .map((m) => ({
        id: m.id,
        body: m.content,
        mine: m.from === user?.username,
        at: clockTime(m.createdAt),
      })),
  );

  // Counterparty details come from whichever listing they vend — the mobile
  // mock has no standalone user directory.
  const counterparty = useMemo(
    () => mockProducts.find((p) => p.vendor.username === username)?.vendor,
    [username],
  );

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
    setMessages((prev) => [
      ...prev,
      { id: `local-${prev.length + 1}`, body, mine: true, at: clockTime() },
    ]);
    setDraft('');
  };

  /**
   * Attach a photo — the web's paperclip uploads to Cloudinary and posts the
   * URL as the message body. Here the picked file is shown inline from the
   * device.
   *
   * TODO(api): upload the asset and send its URL instead of the local uri.
   */
  const attach = async () => {
    setAttachError(null);
    try {
      // Launch first: Android 13+ uses the system photo picker, which needs no
      // permission at all. Only ask if the picker actually reports it's needed.
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAttachError('Photo access is off. Enable it for Expo Go in system settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;

      setMessages((prev) => [
        ...prev,
        {
          id: `local-${prev.length + 1}`,
          body: '📎 Attachment',
          mine: true,
          at: clockTime(),
          imageUri: result.assets[0].uri,
        },
      ]);
    } catch {
      setAttachError("Couldn't open the gallery on this device.");
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
                  <Text
                    style={[styles.bubbleText, { color: m.mine ? '#ffffff' : theme.text }]}
                  >
                    {m.body}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      { color: m.mine ? 'rgba(255,255,255,0.75)' : theme.textTertiary },
                    ]}
                  >
                    {m.at}
                  </Text>
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
              accessibilityRole="button"
              accessibilityLabel="Attach a photo"
              style={({ pressed }) => [
                styles.attach,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.inputBackground,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <Paperclip size={16} color={theme.text} />
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
  bubbleText: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans[400] },
  bubbleTime: { fontSize: 9.5, fontFamily: Fonts.sans[500], marginTop: 2 },

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
