import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Package, ShieldCheck, Star, Store, Wallet } from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mockSellerListings, mockSellerStats, type User } from '@/constants/mockData';
import { StatCard } from './StatCard';

/**
 * Seller home — the phone version of `web/src/pages/SellerDashboard.tsx`.
 *
 * Mirrors the merchant portal header (store name, verified badge, rating), the
 * three payout balance cards, and the store inventory list. The web also has a
 * sales/dispatch manager with a tracking-number form; that needs write calls,
 * so it waits for the API.
 *
 * Reads `mockSellerStats` / `mockSellerListings` — no API yet.
 */

const money = (amount: number, currency = 'GH₵') =>
  `${currency}${amount.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

export function SellerDashboard({ user }: { user: User }) {
  const theme = useTheme();
  const router = useRouter();

  const stats = mockSellerStats;
  const listings = mockSellerListings;

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
              {user.fullName}
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

      {/* Inventory */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Manage Store Inventory</Text>
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
          <Image source={listing.imageUrl} style={styles.listingImage} contentFit="cover" />
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
  heroName: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
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
  sectionTitle: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  sectionLink: { fontSize: 12, fontFamily: Fonts.sans[700] },

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
