import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExternalLink, Package, Pencil, PlusCircle, Trash2 } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { apiErrorMessage } from '@/features/shared/data/api';
import { SkeletonList } from '@/features/shared/ui/Skeleton';
import {
  useDeleteListing,
  useMyListings,
  type ListingStatus,
  type MyListing,
} from '../data/listingsApi';

/**
 * My Listings — the phone version of `web/src/pages/MyListings.tsx`.
 *
 * Same seller console: status tabs, a listing count, one row per item with its
 * status badge and the price · category · qty · listed meta line, and the three
 * row actions (view public page, edit, delete). Copy is the web's, verbatim.
 *
 * The web keeps its filter and page in the URL; a phone has no address bar, so
 * the tab is component state. The server pages at 48 max and this asks for the
 * cap — a catalogue past that needs real pagination, which this doesn't do yet.
 *
 * This is the seller's fourth *tab* (where buyers get Activity), so it renders
 * no Back affordance and pads its list past the tab bar.
 *
 * Reads `GET /api/listings/mine`, which is already scoped to the signed-in
 * seller — no client-side filtering by username needed.
 */

const STATUS_TABS: { id: ListingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Drafts' },
  { id: 'out_of_stock', label: 'Out of Stock' },
  // An admin takedown. Without this tab a removed listing would be invisible in
  // every filter yet still counted, which reads as data quietly going missing.
  { id: 'removed', label: 'Removed' },
];

/** Mirrors the web's `StatusBadge`, plus the removed state the mock never had. */
function statusBadge(status: ListingStatus) {
  if (status === 'active') return { label: 'Active', bg: '#dcfce7', text: '#166534' };
  if (status === 'out_of_stock') return { label: 'Out of Stock', bg: '#fef3c7', text: '#92400e' };
  if (status === 'removed') return { label: 'Removed', bg: '#fee2e2', text: '#991b1b' };
  return { label: 'Draft', bg: '#e5e7eb', text: '#374151' };
}

/** The API returns an ISO currency code; the UI shows the symbol. */
function formatMoney(amount: number, currency: string) {
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

export function MyListingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();

  const [tab, setTab] = useState<ListingStatus | 'all'>('all');
  const [confirmTarget, setConfirmTarget] = useState<MyListing | null>(null);

  /**
   * One fetch, filtered in memory — so switching tabs is instant rather than a
   * fresh round trip each time.
   */
  const listingsQuery = useMyListings();
  const deleteListing = useDeleteListing();

  const listings = useMemo(() => {
    const rows = listingsQuery.data?.listings ?? [];
    return tab === 'all' ? rows : rows.filter((l) => l.status === tab);
  }, [tab, listingsQuery.data]);

  const notReady = listingsQuery.isLoading || listingsQuery.isError;
  const total = listings.length;

  /**
   * Mirrors the web's `onSettled: () => setDeleteTarget(null)` — the dialog
   * closes either way and a failure is reported above the list.
   *
   * This used to swallow the error and leave the dialog open, on the theory
   * that it would explain itself; it had nowhere to render the message, so a
   * failed delete just left the dialog sitting there looking stuck.
   *
   * No local bookkeeping on success: the mutation invalidates the cache, so the
   * list refetches without this component tracking what was deleted.
   */
  const confirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      await deleteListing.mutateAsync(confirmTarget.id);
    } catch {
      // Surfaced by the banner above the list.
    } finally {
      setConfirmTarget(null);
    }
  };

  const renderListing = ({ item }: { item: MyListing }) => {
    const badge = statusBadge(item.status);

    return (
      <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {/* Listing itself */}
        <View style={styles.rowTop}>
          {/* One cover URL from the API, and it can be null — a listing created
              without photos would otherwise render a broken image box. */}
          {item.image ? (
            <Image source={item.image} style={styles.thumb} contentFit="cover" />
          ) : (
            <View
              style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.backgroundElement }]}
            >
              <Package size={18} color={theme.textTertiary} />
            </View>
          )}

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
            {/* A refused delete, reported where the web reports it — above the
                list, after the dialog has closed. */}
            {deleteListing.isError ? (
              <View
                style={[styles.apiError, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
              >
                <Text style={styles.apiErrorText}>{apiErrorMessage(deleteListing.error)}</Text>
              </View>
            ) : null}

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
          /* "No listings" is a claim about the store, so it must not show while
             the answer is still in flight. Rows in outline beat a spinner: the
             screen looks like itself immediately. */
          listingsQuery.isLoading ? (
            <SkeletonList count={4} />
          ) : notReady ? (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <Package size={28} color="#e11d48" />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Couldn&apos;t load your listings
              </Text>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                {apiErrorMessage(listingsQuery.error)}
              </Text>
            </View>
          ) : (
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
          )
        }
      />

      {/* Delete confirmation — the web uses a ConfirmDialog. A Modal here so it
          sits over the list and freezes it, rather than riding along with the
          scroll behind it. */}
      <Modal
        visible={confirmTarget !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmTarget(null)}
      >
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
      </Modal>
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
  apiError: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  apiErrorText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600], color: '#b91c1c' },
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
    minHeight: 46,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  // "Create your first listing" is the long one — it wraps inside the button
  // now instead of running past its edge on a narrow screen.
  addBtnText: { flexShrink: 1, fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

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
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
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
  /**
   * 44 minimum, not 38. Three buttons sharing a row on a phone were each under
   * the 44pt/48dp minimum touch target both platforms specify, which is what
   * made View / Edit / Delete feel like they needed a precise tap.
   */
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  actionText: { flexShrink: 1, fontSize: 11.5, fontFamily: Fonts.sans[700] },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.display[700], textAlign: 'center' },

  // flex:1 inside a Modal — it already owns the screen.
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
    gap: Spacing.three,
  },
  dialogTitle: { fontSize: 16, fontFamily: Fonts.display[700] },
  dialogBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  dialogActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cancelText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  deleteBtn: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  deleteText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
