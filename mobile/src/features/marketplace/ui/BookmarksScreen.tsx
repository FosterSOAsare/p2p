import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, Heart, Lock, Store, Trash2 } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/context/SavedContext';
import { mockProducts } from '@/constants/mockData';

/**
 * Bookmarks — the phone version of `web/src/pages/Bookmarks.tsx`.
 *
 * Same header (back link, title with a count pill, Browse Marketplace), the
 * same card anatomy (photo with category chip and a remove button, seller,
 * condition, title, price, View / Buy) and the same empty state.
 *
 * Saved ids come from `SavedContext`, so the hearts on the marketplace and the
 * Save button on a listing all agree with this list.
 */

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BookmarksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { savedIds, toggleSaved } = useSaved();

  const items = useMemo(
    () => mockProducts.filter((p) => savedIds.has(p.id)),
    [savedIds],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/marketplace');
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to marketplace"
          style={({ pressed }) => [
            styles.backRow,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <ArrowLeft size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back to Marketplace</Text>
        </Pressable>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>My Bookmarked Items</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{items.length}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Products and listings you have saved for later purchase or price watching.
          </Text>
        </View>

        {items.length === 0 ? (
          /* Empty state, same copy as the web */
          <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={styles.emptyIcon}>
              <Heart size={24} color="#f43f5e" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No bookmarked items yet</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Browse the marketplace and tap the heart icon on any listing to save it to your
              bookmarks for quick checkout later.
            </Text>
            <Pressable
              onPress={() => router.push('/marketplace')}
              style={({ pressed }) => [
                styles.browseBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Store size={15} color="#ffffff" />
              <Text style={styles.browseBtnText}>Explore Marketplace</Text>
            </Pressable>
          </View>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Pressable
                onPress={() => router.push(`/marketplace/${item.id}`)}
                style={styles.imageWrap}
              >
                <Image source={item.images[0]} style={styles.image} contentFit="cover" />

                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{item.category}</Text>
                </View>

                <Pressable
                  onPress={() => toggleSaved(item.id)}
                  hitSlop={8}
                  accessibilityLabel="Remove from bookmarks"
                  style={styles.removeBtn}
                >
                  <Trash2 size={14} color="#e11d48" />
                </Pressable>
              </Pressable>

              <View style={styles.metaRow}>
                <Text style={[styles.seller, { color: theme.textTertiary }]} numberOfLines={1}>
                  @{item.vendor.username}
                </Text>
                {item.condition ? (
                  <View style={[styles.conditionChip, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.conditionText, { color: theme.textSecondary }]}>
                      {item.condition}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Pressable onPress={() => router.push(`/marketplace/${item.id}`)}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
              <Text style={[styles.cardShort, { color: theme.textTertiary }]} numberOfLines={1}>
                {item.description}
              </Text>

              <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                <View>
                  <Text style={[styles.priceLabel, { color: theme.textTertiary }]}>Price</Text>
                  <Text style={[styles.price, { color: theme.text }]}>
                    {formatMoney(item.price, item.currency)}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => router.push(`/marketplace/${item.id}`)}
                    style={({ pressed }) => [
                      styles.viewBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                      },
                    ]}
                  >
                    <ExternalLink size={12} color={theme.text} />
                    <Text style={[styles.viewText, { color: theme.text }]}>View</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/checkout?listing=${item.id}`)}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Lock size={12} color="#ffffff" />
                    <Text style={styles.buyText}>Buy</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
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

  header: { borderBottomWidth: 1, paddingBottom: Spacing.three, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Heading uses the web's `font-display`.
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  countPill: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countPillText: { fontSize: 11, fontFamily: Fonts.sans[700], color: '#be123c' },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  imageWrap: { height: 160, borderRadius: Radius.md, overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  categoryChip: {
    position: 'absolute',
    left: Spacing.two,
    top: Spacing.two,
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryChipText: { fontSize: 9, fontFamily: Fonts.sans[600], color: '#ffffff' },
  removeBtn: {
    position: 'absolute',
    right: Spacing.two,
    top: Spacing.two,
    height: 32,
    width: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  seller: { flexShrink: 1, fontSize: 11, fontFamily: Fonts.sans[500] },
  conditionChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs },
  conditionText: { fontSize: 10, fontFamily: Fonts.sans[500] },

  cardTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  cardShort: { fontSize: 11, fontFamily: Fonts.sans[400] },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  priceLabel: { fontSize: 10, fontFamily: Fonts.sans[500] },
  price: { fontSize: 14, fontFamily: Fonts.display[700] },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  viewText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buyText: { fontSize: 11.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyIcon: {
    height: 48,
    width: 48,
    borderRadius: Radius.full,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  emptyBody: { fontSize: 12, lineHeight: 17, textAlign: 'center', fontFamily: Fonts.sans[400] },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  browseBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
