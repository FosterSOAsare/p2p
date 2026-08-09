import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ban, CheckCircle2, Search, Users } from '@/components/icons';

import { useLocalSearchParams } from 'expo-router';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAdminUsers, useSetUserStatus, type AdminUserRow } from '../data/adminUsersApi';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminScreen,
  FilterChips,
  StatusPill,
  shortDate,
} from './AdminScaffold';

/** Phone version of `web/src/pages/AdminUsersList.tsx`. */

type Tab = 'all' | 'active' | 'suspended';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All users' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
];

const KYC_PILL: Record<AdminUserRow['kycStatus'], { bg: string; fg: string }> = {
  verified: { bg: '#dcfce7', fg: '#166534' },
  pending: { bg: '#fef9c3', fg: '#854d0e' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
  unverified: { bg: '#f3f4f6', fg: '#374151' },
};

export function AdminUsersScreen() {
  const theme = useTheme();
  const { user: me } = useAuth();
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

  const usersQuery = useAdminUsers(query);
  const setStatus = useSetUserStatus();

  const users = usersQuery.data?.users ?? [];

  return (
    <AdminScreen
      title="Users"
      subtitle="Search accounts, then suspend or reinstate. Suspended users can't sign in."
      onRefresh={() => usersQuery.refetch()}
      refreshing={usersQuery.isRefetching}
    >
      <FilterChips options={TABS} value={tab} onChange={setTab} />

      <View
        style={[styles.searchWrap, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
      >
        <Search size={15} color={theme.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search username, email or name"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {setStatus.isError ? <AdminError message={apiErrorMessage(setStatus.error)} /> : null}

      {usersQuery.isLoading ? (
        <AdminLoading />
      ) : usersQuery.isError ? (
        <AdminError message={apiErrorMessage(usersQuery.error)} />
      ) : users.length === 0 ? (
        <AdminEmpty icon={Users} title="No users found" hint="Nothing matches this filter." />
      ) : (
        <View style={styles.list}>
          {users.map((u) => {
            const suspended = u.status === 'suspended';
            const isSelf = me?.id === u.id;
            return (
              <View
                key={u.id}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: suspended ? '#9ca3af' : theme.primary }]}>
                    <Text style={styles.avatarText}>{u.username.charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.username, { color: theme.text }]} numberOfLines={1}>
                        @{u.username}
                      </Text>
                      {u.role === 'admin' ? (
                        <StatusPill label="admin" bg={theme.primaryLight} fg={theme.primary} />
                      ) : null}
                      <StatusPill
                        label={u.status}
                        bg={suspended ? '#fee2e2' : '#dcfce7'}
                        fg={suspended ? '#991b1b' : '#166534'}
                      />
                    </View>
                    <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {u.fullName} · {u.email}
                    </Text>
                    <View style={styles.metaRow}>
                      <StatusPill
                        label={`KYC ${u.kycStatus}`}
                        bg={KYC_PILL[u.kycStatus].bg}
                        fg={KYC_PILL[u.kycStatus].fg}
                      />
                      <Text style={[styles.date, { color: theme.textTertiary }]}>
                        Joined {shortDate(u.joinedAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <Stat label="Buying" value={u.dealsAsBuyer} />
                  <Stat label="Selling" value={u.dealsAsSeller} />
                  <Stat label="Listings" value={u.listingsCount} />
                </View>

                {/* An admin suspending themselves would lock the console. */}
                {!isSelf ? (
                  <AdminButton
                    label={suspended ? 'Reinstate' : 'Suspend'}
                    tone={suspended ? 'success' : 'danger'}
                    icon={suspended ? CheckCircle2 : Ban}
                    loading={setStatus.isPending && setStatus.variables?.id === u.id}
                    onPress={() =>
                      setStatus.mutate({ id: u.id, status: suspended ? 'active' : 'suspended' })
                    }
                  />
                ) : (
                  <Text style={[styles.selfNote, { color: theme.textTertiary }]}>
                    This is your account.
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </AdminScreen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
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
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontFamily: Fonts.display[700] },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  username: { flexShrink: 1, fontSize: 14, fontFamily: Fonts.sans[700] },
  meta: { fontSize: 12, fontFamily: Fonts.sans[400] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  date: { fontSize: 11, fontFamily: Fonts.sans[400] },

  statsRow: { flexDirection: 'row', gap: Spacing.four },
  stat: { gap: 1 },
  statValue: { fontSize: 15, fontFamily: Fonts.display[700] },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[600],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  selfNote: { fontSize: 11.5, fontFamily: Fonts.sans[500], textAlign: 'center' },
});
