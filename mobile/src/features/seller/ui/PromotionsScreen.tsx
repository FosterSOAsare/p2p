import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  ArrowLeft,
  BadgeDollarSign,
  Check,
  PauseCircle,
  PlayCircle,
  Search,
  Sparkles,
  Store,
  Trash2,
  Zap,
} from '@/components/icons';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';
import { useMyListings } from '@/features/listings/data/listingsApi';
import {
  getPromotionStatusLabel,
  useCancelPromotion,
  useMyPromotions,
  usePausePromotion,
  usePromotionMetrics,
  useResumePromotion,
  type Promotion,
  type PromotionStatus,
} from '../data/promotions';

/**
 * Promotions hub — the phone version of `web/src/pages/Promotions.tsx`.
 *
 * Same two sections in the same order: the live runs being managed, then the
 * active listings still available to promote. Copy is the web's.
 *
 * Two deliberate differences. The web pages its listings server-side and keeps
 * the page and the search in the URL; the phone fetches the catalogue once
 * (capped at 48, as everywhere else here) and filters in memory, so there is no
 * pager and the search box is component state — the same call `MyListingsScreen`
 * already makes. And the web's post-purchase receipt rides on navigation state,
 * which Expo Router has no equivalent of, so the studio hands it back as a
 * `notice` param instead.
 */

/** The API returns an ISO currency code; the UI shows the symbol. */
function formatMoney(amount: number, currency = 'GHS') {
  const symbol = currency === 'GHS' ? 'GH₵' : currency;
  return `${symbol} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(status: PromotionStatus) {
  if (status === 'active') return { label: 'Live & Promoted', bg: '#dcfce7', text: '#166534' };
  if (status === 'paused') return { label: 'Paused', bg: '#fef3c7', text: '#92400e' };
  if (status === 'expired') return { label: 'Expired', bg: '#e5e7eb', text: '#374151' };
  return { label: getPromotionStatusLabel(status), bg: '#fee2e2', text: '#991b1b' };
}

export function PromotionsScreen() {
  const theme = useTheme();
  const tones = useTones();
  const router = useRouter();

  /*
    The receipt for a purchase made in the studio, which routes back here once
    the spotlight is bought. Read once into state and then stripped from the
    URL, so a re-render — or a trip forward and back — doesn't replay a stale
    one. This is the phone's stand-in for the web's navigation state.
  */
  const { notice: noticeParam } = useLocalSearchParams<{ notice?: string }>();
  const [notice, setNotice] = useState<string | null>(noticeParam ?? null);
  useEffect(() => {
    if (!noticeParam) return;
    setNotice(noticeParam);
    router.setParams({ notice: undefined });
  }, [noticeParam, router]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const [search, setSearch] = useState('');

  const listingsQuery = useMyListings();
  // Seller-wide, not page-scoped: a promotion on any listing belongs in this
  // list. Narrowed to live runs server-side so a long history of finished ones
  // can't fill the screen and hide the campaigns being managed.
  const promotionsQuery = useMyPromotions('status=live&limit=50');
  const { data: metrics } = usePromotionMetrics();

  const pause = usePausePromotion();
  const resume = useResumePromotion();
  const cancel = useCancelPromotion();
  /**
   * Which promotion each action is currently working on.
   *
   * These used to share one `busy` flag, so pausing a run greyed out Resume
   * and Cancel beside it — and the same three buttons on every other card,
   * since the mutations are shared across the list. The three actions are
   * independent, so each one now only disables itself, and only on the card
   * that was actually tapped.
   *
   * `variables` is the id handed to `mutate`, which react-query holds for as
   * long as that mutation is in flight.
   */
  const pausingId = pause.isPending ? pause.variables : undefined;
  const resumingId = resume.isPending ? resume.variables : undefined;
  const cancellingId = cancel.isPending ? cancel.variables : undefined;

  const normalizedSearch = search.trim().toLowerCase();
  const matches = (haystack: (string | null | undefined)[]) =>
    !normalizedSearch || haystack.filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);

  const allPromotions = promotionsQuery.data?.promotions ?? [];
  // A cancelled/expired run stays in history but shouldn't crowd the managed list.
  const livePromotions = allPromotions.filter(
    (p) => p.status === 'active' || p.status === 'paused',
  );
  const shownPromotions = livePromotions.filter((p) =>
    matches([p.listingTitle, p.category, p.planLabel]),
  );

  const promotedListingIds = useMemo(
    () => new Set(livePromotions.map((p) => p.listingId)),
    [livePromotions],
  );

  const eligibleListings = (listingsQuery.data?.listings ?? []).filter(
    (listing) =>
      listing.status === 'active' &&
      !promotedListingIds.has(listing.id) &&
      matches([listing.title, listing.category, listing.description, listing.short, listing.location]),
  );

  const totalActiveListings = listingsQuery.data?.total ?? 0;

  const openStudio = (listingId: string) => router.push(`/promotions/${listingId}`);

  const metricTile = (label: string, value: string, color: string) => (
    <View style={styles.metric} key={label}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );

  const renderPromotion = (promotion: Promotion) => {
    const badge = statusBadge(promotion.status);

    return (
      <View
        key={promotion.id}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <View style={styles.cardTop}>
          {promotion.listingImage ? (
            <Image source={promotion.listingImage} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.backgroundElement }]}>
              <Store size={20} color={theme.textTertiary} />
            </View>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Pressable onPress={() => openStudio(promotion.listingId)} hitSlop={4} style={styles.titlePress}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {promotion.listingTitle}
                </Text>
              </Pressable>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>

            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {promotion.category} · boost {promotion.priority} · paid {formatMoney(promotion.amount)}
              {promotion.endsAt ? ` · ends ${formatDate(promotion.endsAt)}` : ''}
            </Text>

            <View style={[styles.planPill, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
              <Text style={[styles.planPillText, { color: theme.primary }]}>
                Plan: {promotion.planLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => openStudio(promotion.listingId)}
            style={({ pressed }) => [
              styles.studioBtn,
              { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <BadgeDollarSign size={14} color={theme.background} />
            <Text style={[styles.studioBtnText, { color: theme.background }]}>Studio</Text>
          </Pressable>

          <Pressable
            onPress={() => pause.mutate(promotion.id)}
            disabled={pausingId === promotion.id || promotion.status !== 'active'}
            accessibilityRole="button"
            accessibilityLabel="Pause promotion"
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: theme.border,
                backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                opacity:
                  pausingId === promotion.id || promotion.status !== 'active' ? 0.4 : 1,
              },
            ]}
          >
            <PauseCircle size={16} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => resume.mutate(promotion.id)}
            disabled={resumingId === promotion.id || promotion.status !== 'paused'}
            accessibilityRole="button"
            accessibilityLabel="Resume promotion"
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: theme.border,
                backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                opacity:
                  resumingId === promotion.id || promotion.status !== 'paused' ? 0.4 : 1,
              },
            ]}
          >
            <PlayCircle size={16} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => cancel.mutate(promotion.id)}
            disabled={cancellingId === promotion.id || promotion.status === 'cancelled'}
            accessibilityRole="button"
            accessibilityLabel="Cancel promotion"
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: tones.danger.border,
                backgroundColor: pressed ? tones.danger.surface : 'transparent',
                opacity:
                  cancellingId === promotion.id || promotion.status === 'cancelled' ? 0.4 : 1,
              },
            ]}
          >
            <Trash2 size={16} color={tones.danger.icon} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      {/* `handled` so a tap on Studio, or on a listing to promote, lands while
          the filter box is focused — otherwise the first tap only dismisses
          the keyboard and the button appears not to work. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        /* The web's "Refresh promotion status" button. A run expires on the
           server's clock, so the hub has to be re-askable without a full
           remount; pull-to-refresh is how a phone offers that. Both queries
           go, since a promotion ending frees its listing to be promoted
           again. */
        refreshControl={
          <RefreshControl
            refreshing={promotionsQuery.isFetching || listingsQuery.isFetching}
            onRefresh={() => {
              void promotionsQuery.refetch();
              void listingsQuery.refetch();
            }}
            tintColor={theme.textTertiary}
          />
        }
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/listings'))}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backRow,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <ArrowLeft size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back to My Listings</Text>
        </Pressable>

        {notice ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: tones.success.chip, borderColor: tones.success.border },
            ]}
          >
            <Check size={16} color={tones.success.text} />
            <Text style={[styles.noticeText, { color: tones.success.text }]}>{notice}</Text>
          </View>
        ) : null}

        {/* Hero. The web runs a slate→primary gradient here; RN has no gradient
            without another dependency, so this is the darkest stop flat — the
            same call the splash screen makes. */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Sparkles size={13} color="#86efac" />
            <Text style={styles.heroBadgeText}>SELLER PROMOTIONS STUDIO</Text>
          </View>
          <Text style={styles.heroTitle}>Boost Your Listing Visibility</Text>
          <Text style={styles.heroBody}>
            Promoted listings stay pinned at the top of search results and category feeds. Boost
            sales with targeted exposure.
          </Text>

          <View style={styles.metrics}>
            {metricTile('ACTIVE PROMOTIONS', String(metrics?.activePromotionCount ?? 0), '#4ade80')}
            {metricTile('PAUSED PROMOTIONS', String(metrics?.pausedPromotionCount ?? 0), '#fcd34d')}
            {metricTile(
              'FINISHED RUNS',
              String((metrics?.expiredPromotionCount ?? 0) + (metrics?.cancelledPromotionCount ?? 0)),
              '#ffffff',
            )}
            {metricTile('AVERAGE PRIORITY', `${metrics?.averagePriority ?? 0} pts`, '#ffffff')}
            {metricTile('TOTAL SPEND', formatMoney(metrics?.totalSpend ?? 0), '#86efac')}
          </View>
        </View>

        {/* Filter */}
        <View style={[styles.searchBox, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
          <Search size={15} color={theme.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter by title, category, description, or location…"
            placeholderTextColor={theme.textTertiary}
            style={[styles.searchInput, { color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={[styles.clear, { color: theme.primary }]}>Clear</Text>
            </Pressable>
          ) : (
            <Text style={[styles.count, { color: theme.textSecondary }]}>
              {totalActiveListings} listings
            </Text>
          )}
        </View>

        {/*
          Each section waits only on its own request. They used to share one
          gate, so the whole screen sat behind a spinner until the slowest of
          three round trips landed — against this database that is seconds of
          blank screen even when the promotions themselves are already cached.
        */}
        {promotionsQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : null}

        {shownPromotions.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Zap size={18} color="#f59e0b" />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Active &amp; Managed Promotions ({shownPromotions.length})
                  </Text>
                </View>
                {shownPromotions.map(renderPromotion)}
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Store size={18} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Select a Listing to Promote ({eligibleListings.length})
                </Text>
              </View>
              <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
                Only active listings can be promoted.
              </Text>

              {listingsQuery.isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : eligibleListings.length === 0 ? (
                <View style={[styles.empty, { borderColor: theme.border }]}>
                  <Store size={32} color={theme.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    No available active listings to promote
                  </Text>
                  <Pressable
                    onPress={() => router.push('/listings/new')}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>Create a new listing</Text>
                  </Pressable>
                </View>
              ) : (
                eligibleListings.map((listing) => (
                  <View
                    key={listing.id}
                    style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  >
                    <View style={styles.cardTop}>
                      {listing.image ? (
                        <Image source={listing.image} style={styles.thumb} contentFit="cover" />
                      ) : (
                        <View
                          style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.backgroundElement }]}
                        >
                          <Store size={20} color={theme.textTertiary} />
                        </View>
                      )}
                      <View style={styles.cardInfo}>
                        <Text style={[styles.category, { color: theme.textTertiary }]}>
                          {listing.category.toUpperCase()}
                        </Text>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {listing.title}
                        </Text>
                        <Text style={[styles.price, { color: theme.text }]}>
                          {formatMoney(listing.price, listing.currency)}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => openStudio(listing.id)}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <BadgeDollarSign size={14} color="#ffffff" />
                      <Text style={styles.primaryBtnText}>Promote this listing</Text>
                    </Pressable>
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
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans[600] },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600] },

  hero: {
    gap: Spacing.two,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    backgroundColor: '#0f172a',
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  heroBadgeText: { fontSize: 10.5, letterSpacing: 0.8, color: '#86efac', fontFamily: Fonts.sans[700] },
  heroTitle: { fontSize: 24, lineHeight: 30, color: '#ffffff', fontFamily: Fonts.display[700] },
  heroBody: { fontSize: 12.5, lineHeight: 19, color: '#cbd5e1', fontFamily: Fonts.sans[400] },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.two },
  metric: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
  },
  metricLabel: { fontSize: 9.5, letterSpacing: 0.6, color: '#cbd5e1', fontFamily: Fonts.sans[700] },
  metricValue: { fontSize: 19, fontFamily: Fonts.display[700] },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.three, fontSize: 13, fontFamily: Fonts.sans[400] },
  clear: { fontSize: 12, fontFamily: Fonts.sans[700] },
  count: { fontSize: 11.5, fontFamily: Fonts.sans[600] },

  loading: { paddingVertical: Spacing.eight, alignItems: 'center' },

  section: { gap: Spacing.three },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { flex: 1, fontSize: 16, fontFamily: Fonts.display[700] },
  sectionHint: { fontSize: 11.5, fontFamily: Fonts.sans[400], marginTop: -Spacing.two },

  card: { gap: Spacing.three, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four },
  cardTop: { flexDirection: 'row', gap: Spacing.three },
  thumb: { height: 56, width: 56, borderRadius: Radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titlePress: { flex: 1 },
  cardTitle: { fontSize: 13.5, fontFamily: Fonts.display[700] },
  category: { fontSize: 9.5, letterSpacing: 0.6, fontFamily: Fonts.sans[700] },
  price: { fontSize: 15, fontFamily: Fonts.display[700] },
  meta: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  badgeText: { fontSize: 9.5, fontFamily: Fonts.sans[700] },
  planPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  planPillText: { fontSize: 10, fontFamily: Fonts.sans[700] },

  /*
    One row, no wrap. Four labelled buttons don't fit a phone — Studio keeps its
    label and takes the slack, the three run actions are icon-only at 44pt, the
    same treatment (and the same minimum touch target) as the My Listings row.
  */
  /*
    Four equal quarters. Studio used to take all the slack while the three run
    actions were fixed 44pt squares, which made it several times their width
    and read as the only real button in the row.
  */
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  studioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
  },
  // Shrinks rather than pushing the button wider than its three siblings.
  studioBtnText: { flexShrink: 1, fontSize: 12, fontFamily: Fonts.sans[700] },

  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.six,
  },
  emptyTitle: { fontSize: 13.5, textAlign: 'center', fontFamily: Fonts.sans[700] },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  primaryBtnText: { fontSize: 12.5, color: '#ffffff', fontFamily: Fonts.sans[700] },
});
