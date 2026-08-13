import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Scale } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAdminDisputes, type AdminDispute } from '../data/adminDisputesApi';
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

/** Phone version of `web/src/pages/AdminDisputesList.tsx`. */

type Tab = 'open' | 'resolved' | 'all';

const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
];

const REASON_LABELS: Record<string, string> = {
  not_delivered: 'Not delivered',
  not_as_described: 'Not as described',
  wrong_item: 'Wrong item',
  service_not_done: 'Service not done',
  other: 'Other',
};

export function AdminDisputesListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('open');
  const query = useAdminDisputes(tab);

  const disputes = query.data ?? [];

  return (
    <AdminScreen
      // A tab in the console's bottom bar, not a pushed screen.
      tabRoot
      title="Disputes"
      subtitle="Read the evidence, then rule on where the escrowed money goes."
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
    >
      <FilterChips
        options={TABS.map((t) => ({ ...t, count: t.id === tab ? disputes.length : undefined }))}
        value={tab}
        onChange={setTab}
      />

      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError ? (
        <AdminError message={apiErrorMessage(query.error)} />
      ) : disputes.length === 0 ? (
        <AdminEmpty
          icon={Scale}
          title={tab === 'open' ? 'No open disputes' : 'Nothing here'}
          hint={tab === 'open' ? 'Every dispute has been ruled on.' : undefined}
        />
      ) : (
        <View style={styles.list}>
          {disputes.map((d: AdminDispute) => (
            <Pressable
              key={d.id}
              onPress={() => router.push({ pathname: '/admin/disputes/[id]', params: { id: d.id } })}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {d.escrow.title}
                  </Text>
                  <StatusPill
                    label={d.status}
                    bg={d.status === 'open' ? '#fee2e2' : '#dcfce7'}
                    fg={d.status === 'open' ? '#991b1b' : '#166534'}
                  />
                </View>

                <Text style={[styles.reason, { color: theme.textSecondary }]} numberOfLines={1}>
                  {REASON_LABELS[d.reason] ?? d.reason}
                  {d.escrow.buyer && d.escrow.seller
                    ? ` · @${d.escrow.buyer.username} vs @${d.escrow.seller.username}`
                    : ''}
                </Text>

                <View style={styles.footRow}>
                  <Text style={[styles.amount, { color: theme.text }]}>
                    {money(d.escrow.amount, d.escrow.currency)}
                  </Text>
                  <Text style={[styles.date, { color: theme.textTertiary }]}>
                    {d.escrow.code} · {shortDate(d.createdAt)}
                  </Text>
                </View>
              </View>

              <ChevronRight size={17} color={theme.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flexShrink: 1, fontSize: 14, fontFamily: Fonts.sans[700] },
  reason: { fontSize: 12, fontFamily: Fonts.sans[400] },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  amount: { fontSize: 13.5, fontFamily: Fonts.display[700] },
  date: { fontSize: 11, fontFamily: Fonts.sans[400] },
});
