import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  FilePlus2,
  Inbox,
  PackageCheck,
  Truck,
  Wallet,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useAuth } from '@/context/AuthContext';
import { mockDeals, type EscrowEvent } from '@/constants/mockData';
import { TONE_COLORS, type BadgeTone } from '@/features/escrow/ui/dealStatus';

/**
 * Activity tab — one reverse-chronological feed of everything that has happened
 * on the signed-in user's deals.
 *
 * The web has no single activity page; it shows the same information as the
 * per-deal "Audit Timeline" in `web/src/pages/EscrowDetail.tsx` (the dotted
 * left rail of `deal.events`). A phone has no sidebar to park that in, so this
 * flattens every deal's events into one stream — the same rows, the same
 * wording, just aggregated and newest first.
 *
 * Events carry no listing photo, so each row is led by an icon chosen from the
 * event type and tinted with the shared badge tones, keeping it consistent with
 * the status pills on My Deals.
 *
 * Reads `mockDeals` — no API yet. There is no `/api/notifications` on the
 * server either; when this is wired it will come from the deals' `events[]`,
 * which the escrow detail response already returns.
 */

/** Icon + tone per event type, mirroring the deal status vocabulary. */
function eventLook(type: string): { Icon: typeof Bell; tone: BadgeTone } {
  switch (type) {
    case 'created':
      return { Icon: FilePlus2, tone: 'neutral' };
    case 'funded':
      return { Icon: Wallet, tone: 'info' };
    case 'shipped':
      return { Icon: Truck, tone: 'info' };
    case 'delivered':
      return { Icon: PackageCheck, tone: 'warning' };
    case 'released':
      return { Icon: CheckCircle2, tone: 'success' };
    case 'disputed':
      return { Icon: AlertTriangle, tone: 'danger' };
    default:
      return { Icon: Bell, tone: 'neutral' };
  }
}

/** "Funded" from "funded" — the web capitalises audit events the same way. */
function eventLabel(type: string) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * "2h ago" / "3d ago", falling back to a date past a week — the phone
 * equivalent of the web's absolute `formatDateTime` in a much narrower column.
 */
function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);

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

/** One event, plus the deal it belongs to, so a row can name and open it. */
interface FeedItem extends EscrowEvent {
  dealId: string;
  dealTitle: string;
  dealCode: string;
}

const FILTERS: { id: string; label: string; types?: string[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'money', label: 'Payments', types: ['funded', 'released'] },
  { id: 'delivery', label: 'Delivery', types: ['shipped', 'delivered'] },
  { id: 'issues', label: 'Issues', types: ['disputed'] },
];

export function ActivityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  // Only the signed-in user's deals — either side of the deal counts.
  const feed = useMemo<FeedItem[]>(() => {
    const mine = mockDeals.filter(
      (d) => d.creator.username === user?.username || d.counterparty.username === user?.username,
    );

    const flat = mine.flatMap((d) =>
      d.events.map((e) => ({
        ...e,
        dealId: d.id,
        dealTitle: d.title,
        dealCode: d.code,
      })),
    );

    const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
    const scoped = active.types ? flat.filter((e) => active.types!.includes(e.type)) : flat;

    // Newest first.
    return scoped.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filter, user?.username]);

  const renderItem = ({ item }: { item: FeedItem }) => {
    const { Icon, tone } = eventLook(item.type);
    const colors = TONE_COLORS[tone];

    return (
      <Pressable
        onPress={() => router.push(`/escrow/${item.dealId}`)}
        accessibilityRole="button"
        accessibilityLabel={`${eventLabel(item.type)} on ${item.dealTitle}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: theme.card,
            borderColor: pressed ? theme.primary : theme.cardBorder,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
          <Icon size={16} color={colors.text} />
        </View>

        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text style={[styles.eventType, { color: theme.text }]} numberOfLines={1}>
              {eventLabel(item.type)}
            </Text>
            <Text style={[styles.time, { color: theme.textTertiary }]}>
              {timeAgo(item.createdAt)}
            </Text>
          </View>

          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.dealLine}>
            <Text style={[styles.dealTitle, { color: theme.textTertiary }]} numberOfLines={1}>
              {item.dealTitle}
              <Text style={{ color: theme.textTertiary }}> · {item.dealCode}</Text>
            </Text>
            <ChevronRight size={13} color={theme.textTertiary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={feed}
        renderItem={renderItem}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.four }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <Bell size={13} color={theme.primary} />
              <Text style={[styles.eyebrow, { color: theme.primary }]}>Activity</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Recent Activity</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Every funding, delivery and release across your escrow deals, newest first.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterStrip}
            >
              {FILTERS.map((f) => {
                const on = filter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setFilter(f.id)}
                    style={[
                      styles.filter,
                      {
                        backgroundColor: on ? theme.text : theme.backgroundElement,
                        borderColor: on ? theme.text : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: on ? theme.background : theme.textSecondary },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.countRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                <Text style={{ color: theme.text }}>{feed.length}</Text>
                {feed.length === 1 ? ' update' : ' updates'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Inbox size={26} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing here yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Updates on your deals — funding, shipping and release — will show up here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.three, marginBottom: Spacing.four },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Screen heading — the web's `font-display` (Space Grotesk).
  title: {
    fontSize: 21,
    fontFamily: Fonts.display[700],
    letterSpacing: -0.4,
    marginTop: -Spacing.two,
  },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },

  filterStrip: { gap: Spacing.two, paddingVertical: 2 },
  filter: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  countRow: { borderTopWidth: 1, paddingTop: Spacing.three },
  countText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  iconWrap: {
    height: 36,
    width: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventType: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[700] },
  time: { fontSize: 10.5, fontFamily: Fonts.sans[600] },
  description: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  dealLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  dealTitle: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sans[600] },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },
});
