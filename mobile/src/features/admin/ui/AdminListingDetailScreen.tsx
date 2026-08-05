import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Ban,
  Eye,
  Gavel,
  Handshake,
  ImageOff,
  Layers,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAdminListing, useReinstateListing, type ListingStatus } from '../data/adminListingsApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  AdminButton,
  AdminCard,
  AdminError,
  AdminLoading,
  AdminScreen,
  DetailRow,
  StatusPill,
  money,
  shortDate,
} from './AdminScaffold';
import { RemoveListingSheet } from './RemoveListingSheet';

/**
 * Phone version of `web/src/pages/AdminListingDetail.tsx`.
 *
 * The page an admin lands on before deciding to take a listing down: what's
 * being sold, who is selling it, and how they've behaved so far. Taking down a
 * listing is disruptive — it can strand live deals — so the numbers that make
 * that call (deal count, seller standing) sit above the action, not behind it.
 */

const STATUS_PILL: Record<ListingStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: '#dcfce7', fg: '#166534', label: 'active' },
  draft: { bg: '#f3f4f6', fg: '#374151', label: 'draft' },
  out_of_stock: { bg: '#fef3c7', fg: '#92400e', label: 'out of stock' },
  removed: { bg: '#fee2e2', fg: '#991b1b', label: 'removed' },
};

const KYC_PILL = {
  unverified: { bg: '#f3f4f6', fg: '#374151' },
  pending: { bg: '#fef9c3', fg: '#854d0e' },
  verified: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
} as const;

const APPEAL_PILL = {
  open: { bg: '#fef9c3', fg: '#854d0e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#f3f4f6', fg: '#374151' },
} as const;

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Icon size={13} color={theme.textSecondary} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textTertiary }]}>{label}</Text>
    </View>
  );
}

export function AdminListingDetailScreen() {
  const theme = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();

  const query = useAdminListing(id);
  const reinstate = useReinstateListing();
  const [removing, setRemoving] = useState(false);

  const listing = query.data;

  return (
    <AdminScreen
      title="Listing review"
      subtitle={listing?.title}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
    >
      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError || !listing ? (
        <AdminError message={apiErrorMessage(query.error)} />
      ) : (
        <>
          {/* Gallery — horizontal so a tall phone doesn't turn into a scroll marathon */}
          {listing.images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {listing.images.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={[styles.galleryImg, { backgroundColor: theme.backgroundElement }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.noImage, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ImageOff size={18} color={theme.textTertiary} />
              <Text style={[styles.noImageText, { color: theme.textTertiary }]}>No images</Text>
            </View>
          )}

          {/* What's being sold */}
          <AdminCard>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.text }]}>{listing.title}</Text>
              <StatusPill
                label={STATUS_PILL[listing.status].label}
                bg={STATUS_PILL[listing.status].bg}
                fg={STATUS_PILL[listing.status].fg}
              />
            </View>
            <Text style={[styles.price, { color: theme.text }]}>
              {money(listing.price, listing.currency)}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {listing.category}
              {listing.condition ? ` · ${listing.condition}` : ''}
              {listing.location ? ` · ${listing.location}` : ''}
            </Text>

            <View style={styles.stats}>
              <Stat icon={Eye} label="views" value={listing.views} />
              <Stat icon={Layers} label="in stock" value={listing.quantity} />
              <Stat icon={Handshake} label="deals" value={listing.dealCount} />
              <Stat
                icon={Star}
                label={`${listing.reviewCount} reviews`}
                value={listing.rating != null ? listing.rating.toFixed(1) : '—'}
              />
            </View>

            {listing.description ? (
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {listing.description}
              </Text>
            ) : null}

            <Text style={[styles.timestamps, { color: theme.textTertiary }]}>
              Listed {shortDate(listing.createdAt)} · updated {shortDate(listing.updatedAt)}
            </Text>
          </AdminCard>

          {/* Who's selling it */}
          <AdminCard>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Seller</Text>
            <View style={styles.headRow}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                {listing.seller.avatarUrl ? (
                  <Image source={{ uri: listing.seller.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {listing.seller.username.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.headBody}>
                <Text style={[styles.store, { color: theme.text }]} numberOfLines={1}>
                  {listing.seller.storeName ?? `@${listing.seller.username}`}
                </Text>
                <Text style={[styles.handle, { color: theme.textSecondary }]} numberOfLines={1}>
                  @{listing.seller.username} · {listing.seller.email}
                </Text>
              </View>
              {listing.seller.accountStatus === 'suspended' ? (
                <StatusPill label="suspended" bg="#fee2e2" fg="#991b1b" />
              ) : null}
            </View>

            <DetailRow
              label="KYC"
              value={
                <View style={styles.inlinePill}>
                  <StatusPill
                    label={listing.seller.kycStatus}
                    bg={KYC_PILL[listing.seller.kycStatus].bg}
                    fg={KYC_PILL[listing.seller.kycStatus].fg}
                  />
                </View>
              }
            />
            <DetailRow label="Other listings" value={listing.seller.listingsCount} />
            <DetailRow label="Joined" value={shortDate(listing.seller.joinedAt)} />
          </AdminCard>

          {/* Takedown trail */}
          {listing.removal ? (
            <View style={[styles.removalBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <View style={styles.removalHead}>
                <Ban size={14} color="#991b1b" />
                <Text style={styles.removalLabel}>Removed</Text>
              </View>
              <Text style={styles.removalReason}>{listing.removal.reasonText}</Text>
              {listing.removal.note ? (
                <Text style={styles.removalNote}>“{listing.removal.note}”</Text>
              ) : null}
              <Text style={styles.removalMeta}>
                {shortDate(listing.removal.removedAt)}
                {listing.removal.removedBy ? ` · by @${listing.removal.removedBy}` : ''}
                {listing.removal.disputeAllowed ? ' · seller may appeal' : ' · no appeal allowed'}
              </Text>
            </View>
          ) : null}

          {/* Seller's appeal, if they filed one */}
          {listing.dispute ? (
            <AdminCard>
              <View style={styles.titleRow}>
                <View style={styles.sectionHead}>
                  <Gavel size={14} color={theme.textSecondary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Seller's appeal</Text>
                </View>
                <StatusPill
                  label={listing.dispute.status}
                  bg={APPEAL_PILL[listing.dispute.status].bg}
                  fg={APPEAL_PILL[listing.dispute.status].fg}
                />
              </View>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {listing.dispute.explanation}
              </Text>
              {listing.dispute.reviewNote ? (
                <DetailRow label="Your note" value={listing.dispute.reviewNote} />
              ) : null}
              <Text style={[styles.timestamps, { color: theme.textTertiary }]}>
                Filed {shortDate(listing.dispute.createdAt)} · rule on it from the Appeals tab
              </Text>
            </AdminCard>
          ) : null}

          {reinstate.error ? <AdminError message={apiErrorMessage(reinstate.error)} /> : null}

          {/* Action */}
          {listing.status === 'removed' ? (
            <AdminButton
              label="Reinstate listing"
              tone="success"
              icon={RotateCcw}
              loading={reinstate.isPending}
              onPress={() => reinstate.mutate(listing.id)}
            />
          ) : (
            <AdminButton
              label="Remove listing"
              tone="danger"
              icon={Trash2}
              onPress={() => setRemoving(true)}
            />
          )}

          {/* Removing strands anyone mid-deal, so say so before they tap. */}
          {listing.status !== 'removed' && listing.dealCount > 0 ? (
            <Text style={[styles.warning, { color: theme.textTertiary }]}>
              {listing.dealCount} deal{listing.dealCount === 1 ? ' references' : 's reference'} this
              listing. Removing hides it from the marketplace but leaves those deals running.
            </Text>
          ) : null}
        </>
      )}

      {removing && listing ? (
        <RemoveListingSheet listing={listing} onClose={() => setRemoving(false)} />
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: Spacing.two },
  galleryImg: { width: 220, height: 150, borderRadius: Radius.lg },
  noImage: {
    height: 90,
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noImageText: { fontSize: 11.5, fontFamily: Fonts.sans[500] },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 16, fontFamily: Fonts.display[700] },
  price: { fontSize: 19, fontFamily: Fonts.display[700] },
  meta: { fontSize: 12.5, fontFamily: Fonts.sans[400] },
  description: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },
  timestamps: { fontSize: 11, fontFamily: Fonts.sans[400] },

  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    gap: 1,
  },
  statValue: { fontSize: 14, fontFamily: Fonts.display[700] },
  statLabel: { fontSize: 9.5, fontFamily: Fonts.sans[500], textAlign: 'center' },

  sectionTitle: { fontSize: 13, fontFamily: Fonts.display[700] },
  sectionHead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#ffffff', fontSize: 16, fontFamily: Fonts.display[700] },
  headBody: { flex: 1, gap: 2 },
  store: { fontSize: 14.5, fontFamily: Fonts.display[700] },
  handle: { fontSize: 11.5, fontFamily: Fonts.sans[400] },
  inlinePill: { flexDirection: 'row' },

  removalBox: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: 4 },
  removalHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  removalLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  removalReason: { fontSize: 13, fontFamily: Fonts.sans[600], color: '#991b1b' },
  removalNote: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400], color: '#b91c1c' },
  removalMeta: { fontSize: 11, fontFamily: Fonts.sans[400], color: '#b91c1c' },

  warning: { fontSize: 11.5, lineHeight: 17, fontFamily: Fonts.sans[400], textAlign: 'center' },
});
