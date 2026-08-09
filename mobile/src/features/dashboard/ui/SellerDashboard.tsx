import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  Truck,
  User as UserIcon,
  Wallet,
} from '@/components/icons';

import { ActivityIndicator } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useState } from 'react';
import { type User } from '@/constants/mockData';
import { useDeleteListing } from '@/features/listings/data/listingsApi';
import { useConversations } from '@/features/messages/data/messagesApi';
import { useUnreadNotifications } from '@/features/notifications/data/notificationsApi';
import { useDashboard, type SellerSaleOrder } from '../data/dashboardApi';
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
function statusBadge(status: SellerSaleOrder['status']) {
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

  /**
   * One request backs the whole screen — stats, sales and inventory.
   *
   * These lists used to come from `mockProducts`/`mockOrders` filtered by
   * `user.username`. That silently emptied both sections the moment sign-in
   * became real: the mock rows belong to `kwame_tech`, so a genuine account
   * matched nothing and the screen looked broken rather than empty.
   */
  const dashboard = useDashboard();
  const seller = dashboard.data?.seller;

  const listings = seller?.listings ?? [];
  const sales = seller?.salesOrders ?? [];

  /**
   * The dashboard is a summary, not the full console — it previews a few rows
   * and sends you to the dedicated screen for the rest. The web caps listings
   * at 6 (`displayedListings`); sales get a shorter preview because each row is
   * much taller on a phone. "View all" below keeps the remainder reachable.
   */
  const previewSales = sales.slice(0, 3);
  const previewListings = listings.slice(0, 6);

  /**
   * The server's stat names differ from the mock's, and two figures it doesn't
   * send are derived here. Mapping once keeps the JSX below unchanged and puts
   * every rename in one visible place.
   */
  const stats = {
    // Marketplace listings are GHS-only; the server never varies this.
    currency: 'GHS',
    totalRevenue: seller?.stats.totalEarnings ?? 0,
    lockedInEscrow: seller?.stats.escrowLockedBalance ?? 0,
    availablePayout: seller?.stats.availablePayoutBalance ?? 0,
    rating: seller?.stats.rating ?? 0,
    reviewCount: seller?.stats.reviewCount ?? 0,
    // Not in the payload — counted from the rows it does send.
    totalSales: sales.length,
    activeListings: listings.filter((l) => l.status === 'active').length,
  };

  // The web's header shows the STORE identity, not the person's name.
  const storeName = seller?.stats.storeName ?? user.fullName;
  const actionRequired = seller?.stats.actionRequiredCount ?? 0;

  /**
   * Badge counts for the header cluster — both live, read the same way the web
   * reads them.
   *
   * These were counted off `mockConversations` / `mockNotifications`, so they
   * showed the same two fixed numbers to every account forever, whether or not
   * anything had actually happened. Messages sum the per-conversation unread
   * counts the inbox already returns; notifications come from the `unread`
   * total the list endpoint carries on every response. Neither costs an extra
   * request.
   */

  /**
   * Deleting straight from the inventory strip, as the web's cards do.
   *
   * The mutation invalidates the listings cache and the dashboard, so the strip
   * and the "N items listed" count both correct themselves without this screen
   * touching either.
   */
  const deleteListing = useDeleteListing();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  /**
   * Resolved by id rather than storing the row, so the dialog can't go on
   * naming a listing that has already been deleted underneath it.
   *
   * Must come **after** the `useState` above: it reads `pendingDelete`, and
   * sitting earlier in the component body it hit the temporal dead zone and
   * threw on every render — which is why the delete button did nothing.
   */
  const pendingListing = previewListings.find((l) => l.id === pendingDelete) ?? null;

  const conversations = useConversations();
  const unreadMessages = (conversations.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
  const unreadNotifications = useUnreadNotifications();

  /**
   * Deliberately NOT a full-screen spinner while loading.
   *
   * The shell — app bar, avatar, store identity — is already known from the
   * session, so blocking it on a six-second round trip to another continent
   * makes the app feel dead when it has something to show. Only the parts that
   * genuinely need the response wait for it; each section handles its own
   * loading below. A figure that isn't known yet reads as "—" rather than a
   * confident GH₵0.00, which would be a lie until the data lands.
   */
  const loading = dashboard.isLoading;
  const figure = (value: string) => (loading ? '—' : value);

  if (dashboard.isError) {
    return (
      <View style={[styles.wrap, styles.centreState]}>
        <AlertTriangle size={26} color="#e11d48" />
        <Text style={[styles.stateText, { color: theme.text }]}>Couldn&apos;t load your store</Text>
        <Text style={[styles.stateSub, { color: theme.textSecondary }]}>
          {apiErrorMessage(dashboard.error)}
        </Text>
        <Pressable
          onPress={() => dashboard.refetch()}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* App bar — avatar anchors the left, message and alert icons the right.
          The store card directly below already names the merchant, so a
          greeting here would only repeat it. Same destinations as the web
          header (Layout.tsx): profile, messages, notifications. */}
      <View style={styles.appBar}>
        <Pressable
          onPress={() => router.push('/profile')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          style={({ pressed }) => [styles.avatarBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          {user.avatarUrl ? (
            <Image
              source={user.avatarUrl}
              style={[styles.headerAvatar, { borderColor: theme.cardBorder }]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.headerAvatar,
                styles.avatarFallback,
                { backgroundColor: theme.primary, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={styles.avatarLetter}>
                {(user.fullName || user.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.appBarActions}>
          <Pressable
            onPress={() => router.push('/messages')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'
            }
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MessageSquare size={23} color={theme.text} />
            {unreadMessages > 0 ? (
              <View
                style={[
                  styles.headerBadge,
                  { backgroundColor: theme.primary, borderColor: theme.background },
                ]}
              >
                <Text style={styles.headerBadgeText}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotifications > 0
                ? `Notifications, ${unreadNotifications} unread`
                : 'Notifications'
            }
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Bell size={23} color={theme.text} />
            {unreadNotifications > 0 ? (
              <View
                style={[
                  styles.headerBadge,
                  { backgroundColor: theme.primary, borderColor: theme.background },
                ]}
              >
                <Text style={styles.headerBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>

        </View>
      </View>

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
          value={figure(money(stats.totalRevenue, stats.currency))}
          icon={Wallet}
        />
        <StatCard
          label="Locked in Escrow"
          value={figure(money(stats.lockedInEscrow, stats.currency))}
          icon={ShieldCheck}
          accent={theme.primary}
        />
        <StatCard
          label="Available Payout"
          value={figure(money(stats.availablePayout, stats.currency))}
          sub="Tap to withdraw →"
          icon={Wallet}
          accent="#0284c7"
          onPress={() => router.push('/wallet')}
        />
        <StatCard
          label="Total Sales"
          value={figure(String(stats.totalSales))}
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
            {loading
              ? 'Loading your sales...'
              : `Showing ${previewSales.length} of ${sales.length}. Tap a sale to open its deal.`}
          </Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.countPillText, { color: theme.textSecondary }]}>
            {actionRequired} to ship
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : sales.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Truck size={26} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No incoming sales orders yet.
          </Text>
        </View>
      ) : (
        previewSales.map((order) => {
          const badge = statusBadge(order.status);

          return (
            /* Not a pressable row. The web makes only the deal code and the
               title links; the badge, buyer and date are plain text. Keeping
               that means a stray tap on the card does nothing, as on the web. */
            <View
              key={order.id}
              style={[styles.sale, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={[styles.saleTop, { borderBottomColor: theme.border }]}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
                <Text style={[styles.saleMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                  {/* `date` is already formatted server-side — parsing it again
                      would only risk a locale mismatch. */}
                  @{order.buyerUsername} · {order.date}
                </Text>
              </View>

              {/* The title is the link, exactly as on the web. */}
              <Pressable
                onPress={() => router.push(`/escrow/${order.id}`)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Open deal ${order.code}`}
              >
                <Text
                  style={[styles.saleTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {order.title}
                </Text>
              </Pressable>

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
            </View>
          );
        })
      )}

      {/* Everything past the preview lives on the My Deals tab. */}
      {sales.length > previewSales.length ? (
        <Pressable
          onPress={() => router.push('/deals')}
          style={({ pressed }) => [
            styles.viewAllRow,
            {
              borderColor: theme.cardBorder,
              backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
            },
          ]}
        >
          <Text style={[styles.sectionLink, { color: theme.primary }]}>
            View all {sales.length} sales →
          </Text>
        </Pressable>
      ) : null}

      {/* Inventory */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadText}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Manage Store Inventory</Text>
          <Text style={[styles.sectionSub, { color: theme.textTertiary }]}>
            {loading
              ? 'Loading your catalog...'
              : `Showing ${previewListings.length} of ${listings.length} items listed on catalog.`}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/listings')} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: theme.primary }]}>View All →</Text>
        </Pressable>
      </View>

      {/* Inventory cards are not links — the web renders each as a plain div,
          with editing done from My Listings. "View All" above is the way
          through, so a tap on the card itself deliberately does nothing. */}
      {previewListings.map((listing) => (
        <View
          key={listing.id}
          style={[styles.listing, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          {/* The API sends one cover URL, and it may be null. */}
          {listing.imageUrl ? (
            <Image source={listing.imageUrl} style={styles.listingImage} contentFit="cover" />
          ) : (
            <View
              style={[
                styles.listingImage,
                styles.listingImageEmpty,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <Package size={16} color={theme.textTertiary} />
            </View>
          )}
          <View style={styles.listingInfo}>
            <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={[styles.listingPrice, { color: theme.text }]}>
              {money(listing.price, stats.currency)}
            </Text>
            <Text style={[styles.listingMeta, { color: theme.textTertiary }]} numberOfLines={1}>
              {listing.stock} in stock · {listing.views} views
            </Text>
          </View>
          <View style={styles.listingEnd}>
            <View
              style={[
                styles.listingStatus,
                {
                  backgroundColor:
                    listing.status === 'active' ? '#dcfce7' : theme.backgroundElement,
                },
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

            {/* The web's per-card trash button. Same place in the card, same
                job — remove the listing without leaving the dashboard. */}
            <Pressable
              onPress={() => setPendingDelete(listing.id)}
              disabled={deleteListing.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${listing.title}`}
              style={({ pressed }) => [
                styles.listingDelete,
                {
                  backgroundColor: pressed ? '#fef2f2' : 'transparent',
                  opacity: deleteListing.isPending ? 0.5 : 1,
                },
              ]}
            >
              <Trash2 size={15} color="#e11d48" />
            </Pressable>
          </View>
        </View>
      ))}

      {/**
       * The web calls `confirm()`. React Native has no such thing, and deleting
       * a listing is not undoable, so it gets a real dialog rather than firing
       * on the first tap.
       *
       * A `Modal`, not an absolutely-positioned View. This component renders
       * inside the dashboard's ScrollView, so an in-tree overlay scrolled away
       * with the content and left the page behind it scrollable — you could
       * push the question off screen and carry on. A Modal renders above the
       * whole app, outside that ScrollView, and swallows touches behind it, so
       * the dialog stays put and the screen is inert until it's answered.
       *
       * `onRequestClose` is what makes the Android back button dismiss it
       * rather than navigating away with the dialog still open.
       */}
      <Modal
        visible={pendingListing !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPendingDelete(null)}
      >
        {pendingListing ? (
          <View style={styles.backdrop}>
            <View
              style={[styles.dialog, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Text style={[styles.dialogTitle, { color: theme.text }]}>Delete this listing?</Text>
              <Text style={[styles.dialogBody, { color: theme.textSecondary }]}>
                &ldquo;{pendingListing.title}&rdquo; will be removed from your store. This
                can&apos;t be undone.
              </Text>

              {deleteListing.isError ? (
                <Text style={styles.dialogError}>{apiErrorMessage(deleteListing.error)}</Text>
              ) : null}

              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => setPendingDelete(null)}
                  style={[styles.dialogCancel, { borderColor: theme.border }]}
                >
                  <Text style={[styles.dialogCancelText, { color: theme.textSecondary }]}>
                    Keep it
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    deleteListing.mutate(pendingListing.id, {
                      onSuccess: () => setPendingDelete(null),
                    })
                  }
                  disabled={deleteListing.isPending}
                  style={({ pressed }) => [
                    styles.dialogDelete,
                    { opacity: deleteListing.isPending ? 0.6 : pressed ? 0.85 : 1 },
                  ]}
                >
                  {deleteListing.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Trash2 size={14} color="#ffffff" />
                  )}
                  <Text style={styles.dialogDeleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
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

  // App bar: avatar left, bare icons right.
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    /**
     * Pulls the store card up under the icons.
     *
     * `wrap` puts 12px between every child, which left the bar floating away
     * from the card it belongs to. Cancelling most of that ties the two
     * together as one header block, while the sections below keep their normal
     * spacing.
     */
    marginBottom: -Spacing.two,
  },

  // 20px apart — enough that neighbouring icons aren't mistapped, tight enough
  // that they read as one cluster.
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { alignItems: 'center', justifyContent: 'center' },
  /**
   * 44 is the minimum comfortable touch target on both platforms (Apple HIG and
   * Material both land there), and it reads as a deliberate profile anchor
   * rather than a stray dot. Fixed rather than proportional: an avatar that
   * scaled with screen width would look bloated on a tablet.
   */
  headerAvatar: { height: 44, width: 44, borderRadius: Radius.full, borderWidth: 1 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 17, fontFamily: Fonts.sans[700], color: '#ffffff' },
  /** Rides the icon's top-right corner, ringed in the page colour so it reads
      as floating above rather than part of the glyph. */
  headerBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 17,
    height: 17,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * `includeFontPadding` is the important one: Android reserves extra space
   * above and below the glyph for ascenders/descenders, which pushes a short
   * string like "3" off-centre inside a circle this small. Turning it off, with
   * an explicit lineHeight, puts the digit dead centre on both platforms.
   */
  headerBadgeText: {
    fontSize: 9.5,
    lineHeight: 11,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

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
  listingImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  viewAllRow: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },

  centreState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 96, gap: Spacing.three },
  stateText: { fontSize: 14, fontFamily: Fonts.sans[700], textAlign: 'center' },
  stateSub: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400], textAlign: 'center' },
  retryBtn: {
    height: 42,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
  listingInfo: { flex: 1, gap: 2 },
  listingTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  listingPrice: { fontSize: 13, fontFamily: Fonts.display[700] },
  listingMeta: { fontSize: 10.5, fontFamily: Fonts.sans[500] },
  listingEnd: { alignItems: 'flex-end', gap: 4 },
  listingStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  listingStatusText: { fontSize: 9.5, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  // 32 plus hitSlop 8 clears the 44pt minimum target without the icon looking
  // oversized next to the status pill.
  listingDelete: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },

  /**
   * `flex: 1`, not absolute positioning: inside a Modal this view already owns
   * the whole screen, and absolute offsets are what tied the old overlay to the
   * scrolling content instead of the viewport.
   */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  dialogTitle: { fontSize: 15, fontFamily: Fonts.display[700] },
  dialogBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  dialogError: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[600], color: '#b91c1c' },
  dialogActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  dialogCancel: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  dialogCancelText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  dialogDelete: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  dialogDeleteText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
  },
});
