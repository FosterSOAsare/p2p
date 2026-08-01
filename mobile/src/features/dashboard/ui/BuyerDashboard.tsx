import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Lock,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mockBuyerStats, mockOrders, type Order, type User } from '@/constants/mockData';
import { StatCard } from './StatCard';

/**
 * Buyer home — the phone version of `web/src/pages/UserDashboard.tsx`.
 *
 * Same sections in the same order: profile hero, four metric tiles, the
 * standalone-escrow banner, then recent marketplace orders with the
 * confirm-receipt action.
 *
 * Reads `mockBuyerStats` / `mockOrders` — no API yet, so "Confirm Receipt"
 * has nothing to call. Swap in the dashboard endpoint when the mobile API
 * client lands.
 */

const money = (amount: number, currency = 'GH₵') =>
  `${currency}${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

/** "10 Mar 2025" — same format the deals list uses. */
const orderDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Maps an order status onto the web's badge tones. */
function statusBadge(status: Order['status']) {
  switch (status) {
    case 'released':
      return { label: 'COMPLETED', bg: '#dcfce7', text: '#166534' };
    case 'shipped':
    case 'delivered':
      return { label: status.toUpperCase(), bg: '#dbeafe', text: '#1e40af' };
    case 'disputed':
      return { label: 'DISPUTED', bg: '#fee2e2', text: '#991b1b' };
    default:
      return { label: 'IN ESCROW', bg: '#fef9c3', text: '#854d0e' };
  }
}

export function BuyerDashboard({ user }: { user: User }) {
  const theme = useTheme();
  const router = useRouter();

  const stats = mockBuyerStats;
  const orders = mockOrders;

  const joined = new Date(user.createdAt).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.wrap}>
      {/* Profile hero */}
      <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.heroTop}>
          <View>
            {user.avatarUrl ? (
              <Image source={user.avatarUrl} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarLetter}>{user.fullName.charAt(0)}</Text>
              </View>
            )}
            {user.kycStatus === 'verified' ? (
              <View style={[styles.verifiedDot, { borderColor: theme.card }]}>
                <ShieldCheck size={12} color="#ffffff" />
              </View>
            ) : null}
          </View>

          <View style={styles.heroText}>
            <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text style={[styles.heroHandle, { color: theme.textSecondary }]} numberOfLines={1}>
              @{user.username}
            </Text>
            <Text style={[styles.heroMeta, { color: theme.textTertiary }]} numberOfLines={1}>
              Member since {joined} ·{' '}
              <Text style={{ color: theme.primary, fontFamily: Fonts.sans[700] }}>
                Protected Buyer
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable
            onPress={() => router.push('/deals')}
            style={({ pressed }) => [
              styles.heroBtn,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.heroBtnText, { color: theme.text }]}>My Orders</Text>
          </Pressable>
          <Pressable
            // The Profile tab holds the real account UI (the web's
            // UserSettings); /settings is still a placeholder route.
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.heroBtn,
              styles.heroBtnDark,
              { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Settings size={14} color={theme.background} />
            <Text style={[styles.heroBtnText, { color: theme.background }]}>Profile Settings</Text>
          </Pressable>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.grid}>
        <StatCard
          label="Active Orders"
          value={String(stats.activeOrders)}
          sub="In escrow or shipped"
          icon={ShoppingBag}
        />
        <StatCard
          label="Escrow Locked"
          value={money(stats.escrowLocked, stats.currency)}
          sub="100% Deposit Protection"
          icon={Lock}
          accent={theme.primary}
          subAccent={theme.primary}
        />
        <StatCard
          label="Total Purchases"
          value={money(stats.totalPurchases, stats.currency)}
          sub="Across all marketplace deals"
          icon={Package}
          accent="#0284c7"
        />
        <StatCard
          label="Saved Items"
          value={String(stats.savedItems)}
          sub="View my bookmarks →"
          icon={Heart}
          accent="#f43f5e"
          onPress={() => router.push('/bookmarks')}
        />
      </View>

      {/* Standalone escrow banner */}
      <View style={[styles.banner, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.bannerTitle, { color: theme.text }]}>
          Have an off-market 3rd-party deal?
        </Text>
        <Text style={[styles.bannerBody, { color: theme.textSecondary }]}>
          Create an independent escrow deal for freelance work or domain sales.
        </Text>
        <Pressable
          onPress={() => router.push('/escrow/new')}
          style={({ pressed }) => [
            styles.bannerBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.bannerBtnText}>Start Escrow Deal</Text>
        </Pressable>
      </View>

      {/* Recent orders */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Marketplace Orders</Text>
        <Pressable onPress={() => router.push('/deals')} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: theme.primary }]}>View All →</Text>
        </Pressable>
      </View>

      {orders.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ShoppingBag size={28} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No active or recent orders found.
          </Text>
          <Pressable
            onPress={() => router.push('/marketplace')}
            style={({ pressed }) => [
              styles.bannerBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.bannerBtnText}>Browse Marketplace</Text>
          </Pressable>
        </View>
      ) : (
        orders.map((order) => {
          const badge = statusBadge(order.status);
          const canRelease =
            order.status === 'escrow_funded' ||
            order.status === 'shipped' ||
            order.status === 'delivered';

          return (
            <Pressable
              key={order.id}
              onPress={() => router.push(`/escrow/${order.dealId}`)}
              style={({ pressed }) => [
                styles.order,
                { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.cardBorder },
              ]}
            >
              <View style={[styles.orderTop, { borderBottomColor: theme.border }]}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
                <Text style={[styles.orderCode, { color: theme.textTertiary }]} numberOfLines={1}>
                  {order.id} · {orderDate(order.createdAt)}
                </Text>
                <Text style={[styles.orderVendor, { color: theme.textSecondary }]} numberOfLines={1}>
                  @{order.vendor.username}
                </Text>
              </View>

              <View style={styles.orderBody}>
                <Image source={order.listingImage} style={styles.orderImage} contentFit="cover" />
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1}>
                    {order.listingTitle}
                  </Text>
                  <Text style={[styles.orderPrice, { color: theme.text }]}>
                    {order.currency} {order.amount.toLocaleString()}
                  </Text>
                  {order.tracking ? (
                    <View style={styles.trackingRow}>
                      <Truck size={12} color={theme.primary} />
                      <Text style={[styles.tracking, { color: theme.textSecondary }]} numberOfLines={1}>
                        {order.tracking.carrier}: {order.tracking.code}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Action row — mirrors the web's status-dependent controls */}
              {order.status === 'disputed' ? (
                <View style={[styles.statusNote, { backgroundColor: '#fef3c7' }]}>
                  <AlertTriangle size={14} color="#92400e" />
                  <Text style={[styles.statusNoteText, { color: '#92400e' }]}>
                    Under Dispute Review
                  </Text>
                </View>
              ) : canRelease ? (
                <View
                  style={[styles.releaseBtn, { backgroundColor: theme.primary }]}
                  // TODO(api): call the release endpoint — mock data has nothing
                  // to mutate, so this reads as a label until the API lands.
                >
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text style={styles.releaseText}>Confirm Receipt &amp; Release</Text>
                </View>
              ) : (
                <View style={styles.statusNote}>
                  <CheckCircle2 size={15} color={theme.primary} />
                  <Text style={[styles.statusNoteText, { color: theme.primary }]}>
                    Completed &amp; Paid Out
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },

  hero: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { height: 60, width: 60, borderRadius: Radius.md },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 19, fontFamily: Fonts.sans[700], color: '#ffffff' },
  verifiedDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    height: 22,
    width: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 2 },
  // Name uses the web's `font-display`.
  heroName: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  heroHandle: { fontSize: 12, fontFamily: Fonts.sans[600] },
  heroMeta: { fontSize: 11, fontFamily: Fonts.sans[400] },

  heroActions: { flexDirection: 'row', gap: Spacing.two },
  heroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  heroBtnDark: { borderColor: 'transparent' },
  heroBtnText: { fontSize: 12, fontFamily: Fonts.sans[700] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },

  banner: { borderRadius: Radius.lg, padding: Spacing.four, gap: 6 },
  bannerTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  bannerBody: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 44,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  bannerBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  sectionLink: { fontSize: 12, fontFamily: Fonts.sans[700] },

  empty: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: { fontSize: 13, fontFamily: Fonts.sans[600], textAlign: 'center' },

  order: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 9.5, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  orderCode: { flex: 1, fontSize: 10, fontFamily: Fonts.sans[500] },
  orderVendor: { fontSize: 11, fontFamily: Fonts.sans[600], flexShrink: 1 },

  orderBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  orderImage: { height: 56, width: 56, borderRadius: Radius.sm },
  orderInfo: { flex: 1, gap: 2 },
  orderTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  orderPrice: { fontSize: 13, fontFamily: Fonts.display[700] },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  tracking: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sans[500] },

  releaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 44,
    borderRadius: Radius.md,
  },
  releaseText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
  statusNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
  },
  statusNoteText: { fontSize: 12, fontFamily: Fonts.sans[700] },
});
