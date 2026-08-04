import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, ClipboardCheck } from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAdminKycList, type AdminKyc } from '../data/adminApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminScreen,
  FilterChips,
  StatusPill,
  shortDate,
} from './AdminScaffold';

/** Phone version of `web/src/pages/AdminKycList.tsx`. */

type Tab = 'pending' | 'verified' | 'rejected';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
];

const PILL: Record<Tab, { bg: string; fg: string }> = {
  pending: { bg: '#fef9c3', fg: '#854d0e' },
  verified: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

export function AdminKycListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const query = useAdminKycList(tab);

  const submissions = query.data?.submissions ?? [];

  return (
    <AdminScreen
      title="KYC Reviews"
      subtitle="Approve a seller's identity before they can list on the marketplace."
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
    >
      <FilterChips
        options={TABS.map((t) => ({
          ...t,
          count: t.id === tab ? submissions.length : undefined,
        }))}
        value={tab}
        onChange={setTab}
      />

      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError ? (
        <AdminError message={apiErrorMessage(query.error)} />
      ) : submissions.length === 0 ? (
        <AdminEmpty
          icon={ClipboardCheck}
          title={`No ${tab} submissions`}
          hint={tab === 'pending' ? 'Every seller application has been reviewed.' : undefined}
        />
      ) : (
        <View style={styles.list}>
          {submissions.map((kyc: AdminKyc) => (
            <Pressable
              key={kyc.id}
              onPress={() => router.push({ pathname: '/admin/kyc/[id]', params: { id: kyc.id } })}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{kyc.storeName.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={[styles.store, { color: theme.text }]} numberOfLines={1}>
                    {kyc.storeName}
                  </Text>
                  <StatusPill label={kyc.status} bg={PILL[kyc.status].bg} fg={PILL[kyc.status].fg} />
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                  {kyc.legalName} · @{kyc.user.username}
                </Text>
                <Text style={[styles.date, { color: theme.textTertiary }]}>
                  Submitted {shortDate(kyc.submittedAt)}
                </Text>
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
  avatar: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 15, fontFamily: Fonts.display[700] },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  store: { flexShrink: 1, fontSize: 14, fontFamily: Fonts.sans[700] },
  meta: { fontSize: 12, fontFamily: Fonts.sans[400] },
  date: { fontSize: 11, fontFamily: Fonts.sans[400] },
});
