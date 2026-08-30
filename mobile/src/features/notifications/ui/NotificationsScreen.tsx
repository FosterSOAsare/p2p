import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Handshake,
  Package,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
  type NotificationCategory,
} from '../data/notificationsApi';

/**
 * Notifications — the phone version of
 * `web/src/features/notifications/ui/NotificationPanel.tsx`.
 *
 * The web shows this as a slide-over `SidePanel` beside the page; a phone has
 * no room for that, so it becomes a full screen pushed from the header bell.
 * Everything else is the web's: the same six categories driving only the icon
 * and accent, the same row anatomy (icon · title · body · relative time), the
 * unread dot and tint, "Mark all read", and the "You're all caught up" empty
 * state.
 *
 * Reads `GET /api/notifications` and writes through `/:id/read` and
 * `/read-all`, the same endpoints the web's panel uses.
 */

/** Category drives only the icon and accent — the copy carries the specifics. */
const CATEGORY_STYLE: Record<
  NotificationCategory,
  { Icon: typeof Bell; bg: string; fg: string }
> = {
  deal: { Icon: Handshake, bg: '#dcfce7', fg: '#16a34a' },
  listing: { Icon: Package, bg: '#fef3c7', fg: '#b45309' },
  dispute: { Icon: Scale, bg: '#ffe4e6', fg: '#e11d48' },
  kyc: { Icon: ShieldCheck, bg: '#d1fae5', fg: '#047857' },
  wallet: { Icon: Wallet, bg: '#e0f2fe', fg: '#0369a1' },
  // Purple, as on the web's panel.
  promotion: { Icon: Sparkles, bg: '#f3e8ff', fg: '#9333ea' },
  system: { Icon: Bell, bg: '#e5e7eb', fg: '#4b5563' },
};

/**
 * Never let an unrecognised category take the screen down.
 *
 * This map used to be indexed and destructured straight away, so a category the
 * client didn't know about — `promotion`, which the server had been sending all
 * along — read as `undefined` and threw on destructuring, blanking the whole
 * list rather than one row. Falling back to `system` keeps the screen up if the
 * server ever adds another.
 */
function categoryStyle(category: NotificationCategory) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.system;
}

/**
 * The server writes `link` for the web's routes, and the two apps agree on all
 * of them but one: the web's `/dashboard` is a page, while on a phone it's the
 * Home **tab**. Pushing `/dashboard` would stack a second dashboard on top of
 * the tabs — right content, no tab bar, and a back button where the app's home
 * should be. Every other link (`/wallet`, `/settings`, `/vendor/kyc`,
 * `/listings/:id`, `/marketplace`, `/marketplace/:id`) maps one to one.
 */
function toMobileRoute(link: string): string {
  if (link === '/dashboard') return '/home';
  return link;
}

/** "2h ago" / "3d ago", falling back to a date past a week. */
function formatRelative(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(mins)) return '';
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  /**
   * The server already returns these newest-first, but sorting here costs
   * nothing and keeps the screen correct if that ever changes.
   */
  const notifications = useMemo(
    () =>
      [...(notificationsQuery.data?.notifications ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [notificationsQuery.data],
  );

  // From the response, not recounted here — it's the total across every page,
  // where this screen only holds the first.
  const unread = notificationsQuery.data?.unread ?? 0;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  /**
   * Mark read, then follow the link — the web's `onOpenRow`.
   *
   * Navigation doesn't wait on the mutation: the read flag is bookkeeping, and
   * making someone watch a spinner before a screen they already tapped would be
   * the wrong trade. If it fails the row simply stays unread.
   */
  const openRow = (n: AppNotification) => {
    if (n.readAt === null) markRead.mutate(n.id);
    if (n.link) router.push(toMobileRoute(n.link) as never);
  };

  const markAllRead = () => markAll.mutate();

  const renderRow = ({ item }: { item: AppNotification }) => {
    const { Icon, bg, fg } = categoryStyle(item.category);
    const isUnread = item.readAt === null;

    return (
      <Pressable
        onPress={() => openRow(item)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: theme.border,
            backgroundColor: pressed
              ? theme.backgroundSelected
              : isUnread
                ? theme.primaryLight
                : 'transparent',
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Icon size={16} color={fg} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                {
                  color: isUnread ? theme.text : theme.textSecondary,
                  fontFamily: isUnread ? Fonts.sans[700] : Fonts.sans[600],
                },
              ]}
            >
              {item.title}
            </Text>
            {isUnread ? (
              <View
                accessibilityLabel="Unread"
                style={[styles.unreadDot, { backgroundColor: theme.primary }]}
              />
            ) : null}
          </View>

          <Text numberOfLines={2} style={[styles.bodyText, { color: theme.textSecondary }]}>
            {item.body}
          </Text>

          <Text style={[styles.time, { color: theme.textTertiary }]}>
            {formatRelative(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Panel header — the web's SidePanel title bar, with its action. */}
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

        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>

        {unread > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8} style={styles.markAll}>
            <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.markAll} />
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderRow}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        /**
         * Three states, not one. An empty list mid-fetch is not the same claim
         * as "you're all caught up", and a failed fetch certainly isn't — both
         * used to render as that reassuring empty state, which would tell you
         * nothing had happened when in fact nothing had loaded.
         */
        ListEmptyComponent={
          notificationsQuery.isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : notificationsQuery.isError ? (
            <View style={styles.empty}>
              <BellOff size={26} color="#e11d48" />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Couldn&apos;t load notifications
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {apiErrorMessage(notificationsQuery.error)}
              </Text>
              <Pressable
                onPress={() => notificationsQuery.refetch()}
                style={({ pressed }) => [
                  styles.retryBtn,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <BellOff size={26} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                You&apos;re all caught up
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Updates about your deals, listings and disputes will show up here.
              </Text>
            </View>
          )
        }
        // Pull to refresh, since this is the screen you check when you're
        // waiting on something to happen.
        refreshing={notificationsQuery.isFetching && !notificationsQuery.isLoading}
        onRefresh={() => notificationsQuery.refetch()}
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
  // Panel title uses the web's `font-display`.
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  markAll: { minWidth: 80, alignItems: 'flex-end' },
  markAllText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconWrap: {
    height: 36,
    width: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 12.5 },
  unreadDot: { height: 8, width: 8, borderRadius: Radius.full },
  bodyText: { fontSize: 11.5, lineHeight: 16.5, fontFamily: Fonts.sans[400] },
  time: {
    fontSize: 9.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  empty: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.six, paddingTop: 72 },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.display[700], textAlign: 'center' },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  retryText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },
});
