import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Search, Sparkles, Store, Trash2 } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
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
} from '../data/promotionsApi';

/**
 * Seller Promotions hub — the phone version of `web/src/pages/Promotions.tsx`.
 *
 * Same two halves: the live runs the seller is managing, then the active
 * listings that could be promoted. Tapping either opens the studio, which is
 * where money actually changes hands.
 *
 * The web keeps its search and page in the URL; a phone has no address bar, so
 * search is component state and the listing fetch asks for the server's cap
 * rather than paging. A seller past that cap needs real pagination, which this
 * doesn't do yet — the same limitation `MyListingsScreen` carries.
 */

function formatMoney(amount: number) {
  return `GH₵ ${amount.toLocaleString('en-GH', {
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

const STATUS_STYLE: Record<PromotionStatus, { bg: string; text: string }> = {
  active: { bg: '#dcfce7', text: '#166534' },
  paused: { bg: '#fef3c7', text: '#92400e' },
  expired: { bg: '#e5e7eb', text: '#374151' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

export function PromotionsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');

  /*
    The receipt for a purchase made in the studio, which replaces itself with
    this screen once the spotlight is bought. Copied into state on arrival and
    then cleared on a timer, so it reads as a confirmation rather than as a
    permanent banner. The web strips it from history for the same reason; a
    param on a `replace` navigation is already unreachable by Back.
  */
  const { notice: noticeParam } = useLocalSearchParams<{ notice?: string }>();
  const [notice, setNotice] = useState<string | null>(noticeParam ?? null);
  useEffect(() => {
    if (!noticeParam) return;
    setNotice(noticeParam);
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [noticeParam]);

  const listingsQuery = useMyListings();
  /*
    Seller-wide, not page-scoped: a promotion on any listing belongs in this
    list. Narrowed to live runs server-side so a long history of finished ones
    can't fill the screen and hide the campaigns being managed.
  */
  const promotionsQuery = useMyPromotions('status=live&limit=50');
  const metricsQuery = usePromotionMetrics();
  const metrics = metricsQuery.data;

  const pause = usePausePromotion();
  const resume = useResumePromotion();
  const cancel = useCancelPromotion();
  const busy = pause.isPending || resume.isPending || cancel.isPending;
  const actionError = pause.error ?? resume.error ?? cancel.error;

  const normalized = search.trim().toLowerCase();
  const matches = (haystack: (string | null | undefined)[]) =>
    !normalized || haystack.filter(Boolean).join(' ').toLowerCase().includes(normalized);

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

  const loading = listingsQuery.isLoading || promotionsQuery.isLoading;
  const refreshing = listingsQuery.isFetching || promotionsQuery.isFetching;

  const refresh = () => {
    void listingsQuery.refetch();
    void promotionsQuery.refetch();
    void metricsQuery.refetch();
  };

  const statCard = (label: string, value: string, tint?: string) => (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tint ?? theme.text }]}>{value}</Text>
    </View>
  );

  const promotionCard = (promotion: Promotion) => {
    const tone = STATUS_STYLE[promotion.status];
    return (
      <View
        key={promotion.id}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <Pressable
          onPress={() => router.push(`/promotions/${promotion.listingId}`)}
          accessibilityRole="button"
          style={styles.cardHead}
        >
          <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
            {promotion.listingImage ? (
              <Image
                source={{ uri: promotion.listingImage }}
                style={styles.thumbImage}
                contentFit="cover"
              />
            ) : (
              <Store size={20} color={theme.textTertiary} />
            )}
          </View>
          <View style={styles.cardHeadBody}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              {promotion.listingTitle}
            </Text>
            <View style={[styles.pill, { backgroundColor: tone.bg }]}>
              <Text style={[styles.pillText, { color: tone.text }]}>
                {promotion.status === 'active'
                  ? 'Live & Promoted'
                  : getPromotionStatusLabel(promotion.status)}
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
              {promotion.category} · boost {promotion.priority} · paid{' '}
              {formatMoney(promotion.amount)}
              {promotion.endsAt ? ` · ends ${formatDate(promotion.endsAt)}` : ''}
            </Text>
            <Text style={[styles.planTag, { color: theme.primary }]}>
              Plan: {promotion.planLabel}
            </Text>
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => router.push(`/promotions/${promotion.listingId}`)}
            accessibilityRole="button"
            style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          >
            <Sparkles size={13} color="#ffffff" />
            <Text style={[styles.actionText, { color: '#ffffff' }]}>Studio</Text>
          </Pressable>

          {promotion.status === 'active' ? (
            <Pressable
              onPress={() => pause.mutate(promotion.id)}
              disabled={busy}
              accessibilityRole="button"
              style={[
                styles.actionBtn,
                { borderColor: theme.border, opacity: busy ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.actionText, { color: theme.text }]}>Pause</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => resume.mutate(promotion.id)}
              disabled={busy || promotion.status !== 'paused'}
              accessibilityRole="button"
              style={[
                styles.actionBtn,
                { borderColor: theme.border, opacity: busy || promotion.status !== 'paused' ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.actionText, { color: theme.text }]}>Resume</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => cancel.mutate(promotion.id)}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.actionBtn, { borderColor: '#fecaca', opacity: busy ? 0.5 : 1 }]}
          >
            <Trash2 size={13} color="#b91c1c" />
            <Text style={[styles.actionText, { color: '#b91c1c' }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/listings'))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to My Listings"
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
          <View style={styles.noticeBox}>
            <Check size={15} color="#166534" />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: theme.primary }]}>
          <View style={styles.heroEyebrow}>
            <Sparkles size={13} color="#ffffff" />
            <Text style={styles.heroEyebrowText}>Seller Promotions Studio</Text>
          </View>
          <Text style={styles.heroTitle}>Boost Your Listing Visibility</Text>
          <Text style={styles.heroBody}>
            Promoted listings stay pinned at the top of search results and category feeds. Boost
            sales with targeted exposure.
          </Text>
        </View>

        {/* Metrics */}
        <View style={styles.statRow}>
          {statCard('Active', String(metrics?.activePromotionCount ?? 0), '#059669')}
          {statCard('Paused', String(metrics?.pausedPromotionCount ?? 0), '#d97706')}
        </View>
        <View style={styles.statRow}>
          {statCard(
            'Finished',
            String((metrics?.expiredPromotionCount ?? 0) + (metrics?.cancelledPromotionCount ?? 0)),
          )}
          {statCard('Total spend', formatMoney(metrics?.totalSpend ?? 0), theme.primary)}
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
          ]}
        >
          <Search size={16} color={theme.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter by title, category or location…"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        {actionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{apiErrorMessage(actionError)}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : promotionsQuery.isError || listingsQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {apiErrorMessage(promotionsQuery.error ?? listingsQuery.error)}
            </Text>
          </View>
        ) : (
          <>
            {shownPromotions.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Active &amp; Managed Promotions ({shownPromotions.length})
                </Text>
                {shownPromotions.map(promotionCard)}
              </>
            ) : null}

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Select a Listing to Promote ({eligibleListings.length})
            </Text>
            <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
              Only active listings can be promoted.
            </Text>

            {eligibleListings.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.border }]}>
                <Store size={30} color={theme.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No available active listings to promote
                </Text>
                <Pressable
                  onPress={() => router.push('/listings/new')}
                  accessibilityRole="button"
                  style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.primaryBtnText}>Create a new listing</Text>
                </Pressable>
              </View>
            ) : (
              eligibleListings.map((listing) => (
                <Pressable
                  key={listing.id}
                  onPress={() => router.push(`/promotions/${listing.id}`)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: pressed ? theme.backgroundSelected : theme.card,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.cardHead}>
                    <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
                      {listing.image ? (
                        <Image
                          source={{ uri: listing.image }}
                          style={styles.thumbImage}
                          contentFit="cover"
                        />
                      ) : (
                        <Store size={20} color={theme.textTertiary} />
                      )}
                    </View>
                    <View style={styles.cardHeadBody}>
                      <Text style={[styles.category, { color: theme.textTertiary }]}>
                        {listing.category}
                      </Text>
                      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={[styles.price, { color: theme.text }]}>
                        {formatMoney(listing.price)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.promoteCta, { backgroundColor: theme.primary }]}>
                    <Sparkles size={13} color="#ffffff" />
                    <Text style={styles.promoteCtaText}>Promote this listing</Text>
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}
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

  hero: { borderRadius: Radius.lg, padding: Spacing.four, gap: 6 },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroEyebrowText: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: { fontSize: 21, fontFamily: Fonts.display[700], color: '#ffffff', letterSpacing: -0.4 },
  heroBody: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans[400], color: 'rgba(255,255,255,0.85)' },

  statRow: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 3 },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontFamily: Fonts.display[700] },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[400], outlineStyle: 'none' } as never,

  sectionTitle: { fontSize: 15, fontFamily: Fonts.display[700], marginTop: Spacing.two },
  sectionHint: { fontSize: 11.5, fontFamily: Fonts.sans[400], marginTop: -Spacing.two },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  cardHead: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  cardHeadBody: { flex: 1, gap: 3, minWidth: 0 },
  category: {
    fontSize: 9.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  cardMeta: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },
  price: { fontSize: 14, fontFamily: Fonts.display[700] },
  planTag: { fontSize: 10.5, fontFamily: Fonts.sans[700] },

  pill: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 9.5, fontFamily: Fonts.sans[700] },

  cardActions: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  actionText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  promoteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: Radius.md,
  },
  promoteCtaText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.six,
  },
  emptyTitle: { fontSize: 13, fontFamily: Fonts.sans[700], textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  loading: { paddingVertical: Spacing.eight, alignItems: 'center' },

  errorBox: {
    borderRadius: Radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.three,
  },
  errorText: { fontSize: 12, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    padding: Spacing.three,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600], color: '#166534' },
});
