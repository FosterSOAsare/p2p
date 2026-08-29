import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, Search, ShieldCheck, Store, X } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import { SkeletonCard } from '@/features/shared/ui/Skeleton';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import { useBlocked } from '@/context/BlockedContext';
import { usePersona } from '@/hooks/use-persona';
import { type ImageRef } from '@/constants/mockData';
import {
  useCategories,
  useMarketplaceListings,
  type MarketplaceListing,
} from '@/features/listings/data/listingsApi';

/**
 * Marketplace tab — the phone version of `web/src/features/marketplace/ui/
 * Products.tsx`.
 *
 * Same building blocks in the same order: header banner, search, sort control,
 * category strip, active-filter chips, results count, listing cards, empty
 * state. The web lays cards out in a 4-column grid; a phone gets 2 columns.
 *
 * Reads `GET /api/listings` for the catalogue and `GET /api/categories` for the
 * filter strip. The web keeps filters in the URL query; here they're component
 * state, since a phone has no address bar.
 */

const SORTS = [
  { key: 'featured', label: 'Featured' },
  { key: 'newest', label: 'Newest' },
  // The web spells these out; arrows were a mobile shorthand that lost meaning.
  { key: 'price_asc', label: 'Price Low to High' },
  { key: 'price_desc', label: 'Price High to Low' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

/** Product thumbnail. `recyclingKey` stops FlatList reusing a stale image. */
function ProductImage({ uri, recyclingKey }: { uri?: ImageRef; recyclingKey: string }) {
  const theme = useTheme();

  if (!uri) {
    return (
      <View style={styles.noImage}>
        <Text style={[styles.noImageText, { color: theme.textTertiary }]}>No image</Text>
      </View>
    );
  }

  return (
    <Image
      source={uri}
      style={styles.image}
      contentFit="cover"
      transition={250}
      recyclingKey={recyclingKey}
    />
  );
}

/** GH₵ 12,500.00 — matches the web's formatMoney output. */
function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MarketplaceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  // Mirrors the web's `isBuyer = !me || (!isAdmin && !isSeller)`. Saving is a
  // buyer-only action, so sellers and admins browse without it.
  const isBuyer = usePersona() === 'buyer';
  // Needed to tell your own listings apart from everyone else's.
  const { user } = useAuth();
  const { isBlocked } = useBlocked();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<SortKey>('featured');
  // Shared with the listing page, bookmarks and the dashboard tile.
  const { isSaved, toggleSaved } = useSaved();

  /**
   * The server's categories, not a hardcoded copy. Filtering by a name the
   * server has never heard of returns nothing, which reads as an empty
   * marketplace rather than as a stale filter list.
   */
  const categoriesQuery = useCategories();
  const categoryNames = useMemo(
    () => ['All', ...(categoriesQuery.data ?? []).map((c) => c.name)],
    [categoriesQuery.data],
  );

  /**
   * The real catalogue. Its ids are the server's, so tapping a card and opening
   * `/marketplace/:id` resolves the very listing that was tapped — with mock
   * data those ids existed nowhere and the detail screen found nothing.
   *
   * Fetched once and filtered in memory: search and category could go to the
   * server, but every keystroke would then cost a round trip of several
   * seconds. The catalogue is small and capped, so this stays responsive.
   */
  const listingsQuery = useMarketplaceListings();

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Active listings, minus vendors you've blocked — the web's
    // `!blockedSellers.has(p.sellerUsername)` filter. This is the one thing
    // that makes two shoppers' marketplaces differ; the catalogue itself is
    // identical for buyers and sellers.
    // No status check: `GET /api/listings` already returns only live listings
    // and sends no `status` field, so filtering on one matched nothing and
    // emptied the marketplace. Blocked sellers are still filtered — the web's
    // `!blockedSellers.has(p.sellerUsername)`.
    let list = (listingsQuery.data?.listings ?? []).filter(
      (p) => !isBlocked(p.sellerUsername),
    );

    if (category !== 'All') list = list.filter((p) => p.category === category);
    if (q) {
      // Web searches title, seller and keyword — same three here. `short` is
      // the server's summary line, standing in for the mock's description.
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.short ?? '').toLowerCase().includes(q) ||
          p.sellerUsername.toLowerCase().includes(q.replace(/^@/, '')),
      );
    }

    const sorted = [...list];
    if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') {
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return sorted;
  }, [search, category, sort, isBlocked, listingsQuery.data]);

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setSort('featured');
  };

  const hasFilters = category !== 'All' || search.trim().length > 0;

  /**
   * Pads an odd result count with one invisible cell.
   *
   * With `numColumns={2}` a lone card in the last row has no sibling to share
   * the width with, and `flex: 1` makes it span the whole row — so it appears
   * double-width whenever the count is odd. A spacer gives it a partner to
   * split against, keeping every card identical.
   */
  const SPACER = '__spacer__';
  const grid = useMemo(
    () =>
      results.length % 2 === 1
        ? [...results, { id: SPACER } as MarketplaceListing]
        : results,
    [results],
  );

  const renderCard = ({ item }: { item: MarketplaceListing }) => {
    // The padding cell: occupies a column, draws nothing.
    if (item.id === SPACER) {
      return <View style={styles.spacerCard} />;
    }

    const saved = isSaved(item.id);
    const isOwnListing = Boolean(user && item.sellerUsername === user.username);

    /**
     * Your own listing opens its **management** page, not its public one —
     * mirroring the web's `isOwnListing ? /listings/:id : /marketplace/:id`.
     *
     * Mobile always opened the public page, which meant a seller tapping their
     * own card landed on the shopfront view with a Buy button and no way to
     * edit — and on a removed listing, on "Listing Not Found", since the public
     * page correctly hides it. The web sends them to the editor instead.
     */
    const openListing = (l: MarketplaceListing) =>
      router.push(isOwnListing ? `/listings/${l.id}` : `/marketplace/${l.id}`);

    return (
      <Pressable
        onPress={() => openListing(item)}
        accessibilityRole="button"
        accessibilityLabel={`${isOwnListing ? 'Manage' : 'View'} ${item.title}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: pressed ? theme.primary : theme.cardBorder,
          },
        ]}
      >
        {/* Image with category pill and save heart, as on the web card */}
        <View style={[styles.imageWrap, { backgroundColor: theme.backgroundElement }]}>
          <ProductImage uri={item.image ?? undefined} recyclingKey={item.id} />

          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.category}</Text>
          </View>

          {/* Saving is a buyer action — the web hides this for sellers/admins */}
          {isBuyer ? (
            <Pressable
              onPress={() => toggleSaved(item.id)}
              hitSlop={8}
              style={[styles.heart, saved && styles.heartOn]}
              accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
            >
              <Heart
                size={13}
                color={saved ? '#ffffff' : theme.textSecondary}
                fill={saved ? '#ffffff' : 'transparent'}
              />
            </Pressable>
          ) : null}
        </View>

        {/* Vendor row */}
        <View style={styles.vendorRow}>
          <View style={styles.vendorName}>
            <Text numberOfLines={1} style={[styles.vendorText, { color: theme.textSecondary }]}>
              @{item.sellerUsername}
            </Text>
            {item.sellerVerified ? <ShieldCheck size={11} color={theme.primary} /> : null}
          </View>
        </View>

        {/* Two lines always, padded when the title is short. Letting this grow
            with the title made cards in the same row stretch to the tallest,
            so the grid changed shape as you moved between categories. */}
        <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        {/* Condition is optional on a listing. Rendering the pill regardless
            put an empty box on some cards and none on others — another source
            of uneven heights. The slot is reserved either way. */}
        <View style={styles.conditionSlot}>
          {item.condition ? (
            <View style={[styles.conditionPill, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.conditionText, { color: theme.textSecondary }]}>
                {item.condition}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer: price + View, split by a rule like the web card */}
        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View style={styles.priceBlock}>
            <Text style={[styles.escrowLabel, { color: theme.textTertiary }]}>In Escrow</Text>
            {/* One line, always. A long amount used to wrap, and the footer is
                pinned to the bottom of a fixed-height card, so the second line
                had nowhere to go and pushed the price and chip out of the
                card. */}
            <Text style={[styles.price, { color: theme.text }]} numberOfLines={1}>
              {formatMoney(item.price, item.currency)}
            </Text>
          </View>
          {/* Its own pressable, like the web's link — the card opens the
              listing too, but this gives the chip a proper tap target. */}
          <Pressable
            onPress={() => openListing(item)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${isOwnListing ? 'Manage' : 'View'} ${item.title}`}
            style={({ pressed }) => [
              styles.viewChip,
              {
                backgroundColor: pressed
                  ? isOwnListing
                    ? '#059669'
                    : theme.primary
                  : isOwnListing
                    ? '#d1fae5'
                    : theme.primaryLight,
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.viewChipText,
                  {
                    color: pressed ? '#ffffff' : isOwnListing ? '#047857' : theme.primary,
                  },
                ]}
              >
                {isOwnListing ? 'Manage' : 'View'}
              </Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={grid}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.four }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Header banner */}
            <View style={styles.eyebrowRow}>
              <Store size={13} color={theme.primary} />
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                Peer-to-Peer Goods &amp; Services
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Marketplace Browse</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Physical items and online-delivered goods — all protected by GH₵ escrow.
            </Text>

            {/* Buyers only, as on the web (`me && isBuyer`) — a seller browsing
                the marketplace gets no Saved shortcut. */}
            {isBuyer ? (
              <Pressable
                onPress={() => router.push('/bookmarks')}
                style={({ pressed }) => [
                  styles.savedBtn,
                  { backgroundColor: pressed ? '#ffe4e6' : '#fff1f2' },
                ]}
              >
                <Heart size={15} color="#be123c" fill="#be123c" />
                <Text style={styles.savedBtnText}>Saved</Text>
              </Pressable>
            ) : null}

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
                placeholder="Search listings by title, seller (@kwame_tech), or keyword..."
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.searchInput, { color: theme.text }]}
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <X size={15} color={theme.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            {/* Sort */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
            >
              {SORTS.map((s) => {
                const on = sort === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setSort(s.key)}
                    style={[
                      styles.sortChip,
                      {
                        backgroundColor: on ? theme.primaryLight : theme.backgroundElement,
                        borderColor: on ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        { color: on ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Category strip — horizontally scrollable, as on the web */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
            >
              {categoryNames.map((cat) => {
                const on = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: on ? theme.text : theme.backgroundElement,
                        borderColor: on ? theme.text : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: on ? theme.background : theme.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Results count + clear */}
            <View style={[styles.countRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                Showing <Text style={{ color: theme.text }}>{results.length}</Text> of{' '}
                <Text style={{ color: theme.text }}>{listingsQuery.data?.total ?? 0}</Text> listings
              </Text>
              {hasFilters ? (
                <Pressable onPress={clearFilters} hitSlop={6}>
                  <Text style={styles.clearText}>Clear all filters</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        /**
         * Three states, not one.
         *
         * This screen previously had neither a loading nor an error branch, so
         * an in-flight fetch and a failed one both rendered "No listings match
         * your search" — telling you your filters were wrong when in fact
         * nothing had arrived yet, and offering a Clear Filters button that
         * couldn't possibly help.
         */
        ListEmptyComponent={
          listingsQuery.isLoading ? (
            <View style={styles.skeletonGrid}>
              <View style={styles.skeletonRow}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
              <View style={styles.skeletonRow}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            </View>
          ) : listingsQuery.isError ? (
            <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
                <Search size={18} color="#e11d48" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Couldn&apos;t load the marketplace
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                {apiErrorMessage(listingsQuery.error)}
              </Text>
              <Pressable
                onPress={() => listingsQuery.refetch()}
                style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.emptyBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
                <Search size={18} color={theme.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No listings match your search
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                Try adjusting your search keywords or clearing category filters.
              </Text>
              <Pressable
                onPress={clearFilters}
                style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.emptyBtnText}>Clear All Filters</Text>
              </Pressable>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  column: { gap: Spacing.three },
  header: { gap: Spacing.three, marginBottom: Spacing.four },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Screen heading — the web's `font-display` (Space Grotesk).
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4, marginTop: -Spacing.two },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },
  savedBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
  },
  savedBtnText: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#be123c' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,

  strip: { gap: Spacing.two, paddingVertical: 2 },
  sortChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipText: { fontSize: 12, fontFamily: Fonts.sans[600] },
  catChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  catChipText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  countText: { fontSize: 12, fontFamily: Fonts.sans[400] },
  clearText: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#e11d48' },

  /** Invisible partner for a lone card, so it keeps a column's width. */
  spacerCard: { flex: 1, height: 268, marginBottom: Spacing.three },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    marginBottom: Spacing.three,
    gap: 5,
    /**
     * Every card is the same size, whatever the category shows.
     *
     * In a two-column FlatList the cards in a row stretch to the tallest, so a
     * short title or a missing condition made the grid change shape as you
     * switched categories. Fixing the height — with the title pinned to two
     * lines and the condition slot always reserved — keeps the grid steady.
     */
    height: 268,
  },
  imageWrap: {
    height: 118,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  // Absolute inset rather than width/height '100%': percentage sizing inside an
  // overflow:hidden box measures as 0 on some Android builds. This mirrors the
  // AuthHero photo, which renders correctly on device.
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noImageText: { fontSize: 11, fontFamily: Fonts.sans[400] },
  categoryPill: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryPillText: { fontSize: 9, fontFamily: Fonts.sans[700], color: '#ffffff' },
  heart: {
    position: 'absolute',
    right: 6,
    top: 6,
    height: 26,
    width: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  heartOn: { backgroundColor: '#f43f5e' },

  vendorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vendorName: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  vendorText: { fontSize: 11, fontFamily: Fonts.sans[500] },
  /** Two lines' worth of height whether or not the title needs both. */
  cardTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700], lineHeight: 17, height: 34 },
  /** Fixed-height slot so a listing without a condition leaves the same gap. */
  conditionSlot: { height: 18, justifyContent: 'center' },
  conditionPill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  conditionText: { fontSize: 10, fontFamily: Fonts.sans[600] },

  cardFooter: {
    // Pinned to the bottom of the fixed-height card, so the price rule sits on
    // the same line across every card rather than wherever the text ended.
    marginTop: 'auto',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  /**
   * `minWidth: 0` is what actually lets this shrink. A flex child won't go
   * narrower than its content without it, so `flexShrink` alone did nothing and
   * the price simply overflowed the card instead of yielding.
   */
  priceBlock: { flexShrink: 1, minWidth: 0 },
  escrowLabel: { fontSize: 9, fontFamily: Fonts.sans[600] },
  // 12, not 13: two columns leave a card ~142pt wide inside its padding, and
  // the extra point was the difference between "GH₵ 1,998,000.00" fitting and
  // being truncated next to the chip.
  price: { fontSize: 12, fontFamily: Fonts.sans[700] },
  viewChip: {
    // The chip holds its size; the price is what gives way.
    flexShrink: 0,
    borderRadius: Radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  viewChipText: { fontSize: 11, fontFamily: Fonts.sans[700] },

  // Two rows of two, matching the `numColumns={2}` grid the cards land in.
  skeletonGrid: { gap: Spacing.three },
  skeletonRow: { flexDirection: 'row', gap: Spacing.three },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyIcon: {
    height: 40,
    width: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.sans[700] },
  emptyBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: Fonts.sans[400] },
  emptyBtn: {
    marginTop: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
