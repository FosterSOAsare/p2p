import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Star,
  Store,
  Truck,
  Wallet,
} from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  mockOrders,
  mockProducts,
  mockSellerStats,
  type Order,
  type User,
} from '@/constants/mockData';
import { StatCard } from './StatCard';

/**
 * Seller home — the phone version of `web/src/pages/SellerDashboard.tsx`.
 *
 * Mirrors the merchant portal header (store name, verified badge, rating), the
 * three payout balance cards, and the store inventory list. The web also has a
 * sales/dispatch manager with a tracking-number form; that needs write calls,
 * so it waits for the API.
 *
 * Reads `mockSellerStats` plus this vendor's slice of `mockProducts` — no API yet.
 */

const money = (amount: number, currency = 'GH₵') =>
  `${currency}${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

/** "10 Mar 2025" — same format the deals list uses. */
const orderDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Status badge tones, mirroring the web's <Badge tone={...}> mapping. */
function statusBadge(status: Order['status']) {
  switch (status) {
    case 'released':
      return { label: 'RELEASED', bg: '#dcfce7', text: '#166534' };
    case 'shipped':
    case 'delivered':
      return { label: status.toUpperCase(), bg: '#dbeafe', text: '#1e40af' };
    case 'disputed':
      return { label: 'DISPUTED', bg: '#fee2e2', text: '#991b1b' };
    default:
      return { label: 'AWAITING SHIPMENT', bg: '#fef9c3', text: '#854d0e' };
  }
}

export function SellerDashboard({ user }: { user: User }) {
  const theme = useTheme();
  const router = useRouter();

  const stats = mockSellerStats;
  // Same collection My Listings and the marketplace read, scoped to this
  // vendor — one source, as the web has one `Listing` table.
  const listings = mockProducts.filter((p) => p.vendor.username === user.username);
  // The web's header shows the STORE identity (`stats.storeName`), not the
  // person's name. mockSellerStats carries no store name, so take it from the
  // vendor on this account's listings, as the seller profile screen does.
  const storeName =
    mockProducts.find((p) => p.vendor.username === user.username)?.vendor.storeName ??
    user.fullName;
  // Sales are the orders where this account is the vendor.
  const sales = mockOrders.filter((o) => o.vendor.username === user.username);
  const actionRequired = sales.filter((o) => o.status === 'escrow_funded').length;

  return (
    <View style={styles.wrap}>
      {/* Merchant header */}
      <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.heroTop}>
          <View style={[styles.storeIcon, { backgroundColor: theme.primary }]}>
            <Store size={20} color="#ffffff" />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>
              {storeName}
            </Text>
            <Text style={[styles.heroHandle, { color: theme.textSecondary }]} numberOfLines={1}>
              @{user.username} · Verified Merchant Portal
            </Text>
          </View>
        </View>

        <View style={styles.trustRow}>
          <View style={[styles.kycPill, { backgroundColor: theme.primaryLight }]}>
            <ShieldCheck size={13} color={theme.primary} />
            <Text style={[styles.kycText, { color: theme.primary }]}>
              KYC Level 2 Verified Vendor
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Star size={13} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>
              {stats.rating} ({stats.reviewCount} reviews)
            </Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable
            onPress={() => router.push('/wallet')}
            style={({ pressed }) => [
              styles.heroBtn,
              { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Wallet size={16} color={theme.background} />
            <Text style={[styles.heroBtnText, { color: theme.background }]}>Payout Wallet</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/listings')}
            style={({ pressed }) => [
              styles.heroBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Store size={16} color="#ffffff" />
            <Text style={[styles.heroBtnText, { color: '#ffffff' }]}>All Listings</Text>
          </Pressable>
        </View>
      </View>

      {/* Payout breakdown */}
      <View style={styles.grid}>
        <StatCard
          label="Total Sales Revenue"
          value={money(stats.totalRevenue, stats.currency)}
          icon={Wallet}
        />
        <StatCard
          label="Locked in Escrow"
          value={money(stats.lockedInEscrow, stats.currency)}
          icon={ShieldCheck}
          accent={theme.primary}
        />
        <StatCard
          label="Available Payout"
          value={money(stats.availablePayout, stats.currency)}
          sub="Tap to withdraw →"
          icon={Wallet}
          accent="#0284c7"
          onPress={() => router.push('/wallet')}
        />
        <StatCard
          label="Total Sales"
          value={String(stats.totalSales)}
          sub={`${stats.activeListings} active listings`}
          icon={Package}
        />
      </View>

      {/* Sales & dispatch */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadText}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Merchant Sales &amp; Dispatch
          </Text>
          <Text style={[styles.sectionSub, { color: theme.textTertiary }]}>
            Orders placed by buyers. Enter tracking to mark them shipped.
          </Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.countPillText, { color: theme.textSecondary }]}>
            {actionRequired} to ship
          </Text>
        </View>
      </View>

      {sales.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Truck size={26} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No incoming sales orders yet.
          </Text>
        </View>
      ) : (
        sales.map((order) => {
          const badge = statusBadge(order.status);

          return (
            <Pressable
              key={order.id}
              onPress={() => router.push(`/escrow/${order.dealId}`)}
              style={({ pressed }) => [
                styles.sale,
                { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.cardBorder },
              ]}
            >
              <View style={[styles.saleTop, { borderBottomColor: theme.border }]}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
                <Text style={[styles.saleMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                  @{order.buyer.username} · {orderDate(order.createdAt)}
                </Text>
              </View>

              <Text style={[styles.saleTitle, { color: theme.text }]} numberOfLines={1}>
                {order.listingTitle}
              </Text>

              {order.tracking ? (
                <View style={styles.trackingRow}>
                  <Truck size={12} color={theme.primary} />
                  <Text style={[styles.tracking, { color: theme.textSecondary }]} numberOfLines={1}>
                    {order.tracking.carrier}: {order.tracking.code}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.saleFooter, { borderTopColor: theme.border }]}>
                <View>
                  <Text style={[styles.escrowLabel, { color: theme.textTertiary }]}>Escrow Value</Text>
                  <Text style={[styles.escrowValue, { color: theme.text }]}>
                    {order.currency} {order.amount.toLocaleString()}
                  </Text>
                </View>

                {/* Status-dependent action, as on the web. The dispatch form
                    needs a write call, so for now this opens the deal. */}
                {order.status === 'disputed' ? (
                  <View style={[styles.actionNote, { backgroundColor: '#fef3c7' }]}>
                    <AlertTriangle size={13} color="#92400e" />
                    <Text style={[styles.actionNoteText, { color: '#92400e' }]}>Under Review</Text>
                  </View>
                ) : order.status === 'escrow_funded' ? (
                  <View style={[styles.dispatchBtn, { backgroundColor: theme.text }]}>
                    <Truck size={14} color={theme.background} />
                    <Text style={[styles.dispatchText, { color: theme.background }]}>
                      Enter Tracking
                    </Text>
                  </View>
                ) : order.status === 'released' ? (
                  <View style={[styles.actionNote, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircle2 size={13} color="#166534" />
                    <Text style={[styles.actionNoteText, { color: '#166534' }]}>Payout Released</Text>
                  </View>
                ) : (
                  <View style={[styles.actionNote, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[styles.actionNoteText, { color: '#1e40af' }]}>
                      Awaiting Confirmation
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })
      )}

      {/* Inventory */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadText}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Manage Store Inventory</Text>
          <Text style={[styles.sectionSub, { color: theme.textTertiary }]}>
            Showing {listings.length} of {listings.length} items listed on catalog.
          </Text>
        </View>
        <Pressable onPress={() => router.push('/listings')} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: theme.primary }]}>View All →</Text>
        </Pressable>
      </View>

      {listings.map((listing) => (
        <Pressable
          key={listing.id}
          onPress={() => router.push(`/listings/${listing.id}`)}
          style={({ pressed }) => [
            styles.listing,
            { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.cardBorder },
          ]}
        >
          <Image source={listing.images[0]} style={styles.listingImage} contentFit="cover" />
          <View style={styles.listingInfo}>
            <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={[styles.listingPrice, { color: theme.text }]}>
              {money(listing.price, stats.currency)}
            </Text>
            <Text style={[styles.listingMeta, { color: theme.textTertiary }]} numberOfLines={1}>
              {listing.quantity} in stock · {listing.viewCount} views
            </Text>
          </View>
          <View
            style={[
              styles.listingStatus,
              { backgroundColor: listing.status === 'active' ? '#dcfce7' : theme.backgroundElement },
            ]}
          >
            <Text
              style={[
                styles.listingStatusText,
                { color: listing.status === 'active' ? '#166534' : theme.textSecondary },
              ]}
            >
              {listing.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },

  hero: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  storeIcon: {
    height: 40,
    width: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 2 },
  // Store name uses the web's `font-display`.
  heroName: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  heroHandle: { fontSize: 11.5, fontFamily: Fonts.sans[400] },

  trustRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  kycPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  kycText: { fontSize: 11, fontFamily: Fonts.sans[700] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11.5, fontFamily: Fonts.sans[700], color: '#d97706' },

  heroActions: { flexDirection: 'row', gap: Spacing.two },
  heroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.md,
  },
  heroBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionHeadText: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  sectionSub: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400] },
  sectionLink: { fontSize: 12, fontFamily: Fonts.sans[700] },

  countPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  countPillText: { fontSize: 11, fontFamily: Fonts.sans[700] },

  empty: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: { fontSize: 13, fontFamily: Fonts.sans[600], textAlign: 'center' },

  sale: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  saleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeText: { fontSize: 9, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  saleMeta: { flexShrink: 1, fontSize: 10.5, fontFamily: Fonts.sans[500] },
  saleTitle: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tracking: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sans[500] },
  saleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  escrowLabel: { fontSize: 9.5, fontFamily: Fonts.sans[600] },
  escrowValue: { fontSize: 15, fontFamily: Fonts.display[700] },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  dispatchText: { fontSize: 12, fontFamily: Fonts.sans[700] },
  actionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  actionNoteText: { fontSize: 11, fontFamily: Fonts.sans[700] },

  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  listingImage: { height: 52, width: 52, borderRadius: Radius.sm },
  listingInfo: { flex: 1, gap: 2 },
  listingTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  listingPrice: { fontSize: 13, fontFamily: Fonts.display[700] },
  listingMeta: { fontSize: 10.5, fontFamily: Fonts.sans[500] },
  listingStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  listingStatusText: { fontSize: 9.5, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
});
