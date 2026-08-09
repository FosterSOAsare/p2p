import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, ShieldCheck } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useConversations, type ConversationSummary } from '../data/messagesApi';

/**
 * Messages inbox — the phone version of the conversation list in
 * `web/src/pages/Messages.tsx`.
 *
 * The web splits the screen: conversations on the left, the open thread on the
 * right, collapsing to one pane on narrow viewports. A phone is always that
 * narrow case, so this is just the list, and picking a row pushes the existing
 * `MessageThreadScreen` at `/messages/:username` — the same single entry point
 * the web's `?u=` param provides.
 *
 * Row anatomy and copy are the web's: avatar or initial tile, store name or
 * handle with the verified tick, the last-message preview (prefixed "You: ",
 * attachments shown as a kind), the short timestamp and the unread badge.
 *
 * Reads `GET /api/messages`, which is also where every unread count in the app
 * comes from — the header badge sums the per-conversation counts this returns.
 */

/** File messages carry an optional caption, so preview the kind instead of "". */
function previewOf(last: ConversationSummary['lastMessage']): string {
  if (!last) return 'No messages yet';
  if (last.type === 'system') return last.body.split('\n')[0];
  if (last.type === 'file') return `${last.mine ? 'You: ' : ''}📎 Attachment`;
  return `${last.mine ? 'You: ' : ''}${last.body}`;
}

/** Clock time for today, a short date before that — as on the web. */
function shortWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessagesListScreen() {
  const theme = useTheme();
  const router = useRouter();

  const conversationsQuery = useConversations();

  // The server already orders by recency; sorting again keeps the list stable
  // if that ever changes.
  const conversations = [...(conversationsQuery.data ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const renderRow = ({ item }: { item: ConversationSummary }) => {
    const other = item.counterparty;
    const unread = item.unreadCount > 0;

    return (
      <Pressable
        onPress={() => router.push(`/messages/${other.username}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${other.username}`}
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: theme.border,
            backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
          },
        ]}
      >
        {other.avatarUrl ? (
          <Image source={other.avatarUrl} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarLetter}>{other.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
              {other.storeName ?? `@${other.username}`}
            </Text>
            {other.verified ? <ShieldCheck size={12} color={theme.primary} /> : null}
          </View>

          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              {
                color: unread ? theme.text : theme.textTertiary,
                fontFamily: unread ? Fonts.sans[600] : Fonts.sans[400],
              },
            ]}
          >
            {previewOf(item.lastMessage)}
          </Text>
        </View>

        <View style={styles.meta}>
          <Text style={[styles.when, { color: theme.textTertiary }]}>
            {item.lastMessage ? shortWhen(item.lastMessage.createdAt) : ''}
          </Text>
          {unread ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={theme.text} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>

        {conversations.length > 0 ? (
          <Text style={[styles.count, { color: theme.textTertiary }]}>{conversations.length}</Text>
        ) : (
          <View style={styles.count} />
        )}
      </View>

      <FlatList
        data={conversations}
        renderItem={renderRow}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            {/* "No conversations" is a claim about the account, so it waits
                until the server has actually answered. */}
            {conversationsQuery.isLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : conversationsQuery.isError ? (
              <>
                <MessageSquare size={22} color="#e11d48" />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                  {apiErrorMessage(conversationsQuery.error)}
                </Text>
              </>
            ) : (
              <>
                <MessageSquare size={22} color={theme.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                  No conversations yet
                </Text>
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                  Message a buyer from a deal, or wait for one to reach out — updates land here.
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  backBtn: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  count: { minWidth: 24, textAlign: 'right', fontSize: 11.5, fontFamily: Fonts.sans[600] },

  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: { height: 44, width: 44, borderRadius: Radius.md },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 15, fontFamily: Fonts.sans[700], color: '#ffffff' },

  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  preview: { fontSize: 11.5 },

  meta: { alignItems: 'flex-end', gap: 5 },
  when: { fontSize: 10, fontFamily: Fonts.sans[500] },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontFamily: Fonts.sans[700], color: '#ffffff' },

  empty: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.six, paddingTop: 72 },
  emptyTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  emptyText: {
    fontSize: 11.5,
    lineHeight: 16.5,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },
});
