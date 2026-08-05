import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExternalLink, Package, Pencil, PlusCircle, Trash2 } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useAuth } from '@/context/AuthContext';
import { mockProducts, type Product } from '@/constants/mockData';

/**
 * My Listings — the phone version of `web/src/pages/MyListings.tsx`.
 *
 * Same seller console: status tabs, a listing count, one row per item with its
 * status badge and the price · category · qty · listed meta line, and the three
 * row actions (view public page, edit, delete). Copy is the web's, verbatim.
 *
 * The web keeps its filter and page in the URL; a phone has no address bar, so
 * the tab is component state. Pagination is dropped for now — the mock has
 * four listings, and a phone list scrolls rather than paginating.
 *
 * This is the seller's fourth *tab* (where buyers get Activity), so it renders
 * no Back affordance and pads its list past the tab bar.
 *
 * Reads the same `mockProducts` collection the marketplace does, scoped to the
 * signed-in vendor; delete removes the row locally only.
 */

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Drafts' },
  { id: 'out_of_stock', label: 'Out of Stock' },
] as const;

/** Same three states and labels as the web's `StatusBadge`. */
function statusBadge(status: Product['status']) {
  if (status === 'active') return { label: 'Active', bg: '#dcfce7', text: '#166534' };
  if (status === 'out_of_stock') return { label: 'Out of Stock', bg: '#fef3c7', text: '#92400e' };
  return { label: 'Draft', bg: '#e5e7eb', text: '#374151' };
}

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
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

export function MyListingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { user } = useAuth();

  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]['id']>('all');
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);

  /**
   * Scoped from the SAME collection the marketplace reads, mirroring the web
   * where both views hit one `Listing` table and My Listings is just the
   * `sellerId`-scoped query.
   *
   * `mockSellerListings` was a separate array with its own ids, so a seller's
   * inventory didn't exist in the marketplace and "View public page" landed on
   * "Listing Not Found".
   */
  const listings = useMemo(
    () =>
      mockProducts
        .filter((p) => p.vendor.username === user?.username)
        .filter((p) => !deleted.has(p.id))
        .filter((p) => (tab === 'all' ? true : p.status === tab)),
    [tab, deleted, user?.username],
  );

  const total = listings.length;

  const confirmDelete = () => {
    if (!confirmTarget) return;
    // TODO(api): DELETE /api/listings/:id — local removal only for now.
    setDeleted((prev) => new Set(prev).add(confirmTarget.id));
    setConfirmTarget(null);
  };

  const renderListing = ({ item }: { item: Product }) => {
    const badge = statusBadge(item.status);

    return (
      <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {/* Listing itself */}
        <View style={styles.rowTop}>
          <Image source={item.images[0]} style={styles.thumb} contentFit="cover" />

          <View style={styles.rowInfo}>
            <View style={styles.titleRow}>
              <Pressable
                onPress={() => router.push(`/listings/${item.id}`)}
                hitSlop={4}
                style={styles.titlePress}
              >
                <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>

            <Text style={[styles.rowMeta, { color: theme.textTertiary }]} numberOfLines={2}>
              {formatMoney(item.price, item.currency)} · {item.category} · qty {item.quantity} ·
              listed {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* View public page · Edit · Delete. The web sits these beside the row
            as icon-only buttons with hover tooltips; a phone has no hover, so
            they run along the bottom with their labels shown. */}
        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={() => router.push(`/marketplace/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel="View public page"
            style={({ pressed }) => [
              styles.actionBtn,
              {
                borderColor: theme.border,
                backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
              },
            ]}
          >
            <ExternalLink size={14} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>View</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/listings/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel="Edit listing"
            style={({ pressed }) => [
              styles.actionBtn,
              {
                borderColor: theme.border,
                backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
              },
            ]}
          >
            <Pencil size={14} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() => setConfirmTarget(item)}
            accessibilityRole="button"
            accessibilityLabel="Delete listing"
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: '#fecaca', backgroundColor: pressed ? '#fef2f2' : 'transparent' },
            ]}
          >
            <Trash2 size={14} color="#e11d48" />
            <Text style={[styles.actionText, { color: '#e11d48' }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={listings}
        renderItem={renderListing}
        keyExtractor={(l) => l.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.four }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <Package size={13} color={theme.primary} />
              <Text style={[styles.eyebrow, { color: theme.primary }]}>Seller Console</Text>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>My Listings</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Manage your marketplace inventory. All sales settle through GH₵ escrow.
            </Text>

            <Pressable
              onPress={() => router.push('/listings/new')}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <PlusCircle size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Add New Listing</Text>
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabStrip}
            >
              {STATUS_TABS.map(({ id, label }) => {
                const on = tab === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setTab(id)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: on ? theme.text : theme.backgroundElement,
                        borderColor: on ? theme.text : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tabText, { color: on ? theme.background : theme.textSecondary }]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.countRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                {total} listing{total === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <Package size={28} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {tab === 'all'
                ? 'No listings yet'
                : `No ${STATUS_TABS.find((t) => t.id === tab)?.label.toLowerCase()} listings`}
            </Text>
            <Pressable
              onPress={() => router.push('/listings/new')}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <PlusCircle size={14} color="#ffffff" />
              <Text style={styles.addBtnText}>Create your first listing</Text>
            </Pressable>
          </View>
        }
      />

      {/* Delete confirmation — the web uses a ConfirmDialog */}
      {confirmTarget ? (
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Delete listing?</Text>
            <Text style={[styles.dialogBody, { color: theme.textSecondary }]}>
              “{confirmTarget.title}” will be removed from your catalog. This can&apos;t be undone.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setConfirmTarget(null)}
                style={[styles.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  header: { gap: Spacing.three, marginBottom: Spacing.four },
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

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4, marginTop: -Spacing.two },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 46,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
  },
  addBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

  tabStrip: { gap: Spacing.two, paddingRight: Spacing.four },
  tab: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: 9,
  },
  tabText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  countRow: { borderTopWidth: 1, paddingTop: Spacing.three, alignItems: 'flex-end' },
  countText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  row: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.three,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { height: 60, width: 60, borderRadius: Radius.md },
  rowInfo: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titlePress: { flexShrink: 1 },
  rowTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText: { fontSize: 9, fontFamily: Fonts.sans[700] },
  rowMeta: { fontSize: 10.5, lineHeight: 14, fontFamily: Fonts.sans[400] },

  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
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

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.display[700], textAlign: 'center' },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    gap: Spacing.three,
  },
  dialogTitle: { fontSize: 16, fontFamily: Fonts.display[700] },
  dialogBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  dialogActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cancelText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  deleteBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  deleteText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
