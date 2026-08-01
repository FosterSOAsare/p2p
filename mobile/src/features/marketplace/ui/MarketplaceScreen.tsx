import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Search, ShieldCheck, Store, X } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { mockCategories, mockProducts, type ImageRef, type Product } from '@/constants/mockData';

/**
 * Marketplace tab — the phone version of `web/src/features/marketplace/ui/
 * Products.tsx`.
 *
 * Same building blocks in the same order: header banner, search, sort control,
 * category strip, active-filter chips, results count, listing cards, empty
 * state. The web lays cards out in a 4-column grid; a phone gets 2 columns.
 *
 * Filtering runs over the mock data in `constants/mockData.ts` — no API yet.
 * The web keeps filters in the URL query; here they're component state, since
 * a phone has no address bar. Swap to the real endpoint later without touching
 * this layout.
 */

const SORTS = [
  { key: 'featured', label: 'Featured' },
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
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
  const tabBarHeight = useTabBarHeight();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<SortKey>('featured');
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const categoryNames = useMemo(
    () => ['All', ...mockCategories.map((c) => c.name)],
    [],
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = mockProducts.filter((p) => p.status === 'active');

    if (category !== 'All') list = list.filter((p) => p.category === category);
    if (q) {
      // Web searches title, seller and keyword — same three here.
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.vendor.username.toLowerCase().includes(q.replace(/^@/, '')),
      );
    }

    const sorted = [...list];
    if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') {
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return sorted;
  }, [search, category, sort]);

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setSort('featured');
  };

  const hasFilters = category !== 'All' || search.trim().length > 0;

  const renderCard = ({ item }: { item: Product }) => {
    const isSaved = saved.has(item.id);

    return (
      <Pressable
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
          <ProductImage uri={item.images[0]} recyclingKey={item.id} />

          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.category}</Text>
          </View>

          <Pressable
            onPress={() => toggleSaved(item.id)}
            hitSlop={8}
            style={[styles.heart, isSaved && styles.heartOn]}
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save listing'}
          >
            <Heart
              size={13}
              color={isSaved ? '#ffffff' : theme.textSecondary}
              fill={isSaved ? '#ffffff' : 'transparent'}
            />
          </Pressable>
        </View>

        {/* Vendor row */}
        <View style={styles.vendorRow}>
          <View style={styles.vendorName}>
            <Text numberOfLines={1} style={[styles.vendorText, { color: theme.textSecondary }]}>
              @{item.vendor.username}
            </Text>
            {item.vendor.verified ? <ShieldCheck size={11} color={theme.primary} /> : null}
          </View>
        </View>

        <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        <View style={[styles.conditionPill, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.conditionText, { color: theme.textSecondary }]}>{item.condition}</Text>
        </View>

        {/* Footer: price + View, split by a rule like the web card */}
        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View style={styles.priceBlock}>
            <Text style={[styles.escrowLabel, { color: theme.textTertiary }]}>In Escrow</Text>
            <Text style={[styles.price, { color: theme.text }]}>
              {formatMoney(item.price, item.currency)}
            </Text>
          </View>
          <View style={[styles.viewChip, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.viewChipText, { color: theme.primary }]}>View</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={results}
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
                placeholder="Search listings, seller (@kwame_tech)…"
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
                <Text style={{ color: theme.text }}>{mockProducts.length}</Text> listings
              </Text>
              {hasFilters ? (
                <Pressable onPress={clearFilters} hitSlop={6}>
                  <Text style={styles.clearText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
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
            <Pressable onPress={clearFilters} style={[styles.emptyBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.emptyBtnText}>Clear All Filters</Text>
            </Pressable>
          </View>
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
  title: { fontSize: 26, fontFamily: Fonts.display[700], letterSpacing: -0.4, marginTop: -Spacing.two },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },

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
    fontSize: 14,
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

  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    marginBottom: Spacing.three,
    gap: 5,
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
  cardTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700], lineHeight: 17 },
  conditionPill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  conditionText: { fontSize: 10, fontFamily: Fonts.sans[600] },

  cardFooter: {
    marginTop: 2,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  priceBlock: { flexShrink: 1 },
  escrowLabel: { fontSize: 9, fontFamily: Fonts.sans[600] },
  price: { fontSize: 13, fontFamily: Fonts.sans[700] },
  viewChip: {
    borderRadius: Radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  viewChipText: { fontSize: 11, fontFamily: Fonts.sans[700] },

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
  emptyTitle: { fontSize: 15, fontFamily: Fonts.sans[700] },
  emptyBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: Fonts.sans[400] },
  emptyBtn: {
    marginTop: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
