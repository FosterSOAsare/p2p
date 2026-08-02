import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Inbox, Plus, ShieldCheck, Wallet } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useAuth } from '@/context/AuthContext';
import { mockDeals, type EscrowDeal } from '@/constants/mockData';
import { statusBadge, TONE_COLORS, type DealStatus } from './dealStatus';

/**
 * My Deals tab — the phone version of the web's deals list
 * (`web/src/pages/Deals.tsx` → `features/escrow/ui/DealsListView.tsx` +
 * `DealCard.tsx`).
 *
 * Same tabs, same card anatomy: status badge, rail · currency pill, title,
 * counterparty line with date, escrow amount and a View affordance.
 *
 * Reads `mockDeals` — no API yet. The web keeps the active tab in the URL; a
 * phone has no address bar, so it's component state here.
 */

const TABS: { id: string; label: string; status?: DealStatus[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active', status: ['funded', 'shipped'] },
  { id: 'confirm', label: 'To Confirm', status: ['delivered'] },
  { id: 'completed', label: 'Completed', status: ['released'] },
  { id: 'disputed', label: 'Disputed', status: ['disputed'] },
];

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "10 Mar 2025" — matches the web's formatDate output. */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DealsScreen() {
  const theme = useTheme();
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState('all');

  const deals = useMemo(() => {
    const active = TABS.find((t) => t.id === tab) ?? TABS[0];
    if (!active.status) return mockDeals;
    return mockDeals.filter((d) => active.status!.includes(d.status));
  }, [tab]);

  const renderDeal = ({ item }: { item: EscrowDeal }) => {
    const badge = statusBadge(item.status);
    const tone = TONE_COLORS[badge.tone];
    // Role-aware, like the web's DealCard: show the *other* party and label the
    // relationship. Mock deals are buyer-created, so the creator is the buyer.
    const isBuyer = item.creator.username === user?.username;
    const other = isBuyer ? item.counterparty : item.creator;
    const roleLabel = isBuyer ? 'Buying from' : 'Selling to';

    return (
      <Pressable
        onPress={() => router.push(`/escrow/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open deal ${item.code}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: pressed ? theme.primary : theme.cardBorder,
          },
        ]}
      >
        <View style={styles.cardTop}>
          {/* Deals have no listing photo in the mock, so the web's wallet
              fallback icon is used for every row. */}
          <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
            <Wallet size={20} color={theme.textTertiary} />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>{badge.label}</Text>
              </View>
              <View style={[styles.railPill, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.railText, { color: theme.textSecondary }]}>
                  {item.rail.toUpperCase()} · {item.currency}
                </Text>
              </View>
            </View>

            <Text numberOfLines={1} style={[styles.dealTitle, { color: theme.text }]}>
              {item.title}
            </Text>

            <Text numberOfLines={2} style={[styles.meta, { color: theme.textSecondary }]}>
              {roleLabel} <Text style={{ color: theme.text }}>@{other.username}</Text>
              <Text style={{ color: theme.textTertiary }}> · {formatDate(item.createdAt)}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View>
            <Text style={[styles.amountLabel, { color: theme.textTertiary }]}>Escrow Amount</Text>
            <Text style={[styles.amount, { color: theme.text }]}>
              {formatMoney(item.amount, item.currency)}
            </Text>
          </View>
          <View style={styles.viewRow}>
            <Text style={[styles.viewText, { color: theme.primary }]}>View</Text>
            <ArrowRight size={14} color={theme.primary} />
          </View>
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
              <Text style={[styles.eyebrow, { color: theme.primary }]}>Escrow Protected</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>My Deals</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Track funding, delivery and release on every escrow deal.
            </Text>

            {/* The web's hero CTA — opens the standalone off-platform contract
                form (web: /escrow/new). */}
            <Pressable
              onPress={() => router.push('/escrow/new')}
              style={({ pressed }) => [
                styles.newDeal,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.newDealText}>Start New Escrow Deal</Text>
            </Pressable>

            {/* Tabs + total, as on the web */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabStrip}
            >
              {TABS.map((t) => {
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
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                <Text style={{ color: theme.text }}>{deals.length}</Text>
                {deals.length === 1 ? ' deal' : ' deals'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Inbox size={26} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No deals in this tab yet.
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
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4, marginTop: -Spacing.two },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },
  newDeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Radius.md,
  },
  newDealText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

  tabStrip: { gap: Spacing.two, paddingVertical: 2 },
  tab: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  countRow: { borderTopWidth: 1, paddingTop: Spacing.three },
  countText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.three,
  },
  cardTop: { flexDirection: 'row', gap: Spacing.three },
  thumb: {
    height: 52,
    width: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontFamily: Fonts.sans[700] },
  railPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  railText: { fontSize: 9.5, fontFamily: Fonts.sans[700] },
  dealTitle: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  meta: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },

  cardFooter: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  amountLabel: { fontSize: 9.5, fontFamily: Fonts.sans[600] },
  amount: { fontSize: 16, fontFamily: Fonts.sans[700] },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewText: { fontSize: 12, fontFamily: Fonts.sans[700] },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: { fontSize: 12, fontFamily: Fonts.sans[600] },
});
