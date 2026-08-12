import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Gavel, PackageSearch, Search, Trash2 } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useAdminListings,
  useAdminListingDisputes,
  type AdminListingDispute,
  type AdminListingRow,
  type ListingStatus,
} from '../data/adminListingsApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminScreen,
  FilterChips,
  StatusPill,
  money,
  shortDate,
} from './AdminScaffold';
import { RemoveListingSheet } from './RemoveListingSheet';
import { ListingAppealSheet } from './ListingAppealSheet';

/**
 * Phone version of `web/src/pages/AdminListingsList.tsx`.
 *
 * Same two jobs in one place: browse every listing and take one down, or work
 * the queue of sellers appealing a takedown. The web puts appeals behind a tab
 * on this page rather than its own nav entry — the admin nav already has a
 * "Disputes" item for escrow disputes, and two similarly-named entries confuse.
 */

type Tab = 'all' | ListingStatus | 'appeals';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Drafts' },
  { id: 'out_of_stock', label: 'Out of stock' },
  { id: 'removed', label: 'Removed' },
  { id: 'appeals', label: 'Appeals' },
];

const STATUS_PILL: Record<ListingStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: '#dcfce7', fg: '#166534', label: 'active' },
  draft: { bg: '#f3f4f6', fg: '#374151', label: 'draft' },
  out_of_stock: { bg: '#fef3c7', fg: '#92400e', label: 'out of stock' },
  removed: { bg: '#fee2e2', fg: '#991b1b', label: 'removed' },
};

const APPEAL_PILL = {
  open: { bg: '#fef9c3', fg: '#854d0e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#f3f4f6', fg: '#374151' },
} as const;

export function AdminListingsScreen() {
  const theme = useTheme();
  // Seeded from `?status=` so a dashboard tile can deep-link straight into a
  // filtered list; unrecognised values fall back to showing everything.
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === status) ? (status as Tab) : 'all',
  );
  const [search, setSearch] = useState('');
  const [removeTarget, setRemoveTarget] = useState<AdminListingRow | null>(null);
  const [appealTarget, setAppealTarget] = useState<AdminListingDispute | null>(null);

  const showAppeals = tab === 'appeals';

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (tab !== 'all' && tab !== 'appeals') params.set('status', tab);
    params.set('limit', '50');
    return params.toString();
  }, [search, tab]);

  const listingsQuery = useAdminListings(showAppeals ? '' : query);
  const appealsQuery = useAdminListingDisputes('all');

  const listings = listingsQuery.data?.listings ?? [];
  const appeals = appealsQuery.data?.disputes ?? [];
  const openAppeals = appeals.filter((a) => a.status === 'open').length;

  return (
    <AdminScreen
      title="Listings"
      subtitle="Remove listings that break the rules, and rule on sellers' appeals."
      onRefresh={() => (showAppeals ? appealsQuery.refetch() : listingsQuery.refetch())}
      refreshing={showAppeals ? appealsQuery.isRefetching : listingsQuery.isRefetching}
    >
      <FilterChips
        options={TABS.map((t) => ({ ...t, count: t.id === 'appeals' ? openAppeals : undefined }))}
        value={tab}
        onChange={setTab}
      />

      {!showAppeals && (
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
          ]}
        >
          <Search size={15} color={theme.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, category or seller"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      )}

      {showAppeals ? (
        appealsQuery.isLoading ? (
          <AdminLoading />
        ) : appealsQuery.isError ? (
          <AdminError message={apiErrorMessage(appealsQuery.error)} />
        ) : appeals.length === 0 ? (
          <AdminEmpty icon={Gavel} title="No appeals" hint="No seller has disputed a takedown." />
        ) : (
          <View style={styles.list}>
            {appeals.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => setAppealTarget(a)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
                  {a.listing.image ? (
                    <Image source={{ uri: a.listing.image }} style={styles.thumbImg} resizeMode="cover" />
                  ) : null}
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                      {a.listing.title}
                    </Text>
                    <StatusPill label={a.status} bg={APPEAL_PILL[a.status].bg} fg={APPEAL_PILL[a.status].fg} />
                  </View>
                  <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                    @{a.seller.username} ·{' '}
                    {/* Approving an appeal clears the takedown, so there's no reason left to show. */}
                    {a.listing.removalReasonText
                      ? `removed for ${a.listing.removalReasonText}`
                      : 'listing reinstated'}
                  </Text>
                  <Text style={[styles.date, { color: theme.textTertiary }]}>
                    Appealed {shortDate(a.createdAt)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )
      ) : listingsQuery.isLoading ? (
        <AdminLoading />
      ) : listingsQuery.isError ? (
        <AdminError message={apiErrorMessage(listingsQuery.error)} />
      ) : listings.length === 0 ? (
        <AdminEmpty icon={PackageSearch} title="No listings found" hint="Nothing matches this filter." />
      ) : (
        <View style={styles.list}>
          {listings.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/admin/listings/${l.id}`)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
                {l.image ? (
                  <Image source={{ uri: l.image }} style={styles.thumbImg} resizeMode="cover" />
                ) : null}
              </View>

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {l.title}
                  </Text>
                  <StatusPill
                    label={STATUS_PILL[l.status].label}
                    bg={STATUS_PILL[l.status].bg}
                    fg={STATUS_PILL[l.status].fg}
                  />
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                  {money(l.price, l.currency)} · {l.category} · @{l.seller.username}
                </Text>

                {l.removal ? (
                  <Text style={[styles.removed, { color: '#b91c1c' }]} numberOfLines={2}>
                    {l.removal.reasonText}
                    {l.removal.removedBy ? ` · by @${l.removal.removedBy}` : ''}
                    {l.removal.disputeStatus
                      ? ` · appeal ${l.removal.disputeStatus}`
                      : l.removal.disputeAllowed
                        ? ' · appealable'
                        : ' · no appeal'}
                  </Text>
                ) : (
                  <Text style={[styles.date, { color: theme.textTertiary }]}>
                    Listed {shortDate(l.createdAt)}
                  </Text>
                )}
              </View>

              {/*
                Always occupies the same width, even with nothing in it. A removed
                listing has no Remove button, and if the slot collapsed the status
                pill beside it would slide right on exactly those rows.
              */}
              <View style={styles.actionSlot}>
                {l.status !== 'removed' ? (
                  <Pressable
                    onPress={() => setRemoveTarget(l)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      { backgroundColor: '#ef4444', opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Trash2 size={14} color="#ffffff" />
                  </Pressable>
                ) : (
                  <ChevronRight size={16} color={theme.textTertiary} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {removeTarget ? (
        <RemoveListingSheet listing={removeTarget} onClose={() => setRemoveTarget(null)} />
      ) : null}
      {appealTarget ? (
        <ListingAppealSheet dispute={appealTarget} onClose={() => setAppealTarget(null)} />
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13, fontFamily: Fonts.sans[400] },

  list: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  thumb: { width: 44, height: 44, borderRadius: Radius.md, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // `flex: 1` (not `flexShrink`) so the title always claims the leftover width
  // and the pill parks on the right edge — short and long titles line up.
  title: { flex: 1, fontSize: 14, fontFamily: Fonts.sans[700] },
  meta: { fontSize: 12, fontFamily: Fonts.sans[400] },
  removed: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[600] },
  date: { fontSize: 11, fontFamily: Fonts.sans[400] },

  actionSlot: { width: 34, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
