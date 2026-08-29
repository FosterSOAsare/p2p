import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, Inbox, Search, ShieldCheck } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { mockDeals, type EscrowDeal } from '@/constants/mockData';
import { TONE_COLORS, type BadgeTone } from './dealStatus';

/**
 * This screen still reads `mockDeals`, whose statuses are the mock vocabulary
 * (`shipped`, `released`, `refunded`). The shared `statusBadge` now speaks the
 * server's instead, so the labels live here until this screen is wired to the
 * API. Tones are still shared — those didn't change.
 */
type DealStatus = EscrowDeal['status'];

function statusBadge(status: DealStatus): { tone: BadgeTone; label: string } {
  switch (status) {
    case 'created':
      return { tone: 'warning', label: 'Awaiting Funding' };
    case 'funded':
      return { tone: 'info', label: 'Funded — In Progress' };
    case 'shipped':
      return { tone: 'info', label: 'Shipped — In Transit' };
    case 'delivered':
      return { tone: 'info', label: 'Delivered — Confirm Receipt' };
    case 'released':
      return { tone: 'success', label: 'Completed' };
    case 'disputed':
      return { tone: 'danger', label: 'Disputed' };
    case 'refunded':
      return { tone: 'neutral', label: 'Refunded' };
    default:
      return { tone: 'neutral', label: status };
  }
}

/**
 * Platform-wide deals oversight — the phone version of the web's
 * `AdminDealsList`, which `/deals` renders when the account is an admin.
 *
 * Read-only by design, as on the web: an admin sees every deal and both
 * parties, and disputed rows link through to arbitration. No release, refund
 * or dispatch actions here.
 *
 * Reads `mockDeals` — no API yet.
 */

const STATUS_TABS: { id: string; label: string; status?: DealStatus[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'funded', label: 'Funded', status: ['funded'] },
  { id: 'shipped', label: 'In Transit', status: ['shipped', 'delivered'] },
  { id: 'released', label: 'Released', status: ['released'] },
  { id: 'disputed', label: 'Disputed', status: ['disputed'] },
];

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminDealsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();

  const [tab, setTab] = useState('all');

  const deals = useMemo(() => {
    const active = STATUS_TABS.find((t) => t.id === tab) ?? STATUS_TABS[0];
    if (!active.status) return mockDeals;
    return mockDeals.filter((d) => active.status!.includes(d.status));
  }, [tab]);

  const disputedCount = mockDeals.filter((d) => d.status === 'disputed').length;
  const settled = mockDeals
    .filter((d) => d.status === 'released')
    .reduce((sum, d) => sum + d.amount, 0);

  const renderDeal = ({ item }: { item: EscrowDeal }) => {
    const badge = statusBadge(item.status);
    const tone = TONE_COLORS[badge.tone];

    return (
      <Pressable
        onPress={() => router.push(`/escrow/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Inspect deal ${item.code}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.cardBorder },
        ]}
      >
        <View style={[styles.cardTop, { borderBottomColor: theme.border }]}>
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.text }]}>{badge.label}</Text>
          </View>
          <Text style={[styles.code, { color: theme.textTertiary }]} numberOfLines={1}>
            {item.code} · {formatDate(item.createdAt)}
          </Text>
        </View>

        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {item.title}
        </Text>

        {/* Admins see both sides, not "counterparty" */}
        <Text numberOfLines={1} style={[styles.parties, { color: theme.textSecondary }]}>
          <Text style={{ color: theme.text }}>@{item.creator.username}</Text>
          {' → '}
          <Text style={{ color: theme.text }}>@{item.counterparty.username}</Text>
        </Text>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View>
            <Text style={[styles.amountLabel, { color: theme.textTertiary }]}>Escrow Amount</Text>
            <Text style={[styles.amount, { color: theme.text }]}>
              {formatMoney(item.amount, item.currency)}
            </Text>
          </View>

          {item.status === 'disputed' ? (
            <View style={styles.disputeFlag}>
              <AlertTriangle size={13} color="#92400e" />
              <Text style={styles.disputeFlagText}>Needs ruling</Text>
            </View>
          ) : (
            <Text style={[styles.readOnly, { color: theme.textTertiary }]}>Read-only</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={deals}
        renderItem={renderDeal}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.four }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <ShieldCheck size={13} color={theme.primary} />
              <Text style={[styles.eyebrow, { color: theme.primary }]}>Admin Oversight</Text>
            </View>
            <Text style={[styles.screenTitle, { color: theme.text }]}>All Escrow Deals</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Every deal on the platform. Read-only — disputed deals link through to arbitration.
            </Text>

            <View style={styles.statsRow}>
              <View style={[styles.stat, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.statValue, { color: theme.text }]}>{mockDeals.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total Deals</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.statValue, { color: '#e11d48' }]}>{disputedCount}</Text>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Disputed</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {settled.toLocaleString('en-GH', { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Settled</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabStrip}
            >
              {STATUS_TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: on ? theme.text : theme.backgroundElement,
                        borderColor: on ? theme.text : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tabText, { color: on ? theme.background : theme.textSecondary }]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.countRow, { borderTopColor: theme.border }]}>
              <Search size={12} color={theme.textTertiary} />
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                <Text style={{ color: theme.text }}>{deals.length}</Text>
                {deals.length === 1 ? ' deal' : ' deals'} in view
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Inbox size={26} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No deals in this filter.
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
  // Screen heading — the web's `font-display`.
  screenTitle: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4, marginTop: -Spacing.two },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 17, fontFamily: Fonts.display[700] },
  statLabel: {
    fontSize: 9,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  tabStrip: { gap: Spacing.two, paddingRight: Spacing.four },
  tab: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  tabText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  countText: { fontSize: 12, fontFamily: Fonts.sans[400] },

  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 9, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  code: { flexShrink: 1, fontSize: 10.5, fontFamily: Fonts.sans[500] },
  title: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  parties: { fontSize: 11.5, fontFamily: Fonts.sans[400] },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  amountLabel: { fontSize: 9.5, fontFamily: Fonts.sans[600] },
  amount: { fontSize: 16, fontFamily: Fonts.display[700] },
  disputeFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  disputeFlagText: { fontSize: 11, fontFamily: Fonts.sans[700], color: '#92400e' },
  readOnly: { fontSize: 11, fontFamily: Fonts.sans[600] },

  empty: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: { fontSize: 12.5, fontFamily: Fonts.sans[600] },
});
