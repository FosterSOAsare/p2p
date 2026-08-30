import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Heart,
  Lock,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Star,
  Store,
  Truck,
  UserX,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import { useBlocked } from '@/context/BlockedContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  useListing,
  useReportListing,
  REMOVAL_REASONS,
  type RemovalReason,
} from '@/features/listings/data/listingsApi';

/**
 * Listing detail — the phone version of
 * `web/src/features/marketplace/ui/ProductDetail.tsx`.
 *
 * The web splits into a two-column grid (gallery + specs on the left, pricing
 * and actions on the right); a phone stacks the same blocks in reading order:
 * gallery, title and price, vendor, actions, escrow guarantee, delivery and
 * returns, specs, then reviews.
 *
 * Reads `GET /api/listings/:id`. Saving goes through the server, as does
 * reporting the listing for admin review.
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function ProductDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const listingQuery = useListing(id ?? '');

  /**
   * Adapts the server's listing onto the shape this screen expects.
   *
   * The public page and the seller's own listing row read the *same* record —
   * which is the point of "View public page" in My Listings — so both go
   * through `GET /api/listings/:id`. The only reshaping needed is the seller,
   * which the screen calls `vendor`.
   */
  const product = useMemo(() => {
    const l = listingQuery.data;
    if (!l) return undefined;
    return {
      ...l,
      description: l.description ?? '',
      condition: l.condition ?? '',
      location: l.location ?? '',
      vendor: {
        username: l.seller?.username ?? '',
        storeName: l.seller?.storeName ?? l.seller?.username ?? '',
        verified: Boolean(l.seller?.verified),
      },
      reviews: l.reviews ?? [],
    };
  }, [listingQuery.data]);

  const [slide, setSlide] = useState(0);
  /**
   * Reporting. Whether it *has* been reported comes from the server
   * (`product.reported`), not from local state — the old flag reset on every
   * navigation, so the button forgot and the report was never filed anyway.
   */
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<RemovalReason>('misleading');
  const [reportNote, setReportNote] = useState('');
  const reportListing = useReportListing();
  // Shared with the marketplace hearts and the bookmarks screen.
  const { isSaved, toggleSaved } = useSaved();
  const { isBlocked } = useBlocked();
  const saved = product ? isSaved(product.id) : false;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/marketplace');
  };

  // Gallery width: the screen minus the horizontal gutters on both sides.
  const galleryWidth = Math.min(SCREEN_WIDTH, MaxContentWidth) - Spacing.four * 2;

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setSlide(Math.round(e.nativeEvent.contentOffset.x / galleryWidth));
  };

  const backButton = (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [
        styles.backRow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <ArrowLeft size={20} color={theme.text} />
      <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
    </Pressable>
  );

  /**
   * Loading first, and this ordering is the whole point: without it a perfectly
   * real listing showed "Listing Not Found" for the seconds the fetch takes,
   * then corrected itself. A not-found claim must never be made about data that
   * hasn't arrived.
   */
  if (listingQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <ActivityIndicator color={theme.primary} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /**
   * "Listing Not Found" — the web's exact condition, including the last clause.
   *
   * `status === 'removed'` matters and isn't redundant: the server deliberately
   * still returns a removed listing to its **owner** and to admins, so the
   * seller's own `/listings/:id` can show the takedown reason and the appeal.
   * This is the public shopfront, so it has to be gone here for them too —
   * without that check a seller tapping "View public page" on a removed listing
   * saw it rendered as though it were still on sale.
   *
   * `isError` is the other half: a 404 for everyone else arrives as an error,
   * not as empty data, so checking `!product` alone missed it.
   */
  if (listingQuery.isError || !product || product.status === 'removed') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.notFound, { color: theme.text }]}>Listing Not Found</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {listingQuery.isError && listingQuery.error
                ? apiErrorMessage(listingQuery.error)
                : 'The listing you are looking for may have been sold or removed.'}
            </Text>
            <Pressable
              onPress={() => router.replace('/marketplace')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Browse Marketplace</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /**
   * A blocked vendor's listing shows the block, not the goods — the web's
   * `Vendor Blocked` panel. Reaching this page directly is the one way past
   * the marketplace filter, so the check has to live here too.
   */
  if (isBlocked(product.vendor.username)) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <UserX size={24} color="#e11d48" />
            <Text style={[styles.notFound, { color: theme.text }]}>Vendor Blocked</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              You blocked @{product.vendor.username}. Their listings are hidden from your feed.
            </Text>
            <Pressable
              onPress={() => router.push(`/seller/${product.vendor.username}`)}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Manage block on their profile</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isOwnListing = user?.username === product.vendor.username;
  const reviews = product.reviews ?? [];
  /** Nothing left to buy — the web swaps the buy button for a notice. */
  const outOfStock = product.quantity <= 0;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {backButton}

        {/* Gallery — swipe between photos, dots below, as on the web slider */}
        <View style={[styles.gallery, { backgroundColor: theme.backgroundElement }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onGalleryScroll}
          >
            {product.images.map((img, i) => (
              <Image
                key={i}
                source={img}
                style={{ width: galleryWidth, height: 260 }}
                contentFit="cover"
                transition={250}
              />
            ))}
          </ScrollView>

          {product.images.length > 1 ? (
            <View style={styles.dots}>
              {product.images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === slide ? theme.primary : 'rgba(255,255,255,0.6)' },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Title, badges, price */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                {product.category}
              </Text>
            </View>
            {product.condition ? (
              <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.badgeText, { color: '#1e40af' }]}>{product.condition}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{product.title}</Text>

          <View style={styles.priceBlock}>
            <Text style={[styles.priceLabel, { color: theme.textTertiary }]}>
              Escrow Purchase Price
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>
              {formatMoney(product.price, product.currency)}
            </Text>
          </View>

          {/* Vendor card */}
          <Pressable
            onPress={() => router.push(`/seller/${product.vendor.username}`)}
            style={({ pressed }) => [
              styles.vendorCard,
              {
                backgroundColor: theme.inputBackground,
                borderColor: pressed ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.vendorAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.vendorAvatarText}>
                {product.vendor.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.vendorInfo}>
              <View style={styles.vendorNameRow}>
                <Text style={[styles.vendorName, { color: theme.text }]} numberOfLines={1}>
                  {product.vendor.storeName || `@${product.vendor.username}`}
                </Text>
                {product.vendor.verified ? <ShieldCheck size={14} color={theme.primary} /> : null}
              </View>
              <Text style={[styles.vendorMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                @{product.vendor.username} · joined {formatDate(product.createdAt)} · view profile →
              </Text>
            </View>
          </Pressable>

          {/* Primary actions */}
          {isOwnListing ? (
            <Pressable
              onPress={() => router.push('/listings')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Store size={18} color={theme.background} />
              {/* The web spells this "This is your listing — Manage in
                  Listings". That sentence needs two lines on a phone, so the
                  button keeps the short label. */}
              <Text style={[styles.primaryBtnText, { color: theme.background }]}>
                Manage in Listings
              </Text>
            </Pressable>
          ) : (
            <>
              {/* Sold out replaces the buy button rather than disabling it —
                  the web's wording, so the seller can still be messaged. */}
              {outOfStock ? (
                <View
                  style={[
                    styles.outOfStock,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.outOfStockTitle, { color: theme.text }]}>Out of stock</Text>
                  <Text style={[styles.body, { color: theme.textSecondary }]}>
                    Every unit has sold. Message the seller to ask whether they&apos;re restocking,
                    or save the listing to check back later.
                  </Text>
                </View>
              ) : (
                <Pressable
                  // Same query param the web uses: /checkout?listing=<id>
                  onPress={() => router.push(`/checkout?listing=${product.id}`)}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Lock size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Buy Now (Fund Escrow)</Text>
                </Pressable>
              )}

              <View style={styles.secondaryRow}>
                <Pressable
                  // Same shape as the web: the thread carries a `redirect` so
                  // its Back returns to this listing. (The web also falls back
                  // to /login when signed out; here the (app) group is guarded,
                  // so this screen is only reachable signed in.)
                  onPress={() =>
                    router.push(
                      `/messages/${product.vendor.username}?redirect=/marketplace/${product.id}`,
                    )
                  }
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: pressed ? theme.backgroundSelected : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <MessageCircle size={15} color={theme.text} />
                  <Text style={[styles.secondaryText, { color: theme.text }]}>Message Vendor</Text>
                </Pressable>

                <Pressable
                  onPress={() => toggleSaved(product.id)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: saved ? '#fff1f2' : pressed ? theme.backgroundSelected : theme.card,
                      borderColor: saved ? '#fecdd3' : theme.border,
                    },
                  ]}
                >
                  <Heart
                    size={15}
                    color={saved ? '#e11d48' : theme.text}
                    fill={saved ? '#e11d48' : 'transparent'}
                  />
                  <Text style={[styles.secondaryText, { color: saved ? '#e11d48' : theme.text }]}>
                    {saved ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Escrow guarantee */}
          <View style={[styles.guarantee, { backgroundColor: theme.primaryLight }]}>
            <View style={styles.guaranteeHead}>
              <CheckCircle2 size={16} color={theme.primary} />
              <Text style={[styles.guaranteeTitle, { color: theme.primary }]}>
                Escrow Guarantee &amp; Protection
              </Text>
            </View>
            <Text style={[styles.guaranteeBody, { color: theme.primary }]}>
              Your {product.currency} payment stays locked in escrow. The seller is only paid after
              you confirm delivery and inspect the item.
            </Text>
          </View>

          {/* Delivery & returns */}
          <View style={[styles.policyBlock, { borderTopColor: theme.border }]}>
            <View style={styles.policyRow}>
              <Truck size={16} color={theme.textTertiary} />
              <View style={styles.policyText}>
                <Text style={[styles.policyTitle, { color: theme.text }]}>Location &amp; Delivery</Text>
                <Text style={[styles.policyBody, { color: theme.textSecondary }]}>
                  {product.location ?? 'Delivery arranged with the seller after escrow funding.'}
                </Text>
              </View>
            </View>
            <View style={styles.policyRow}>
              <RotateCcw size={16} color={theme.textTertiary} />
              <View style={styles.policyText}>
                <Text style={[styles.policyTitle, { color: theme.text }]}>
                  Return &amp; Inspection Policy
                </Text>
                <Text style={[styles.policyBody, { color: theme.textSecondary }]}>
                  Inspection window before release, with full escrow refund protection if the item
                  isn&apos;t as described.
                </Text>
              </View>
            </View>
          </View>

          {/* Report / block — neither means anything on your own listing, so
              the whole row goes for the owner, exactly as the web does it.
              This screen is where "View public page" lands a seller, so
              without the gate they were offered the chance to report
              themselves and block their own store. */}
          {!isOwnListing ? (
            <View style={[styles.reportRow, { borderTopColor: theme.border }]}>
              <Pressable
                onPress={() => setReportOpen((v) => !v)}
                // `product.reported` is the server's answer, so it survives a
                // reload and can't be faked by local state as it used to be.
                disabled={product.reported}
                hitSlop={8}
                style={styles.reportBtn}
              >
                <Flag size={13} color={product.reported ? '#059669' : theme.textTertiary} />
                <Text
                  style={[
                    styles.reportText,
                    { color: product.reported ? '#059669' : theme.textTertiary },
                  ]}
                >
                  {product.reported ? 'Listing Reported' : 'Report Listing'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/seller/${product.vendor.username}`)}
                hitSlop={8}
                style={styles.reportBtn}
              >
                <UserX size={13} color={theme.textTertiary} />
                <Text style={[styles.reportText, { color: theme.textTertiary }]}>Block Vendor</Text>
              </Pressable>
            </View>
          ) : null}

          {/**
           * The report form, expanded in place.
           *
           * A reason is required by the server, so it can't be a one-tap action
           * — which is what the old button pretended to be, flipping its own
           * label and filing nothing.
           */}
          {!isOwnListing && reportOpen && !product.reported ? (
            <View style={[styles.reportForm, { borderColor: theme.border }]}>
              <Text style={[styles.reportFormHead, { color: theme.textSecondary }]}>
                Why are you reporting this listing?
              </Text>

              {REMOVAL_REASONS.map((r) => {
                const on = reportReason === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setReportReason(r.id)}
                    style={[
                      styles.reasonRow,
                      {
                        backgroundColor: on ? theme.primaryLight : theme.inputBackground,
                        borderColor: on ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        { color: on ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {r.label}
                    </Text>
                    {on ? <CheckCircle2 size={15} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}

              {/* The server demands at least 3 characters on "Other" — a bare
                  "Other" tells a moderator nothing. Optional otherwise. */}
              <TextInput
                value={reportNote}
                onChangeText={setReportNote}
                placeholder={
                  reportReason === 'other'
                    ? 'Tell us what’s wrong (required)'
                    : 'Anything else we should know? (optional)'
                }
                placeholderTextColor={theme.textTertiary}
                maxLength={500}
                multiline
                textAlignVertical="top"
                style={[
                  styles.reportNote,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
              />

              {reportListing.isError ? (
                <Text style={styles.reportError}>{apiErrorMessage(reportListing.error)}</Text>
              ) : null}

              <View style={styles.reportActions}>
                <Pressable
                  onPress={() => setReportOpen(false)}
                  style={[styles.reportCancel, { borderColor: theme.border }]}
                >
                  <Text style={[styles.reportCancelText, { color: theme.textSecondary }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    reportListing.mutate(
                      {
                        id: product.id,
                        reason: reportReason,
                        note: reportNote.trim() || undefined,
                      },
                      { onSuccess: () => setReportOpen(false) },
                    )
                  }
                  disabled={
                    reportListing.isPending ||
                    (reportReason === 'other' && reportNote.trim().length < 3)
                  }
                  style={({ pressed }) => [
                    styles.reportSubmit,
                    {
                      opacity:
                        reportListing.isPending ||
                        (reportReason === 'other' && reportNote.trim().length < 3)
                          ? 0.5
                          : pressed
                            ? 0.85
                            : 1,
                    },
                  ]}
                >
                  {reportListing.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Flag size={14} color="#ffffff" />
                  )}
                  <Text style={styles.reportSubmitText}>Submit Report</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* Specs */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Product Overview &amp; Specifications
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{product.description}</Text>

          <View style={[styles.specGrid, { borderTopColor: theme.border }]}>
            {[
              { label: 'Category', value: product.category },
              { label: 'Condition', value: product.condition || 'New' },
              { label: 'Stock Available', value: `${product.quantity} units` },
            ].map((spec) => (
              <View
                key={spec.label}
                style={[styles.spec, { backgroundColor: theme.inputBackground }]}
              >
                <Text style={[styles.specLabel, { color: theme.textTertiary }]}>{spec.label}</Text>
                <Text style={[styles.specValue, { color: theme.text }]}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Buyer Reviews &amp; Ratings
          </Text>

          {reviews.length === 0 ? (
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              No reviews for this listing yet.
            </Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={[styles.review, { borderTopColor: theme.border }]}>
                <View style={styles.reviewHead}>
                  <Text style={[styles.reviewer, { color: theme.text }]}>@{review.author?.username ?? "buyer"}</Text>
                  <View style={styles.stars}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={12}
                        color="#f59e0b"
                        fill={i < review.rating ? '#f59e0b' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.reviewBody, { color: theme.textSecondary }]}>
                  {review.comment}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans[700] },

  gallery: { borderRadius: Radius.lg, overflow: 'hidden' },
  dots: {
    position: 'absolute',
    bottom: Spacing.three,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { height: 6, width: 6, borderRadius: Radius.full },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },

  badgeRow: { flexDirection: 'row', gap: Spacing.two },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },

  // Heading uses the web's `font-display`.
  title: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4, lineHeight: 26 },
  priceBlock: { gap: 2 },
  priceLabel: { fontSize: 11, fontFamily: Fonts.sans[500] },
  price: { fontSize: 26, fontFamily: Fonts.display[700], letterSpacing: -0.5 },

  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  vendorAvatar: {
    height: 40,
    width: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarText: { fontSize: 15, fontFamily: Fonts.sans[700], color: '#ffffff' },
  vendorInfo: { flex: 1, gap: 2 },
  vendorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vendorName: { flexShrink: 1, fontSize: 13, fontFamily: Fonts.sans[700] },
  vendorMeta: { fontSize: 10.5, fontFamily: Fonts.sans[400] },

  outOfStock: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
  },
  outOfStockTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 14, fontFamily: Fonts.sans[700], color: '#ffffff' },
  secondaryRow: { flexDirection: 'row', gap: Spacing.two },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  secondaryText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  guarantee: { borderRadius: Radius.md, padding: Spacing.three, gap: 5 },
  guaranteeHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guaranteeTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  guaranteeBody: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },

  policyBlock: { borderTopWidth: 1, paddingTop: Spacing.three, gap: Spacing.three },
  policyRow: { flexDirection: 'row', gap: Spacing.two },
  policyText: { flex: 1, gap: 2 },
  policyTitle: { fontSize: 12, fontFamily: Fonts.sans[700] },
  policyBody: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[400] },

  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },

  reportForm: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  reportFormHead: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  reasonText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans[600] },
  reportNote: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    minHeight: 64,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  reportError: {
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: Fonts.sans[600],
    color: '#b91c1c',
  },
  reportActions: { flexDirection: 'row', gap: Spacing.two, marginTop: 2 },
  reportCancel: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  reportCancelText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  reportSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  reportSubmitText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
  },
  reportText: { fontSize: 11, fontFamily: Fonts.sans[600] },

  sectionTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  notFound: { fontSize: 17, fontFamily: Fonts.display[700] },

  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  spec: { flexGrow: 1, flexBasis: '30%', borderRadius: Radius.md, padding: Spacing.three, gap: 2 },
  specLabel: { fontSize: 10, fontFamily: Fonts.sans[500] },
  specValue: { fontSize: 12, fontFamily: Fonts.sans[700] },

  review: { borderTopWidth: 1, paddingTop: Spacing.three, gap: 4 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewer: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  stars: { flexDirection: 'row', gap: 2 },
  reviewBody: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
});
