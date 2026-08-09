import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Handshake, Search, TriangleAlert } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAdminDeals, type AdminDealStatus } from '../data/adminDealsApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminScreen,
  FilterChips,
  StatusPill,
  money,
  shortDate,
} from './AdminScaffold';

/**
 * Read-only oversight of every escrow on the platform — the phone version of
 * the admin view of `web/src/pages/Deals.tsx`.
 *
 * Deliberately read-only: money only moves through the escrow state machine or
 * a dispute ruling, so a deal with an open dispute links to that ruling screen
 * instead of offering a shortcut here.
 */

type Tab = 'all' | AdminDealStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'created', label: 'Created' },
  { id: 'funded', label: 'Funded' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'disbursed', label: 'Released' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PILL: Record<AdminDealStatus, { bg: string; fg: string }> = {
  created: { bg: '#f3f4f6', fg: '#374151' },
  funded: { bg: '#e0e7ff', fg: '#3730a3' },
  delivered: { bg: '#dbeafe', fg: '#1e40af' },
  disbursed: { bg: '#dcfce7', fg: '#166534' },
  disputed: { bg: '#fee2e2', fg: '#991b1b' },
  cancelled: { bg: '#fce7f3', fg: '#9d174d' },
};

export function AdminDealsScreen() {
  const theme = useTheme();
  const router = useRouter();
  // Seeded from `?status=` so a dashboard tile can deep-link straight into a
  // filtered list; unrecognised values fall back to showing everything.
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === status) ? (status as Tab) : 'all',
  );
  const [search, setSearch] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (tab !== 'all') params.set('status', tab);
    params.set('limit', '50');
    return params.toString();
  }, [search, tab]);

  const dealsQuery = useAdminDeals(query);
  const deals = dealsQuery.data?.deals ?? [];

  return (
    <AdminScreen
      title="Deals"
      subtitle="Every escrow on the platform. Open a disputed deal to rule on it."
      onRefresh={() => dealsQuery.refetch()}
      refreshing={dealsQuery.isRefetching}
    >
      <FilterChips options={TABS} value={tab} onChange={setTab} />

      <View
        style={[styles.searchWrap, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
      >
        <Search size={15} color={theme.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search title, code or party"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {dealsQuery.isLoading ? (
        <AdminLoading />
      ) : dealsQuery.isError ? (
        <AdminError message={apiErrorMessage(dealsQuery.error)} />
      ) : deals.length === 0 ? (
        <AdminEmpty icon={Handshake} title="No deals found" hint="Nothing matches this filter." />
      ) : (
        <View style={styles.list}>
          {deals.map((d) => {
            const row = (
              <>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <StatusPill label={d.status} bg={PILL[d.status].bg} fg={PILL[d.status].fg} />
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                  {d.buyer ? `@${d.buyer.username}` : '—'} → {d.seller ? `@${d.seller.username}` : '—'}
                </Text>
                <View style={styles.footRow}>
                  <Text style={[styles.amount, { color: theme.text }]}>{money(d.amount, d.currency)}</Text>
                  <Text style={[styles.date, { color: theme.textTertiary }]}>
                    {d.code} · {shortDate(d.createdAt)}
                  </Text>
                </View>
                {d.hasOpenDispute ? (
                  <View style={styles.disputeRow}>
                    <TriangleAlert size={13} color="#b91c1c" />
                    <Text style={styles.disputeText}>Open dispute — tap to rule</Text>
                  </View>
                ) : null}
              </>
            );

            // Only disputed deals have somewhere useful to go from here.
            return d.hasOpenDispute && d.disputeId ? (
              <Pressable
                key={d.id}
                onPress={() => router.push({ pathname: '/admin/disputes/[id]', params: { id: d.disputeId! } })}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.card, borderColor: '#fecaca', opacity: pressed ? 0.75 : 1 },
                ]}
              >
                {row}
              </Pressable>
            ) : (
              <View
                key={d.id}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                {row}
              </View>
            );
          })}
        </View>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13, fontFamily: Fonts.sans[400] },

  list: { gap: Spacing.two },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flexShrink: 1, fontSize: 14, fontFamily: Fonts.sans[700] },
  meta: { fontSize: 12, fontFamily: Fonts.sans[400] },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  amount: { fontSize: 13.5, fontFamily: Fonts.display[700] },
  date: { fontSize: 11, fontFamily: Fonts.sans[400] },
  disputeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  disputeText: { fontSize: 11.5, fontFamily: Fonts.sans[700], color: '#b91c1c' },
});
