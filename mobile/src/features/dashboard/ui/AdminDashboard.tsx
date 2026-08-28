import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  ChevronRight,
  ClipboardCheck,
  Flag,
  Handshake,
  Package,
  PackageSearch,
  Scale,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
} from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useAdminStats } from '@/features/admin/data/adminStatsApi';
import { useAdminDisputes } from '@/features/admin/data/adminDisputesApi';
import { useAdminListingDisputes } from '@/features/admin/data/adminListingsApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import { AdminError, AdminLoading, money } from '@/features/admin/ui/AdminScaffold';
import { AppBar } from '@/features/shared/ui/AppBar';
import { StatCard } from './StatCard';

/**
 * Admin home — the phone version of `web/src/pages/AdminDashboard.tsx`.
 *
 * The web routes /dashboard → /admin for admins; on a phone the home tab is the
 * console itself, so this doubles as the navigation hub for every admin area.
 *
 * Unlike the rest of the app this reads the live API (`/api/admin/stats`), so
 * the figures here and inside each queue always agree. That needs a real
 * signed-in admin — a mock session gets the prompt below rather than silently
 * showing zeroes.
 */

/** Deal statuses the breakdown card shows, in lifecycle order. */
const STATUS_ROWS = [
  { id: 'created', label: 'Created', color: '#6b7280' },
  { id: 'funded', label: 'Funded', color: '#3730a3' },
  { id: 'delivered', label: 'Delivered', color: '#1e40af' },
  { id: 'disbursed', label: 'Released', color: '#166534' },
  { id: 'disputed', label: 'Disputed', color: '#991b1b' },
  { id: 'cancelled', label: 'Cancelled', color: '#9d174d' },
] as const;

export function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { isRealSession } = useAuth();

  const statsQuery = useAdminStats();
  // Queue sizes for the section badges — they make the hub useful at a glance
  // instead of forcing a tap to find out whether there's work waiting.
  const disputesQuery = useAdminDisputes('open');
  const appealsQuery = useAdminListingDisputes('open');

  if (!isRealSession) {
    return (
      <View style={styles.wrap}>
        <ConsoleHeader />
        <View style={[styles.notice, { backgroundColor: '#fef9c3', borderColor: '#fde68a' }]}>
          <TriangleAlert size={17} color="#a16207" />
          <View style={styles.noticeBody}>
            <Text style={[styles.noticeTitle, { color: '#854d0e' }]}>Demo session</Text>
            <Text style={[styles.noticeText, { color: '#854d0e' }]}>
              You're signed in with a demo account. Sign in with a real admin account to load live
              platform data and take moderation actions.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (statsQuery.isLoading) {
    return (
      <View style={styles.wrap}>
        <ConsoleHeader />
        <AdminLoading />
      </View>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <View style={styles.wrap}>
        <ConsoleHeader />
        <AdminError message={apiErrorMessage(statsQuery.error)} />
      </View>
    );
  }

  const s = statsQuery.data;
  const openDisputes = disputesQuery.data?.length ?? s.openDisputes;
  const openAppeals = appealsQuery.data?.disputes.filter((d) => d.status === 'open').length ?? 0;

  const sections = [
    {
      label: 'KYC Reviews',
      hint: 'Verify sellers before they can list',
      icon: ClipboardCheck,
      color: '#d97706',
      count: s.kycPending,
      href: '/admin/kyc' as Href,
    },
    {
      label: 'Disputes',
      hint: 'Rule on escrow disputes and move funds',
      icon: Scale,
      color: '#e11d48',
      count: openDisputes,
      href: '/admin/disputes' as Href,
    },
    {
      label: 'Listings',
      hint: 'Remove listings and review takedown appeals',
      icon: PackageSearch,
      color: '#0284c7',
      count: openAppeals,
      href: '/admin/listings' as Href,
    },
    {
      label: 'Reports',
      hint: 'Listings buyers have flagged for review',
      icon: Flag,
      color: '#b45309',
      count: s.openReports,
      href: '/admin/reports' as Href,
    },
    {
      label: 'Users',
      hint: 'Search accounts, suspend or reinstate',
      icon: Users,
      color: theme.primary,
      count: s.suspendedUsers,
      href: '/admin/users' as Href,
    },
    {
      label: 'Deals',
      hint: 'Oversight of every escrow on the platform',
      icon: Handshake,
      color: '#7c3aed',
      count: 0,
      href: '/admin/deals' as Href,
    },
  ];

  return (
    <View style={styles.wrap}>
      <ConsoleHeader />

      {/* Every figure is also a way in — tapping one opens the list behind it,
          pre-filtered to exactly what the tile counted. */}
      <View style={styles.grid}>
        <StatCard
          label="Total Users"
          value={String(s.users)}
          sub={`${s.suspendedUsers} suspended`}
          icon={Users}
          onPress={() => router.push('/admin/users')}
        />
        <StatCard
          label="Active Listings"
          value={String(s.activeListings)}
          icon={Package}
          accent="#0284c7"
          onPress={() => router.push('/admin/listings?status=active')}
        />
        <StatCard
          label="Settled Volume"
          value={money(s.ghsVolume)}
          sub="Completed deals"
          icon={Wallet}
          accent={theme.primary}
          onPress={() => router.push('/admin/deals?status=disbursed')}
        />
        <StatCard
          label="Total Deals"
          value={String(s.totalDeals)}
          icon={Handshake}
          accent="#7c3aed"
          onPress={() => router.push('/admin/deals')}
        />
      </View>

      {/* Where the work is — the console's real job on a phone */}
      <View style={styles.sectionList}>
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Moderation</Text>
        {sections.map((section) => (
          <Pressable
            key={section.label}
            onPress={() => router.push(section.href)}
            accessibilityRole="button"
            // The count is the whole point of the row for a screen reader —
            // "Disputes, 1 waiting" is the difference between a list of links
            // and knowing where the work is.
            accessibilityLabel={
              section.count > 0 ? `${section.label}, ${section.count} waiting` : section.label
            }
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: theme.backgroundElement }]}>
              <section.icon size={18} color={section.color} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{section.label}</Text>
              <Text style={[styles.rowHint, { color: theme.textSecondary }]} numberOfLines={1}>
                {section.hint}
              </Text>
            </View>
            {section.count > 0 && (
              <View style={[styles.rowCount, { backgroundColor: section.color }]}>
                <Text style={styles.rowCountText}>{section.count}</Text>
              </View>
            )}
            <ChevronRight size={17} color={theme.textTertiary} />
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Escrow deals by status</Text>
        <View style={styles.statusGrid}>
          {STATUS_ROWS.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/admin/deals?status=${row.id}`)}
              style={({ pressed }) => [styles.statusCell, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.statusValue, { color: row.color }]}>
                {s.dealsByStatus[row.id] ?? 0}
              </Text>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>{row.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function ConsoleHeader() {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      {/* Profile, messages and notifications live up here rather than in the
          bottom bar, which the console reserves for its four review queues.
          Same component the buyer and seller home screens use. */}
      <AppBar />
      <View style={styles.headerTitles}>
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <ShieldCheck size={13} color={theme.primary} />
          <Text style={[styles.badgeText, { color: theme.primary }]}>Admin Console</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Platform Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Live snapshot of accounts, listings, escrow deals, and the review queues.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },

  // The app bar sits above the badge, so the block needs more breathing room
  // between its rows than the 6px the title and subtitle want between them.
  header: { borderBottomWidth: 1, paddingBottom: Spacing.three, gap: 6, paddingTop: Spacing.one },
  headerTitles: { gap: 6, marginTop: Spacing.two },
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
  title: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },

  sectionList: { gap: Spacing.two },
  sectionHeading: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  rowIcon: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 14, fontFamily: Fonts.sans[700] },
  rowHint: { fontSize: 11.5, fontFamily: Fonts.sans[400] },
  rowCount: {
    minWidth: 22,
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rowCountText: { fontSize: 11, fontFamily: Fonts.sans[700], color: '#ffffff' },

  notice: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  noticeBody: { flex: 1, gap: 3 },
  noticeTitle: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  noticeText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 13, fontFamily: Fonts.display[700] },

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
