import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ClipboardCheck,
  Handshake,
  Package,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  mockDeals,
  mockKycSubmissions,
  mockProducts,
  type EscrowDeal,
} from '@/constants/mockData';
import { StatCard } from './StatCard';

/**
 * Admin home — the phone version of `web/src/pages/AdminDashboard.tsx`.
 *
 * The web routes /dashboard → /admin for admins; on a phone the home tab is
 * the console itself. Same six metric tiles and the deals-by-status breakdown.
 *
 * The web reads `useAdminStats()`; mobile has no API, so the figures are
 * derived from the mock collections below. Swap in the endpoint later — the
 * layout doesn't change.
 */

const money = (amount: number) =>
  `GH₵${amount.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;

/** The status columns the web's breakdown card shows. */
const STATUS_ROWS: { id: EscrowDeal['status']; label: string; color: string }[] = [
  { id: 'funded', label: 'Funded', color: '#3730a3' },
  { id: 'shipped', label: 'Shipped', color: '#92400e' },
  { id: 'delivered', label: 'Delivered', color: '#1e40af' },
  { id: 'released', label: 'Released', color: '#166534' },
  { id: 'disputed', label: 'Disputed', color: '#991b1b' },
];

export function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();

  const stats = useMemo(() => {
    const byStatus = STATUS_ROWS.reduce<Record<string, number>>((acc, row) => {
      acc[row.id] = mockDeals.filter((d) => d.status === row.id).length;
      return acc;
    }, {});

    return {
      // Distinct usernames across the mock deals, plus the KYC applicants.
      users: new Set([
        ...mockDeals.flatMap((d) => [d.creator.username, d.counterparty.username]),
        ...mockKycSubmissions.map((k) => k.username),
      ]).size,
      // One collection now, so no second array to add — summing both used to
      // double-count the listings that appeared in each.
      activeListings: mockProducts.filter((p) => p.status === 'active').length,
      // "Settled volume" on the web is completed (released) deals only.
      settledVolume: mockDeals
        .filter((d) => d.status === 'released')
        .reduce((sum, d) => sum + d.amount, 0),
      kycPending: mockKycSubmissions.filter((k) => k.status === 'pending').length,
      openDisputes: mockDeals.filter((d) => d.status === 'disputed').length,
      totalDeals: mockDeals.length,
      byStatus,
    };
  }, []);

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <ShieldCheck size={13} color={theme.primary} />
          <Text style={[styles.badgeText, { color: theme.primary }]}>Admin Console</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Platform Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Live snapshot of accounts, listings, escrow deals, and the review queues.
        </Text>
      </View>

      {/* Primary metrics */}
      <View style={styles.grid}>
        <StatCard
          label="Total Users"
          value={String(stats.users)}
          sub="Across deals & KYC"
          icon={Users}
          onPress={() => router.push('/admin/users')}
        />
        <StatCard
          label="Active Listings"
          value={String(stats.activeListings)}
          icon={Package}
          accent="#0284c7"
        />
        <StatCard
          label="Settled Volume"
          value={money(stats.settledVolume)}
          sub="Completed deals"
          icon={Wallet}
          accent={theme.primary}
        />
        <StatCard
          label="KYC Pending"
          value={String(stats.kycPending)}
          sub="Awaiting review"
          icon={ClipboardCheck}
          accent="#d97706"
          onPress={() => router.push('/admin/kyc')}
        />
        <StatCard
          label="Open Disputes"
          value={String(stats.openDisputes)}
          sub="Need a ruling"
          icon={Scale}
          accent="#e11d48"
          onPress={() => router.push('/admin/disputes')}
        />
        <StatCard
          label="Total Deals"
          value={String(stats.totalDeals)}
          icon={Handshake}
          onPress={() => router.push('/deals')}
        />
      </View>

      {/* Deals by status */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Escrow deals by status</Text>
          <Pressable onPress={() => router.push('/deals')} hitSlop={8}>
            <Text style={[styles.cardLink, { color: theme.primary }]}>View All →</Text>
          </Pressable>
        </View>

        <View style={styles.statusGrid}>
          {STATUS_ROWS.map((row) => (
            <View key={row.id} style={styles.statusCell}>
              <Text style={[styles.statusValue, { color: row.color }]}>
                {stats.byStatus[row.id] ?? 0}
              </Text>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>{row.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },

  header: { borderBottomWidth: 1, paddingBottom: Spacing.three, gap: 6 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontFamily: Fonts.display[700] },
  cardLink: { fontSize: 12, fontFamily: Fonts.sans[700] },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  statusCell: { flexGrow: 1, flexBasis: '28%', gap: 2 },
  statusValue: { fontSize: 19, fontFamily: Fonts.display[700] },
  statusLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[600],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
