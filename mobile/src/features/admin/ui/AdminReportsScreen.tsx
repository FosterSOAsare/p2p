import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Flag, PackageSearch, Trash2 } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  useAdminReports,
  useDismissListingReports,
  type AdminReportGroup,
  type ReportFilter,
} from '../data/adminReportsApi';
import {
  AdminButton,
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

/**
 * Buyer reports queue — the phone version of `web/src/pages/AdminReportsList.tsx`.
 *
 * Grouped by listing, because that's the unit of the decision: a listing
 * flagged eight times is one call, not eight. Each group offers the two
 * verdicts — take the listing down (which actions every open report on it), or
 * dismiss them as no violation.
 */

const TABS: { id: ReportFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
];

const STATUS_PILL = {
  active: { bg: '#dcfce7', fg: '#166534', label: 'active' },
  draft: { bg: '#f3f4f6', fg: '#374151', label: 'draft' },
  out_of_stock: { bg: '#fef3c7', fg: '#92400e', label: 'out of stock' },
  removed: { bg: '#fee2e2', fg: '#991b1b', label: 'removed' },
} as const;

export function AdminReportsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [tab, setTab] = useState<ReportFilter>('open');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminReportGroup['listing'] | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('status', tab);
    params.set('limit', '50');
    return params.toString();
  }, [tab]);

  const reportsQuery = useAdminReports(query);
  const dismiss = useDismissListingReports();

  const groups = reportsQuery.data?.groups ?? [];
  const openCount = groups.reduce((sum, g) => sum + g.openCount, 0);

  const renderGroup = (group: AdminReportGroup) => {
    const { listing } = group;
    const pill = STATUS_PILL[listing.status];
    const isOpen = expanded === listing.id;
    // Only an open report can still be ruled on; the other tabs are history.
    const actionable = group.openCount > 0 && listing.status !== 'removed';

    return (
      <View
        key={listing.id}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <Pressable
          onPress={() => router.push(`/admin/listings/${listing.id}`)}
          accessibilityRole="button"
          style={styles.head}
        >
          <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
            {listing.image ? (
              <Image source={{ uri: listing.image }} style={styles.thumbImage} contentFit="cover" />
            ) : (
              <PackageSearch size={18} color={theme.textTertiary} />
            )}
          </View>

          <View style={styles.headBody}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {listing.title}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
              {money(listing.price, listing.currency)} · {listing.category} · @
              {listing.seller.username}
            </Text>
            <View style={styles.pillRow}>
              <StatusPill label={pill.label} bg={pill.bg} fg={pill.fg} />
              <View style={[styles.countPill, { backgroundColor: '#fee2e2' }]}>
                <Flag size={10} color="#991b1b" />
                <Text style={[styles.countPillText, { color: '#991b1b' }]}>
                  {group.reportCount} report{group.reportCount === 1 ? '' : 's'}
                  {group.openCount > 0 && group.openCount !== group.reportCount
                    ? ` · ${group.openCount} open`
                    : ''}
                </Text>
              </View>
            </View>
          </View>

          <ChevronRight size={16} color={theme.textTertiary} />
        </Pressable>

        {/* Why it was flagged, most-cited first — enough to rule on without
            opening every individual report. */}
        <View style={styles.reasons}>
          {group.reasonCounts.map((r) => (
            <View
              key={r.reason}
              style={[styles.reasonChip, { backgroundColor: theme.backgroundElement }]}
            >
              <Text style={[styles.reasonText, { color: theme.textSecondary }]}>
                {r.reasonText} · {r.count}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.dates, { color: theme.textTertiary }]}>
          First reported {shortDate(group.firstReportedAt)} · latest{' '}
          {shortDate(group.lastReportedAt)}
        </Text>

        {/* The reporters' own words, behind a toggle: useful when ruling, but
            too long to leave open on every row in the queue. */}
        <Pressable onPress={() => setExpanded(isOpen ? null : listing.id)} hitSlop={6}>
          <Text style={[styles.toggle, { color: theme.primary }]}>
            {isOpen ? 'Hide' : 'Show'} {group.reports.length} report
            {group.reports.length === 1 ? '' : 's'}
          </Text>
        </Pressable>

        {isOpen ? (
          <View style={styles.reportList}>
            {group.reports.map((report) => (
              <View
                key={report.id}
                style={[styles.report, { borderColor: theme.border }]}
              >
                <Text style={[styles.reportHead, { color: theme.text }]}>
                  @{report.reporter.username} · {report.reasonText}
                </Text>
                {report.note ? (
                  <Text style={[styles.reportNote, { color: theme.textSecondary }]}>
                    “{report.note}”
                  </Text>
                ) : null}
                <Text style={[styles.reportMeta, { color: theme.textTertiary }]}>
                  {report.status}
                  {report.reviewedBy ? ` by ${report.reviewedBy}` : ''} ·{' '}
                  {shortDate(report.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {actionable ? (
          <View style={styles.actions}>
            <AdminButton
              label="Remove listing"
              tone="danger"
              icon={Trash2}
              onPress={() => setRemoveTarget(listing)}
              style={styles.action}
            />
            <AdminButton
              label="No violation"
              tone="secondary"
              icon={Check}
              loading={dismiss.isPending && dismiss.variables?.listingId === listing.id}
              onPress={() => dismiss.mutate({ listingId: listing.id })}
              style={styles.action}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <AdminScreen
      title="Reports"
      subtitle="Listings buyers have flagged. Take the listing down, or clear the reports."
      onRefresh={() => reportsQuery.refetch()}
      refreshing={reportsQuery.isRefetching}
    >
      <FilterChips
        options={TABS.map((t) => ({
          ...t,
          count: t.id === 'open' ? openCount : undefined,
        }))}
        value={tab}
        onChange={setTab}
      />

      {dismiss.isError ? <AdminError message={apiErrorMessage(dismiss.error)} /> : null}

      {reportsQuery.isLoading ? (
        <AdminLoading />
      ) : reportsQuery.isError ? (
        <AdminError message={apiErrorMessage(reportsQuery.error)} />
      ) : groups.length === 0 ? (
        <AdminEmpty
          icon={Flag}
          title="Nothing to review"
          hint={
            tab === 'open'
              ? 'No listing has an open report right now.'
              : 'No reports match this filter.'
          }
        />
      ) : (
        groups.map(renderGroup)
      )}

      {removeTarget ? (
        <RemoveListingSheet listing={removeTarget} onClose={() => setRemoveTarget(null)} />
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },

  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  headBody: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  meta: { fontSize: 11, fontFamily: Fonts.sans[400] },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: { fontSize: 9.5, fontFamily: Fonts.sans[700] },

  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonChip: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  reasonText: { fontSize: 10.5, fontFamily: Fonts.sans[600] },

  dates: { fontSize: 10.5, fontFamily: Fonts.sans[400] },
  toggle: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  reportList: { gap: Spacing.two },
  report: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.two, gap: 2 },
  reportHead: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  reportNote: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },
  reportMeta: { fontSize: 10, fontFamily: Fonts.sans[400] },

  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
