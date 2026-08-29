import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ban, Check, X } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResolveListingDispute, type AdminListingDispute } from '../data/adminListingsApi';
import { apiErrorMessage } from '@/features/shared/data/api';
import { AdminButton, AdminError, DetailRow, StatusPill, money, shortDate } from './AdminScaffold';

/**
 * Review a seller's appeal against a takedown — the phone version of the web's
 * ListingDisputeReview.
 *
 * A removed listing is frozen, so what's shown here is exactly what the ruling
 * applies to: the removal reason, the seller's case, and the listing as it
 * stood when it came down.
 */

const PILL = {
  open: { bg: '#fef9c3', fg: '#854d0e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#f3f4f6', fg: '#374151' },
} as const;

export function ListingAppealSheet({
  dispute,
  onClose,
}: {
  dispute: AdminListingDispute;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const resolve = useResolveListingDispute();
  const [note, setNote] = useState('');

  const isOpen = dispute.status === 'open';
  const listing = dispute.listing;

  const decide = (decision: 'approve' | 'reject') =>
    resolve.mutate({ id: dispute.id, decision, note: note.trim() || undefined }, { onSuccess: onClose });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable style={styles.backdropTap} onPress={resolve.isPending ? undefined : onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: insets.bottom + Spacing.four,
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={[styles.title, { color: theme.text }]}>Listing appeal</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                @{dispute.seller.username} · {shortDate(dispute.createdAt)}
              </Text>
            </View>
            <StatusPill label={dispute.status} bg={PILL[dispute.status].bg} fg={PILL[dispute.status].fg} />
            <Pressable onPress={onClose} hitSlop={10} disabled={resolve.isPending}>
              <X size={19} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* Why it came down */}
            <View style={[styles.removed, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
              <Text style={styles.removedLabel}>Removed for</Text>
              <Text style={styles.removedText}>{listing.removalReasonText}</Text>
            </View>

            {/* The seller's case */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Seller&apos;s explanation</Text>
              <Text style={[styles.explanation, { color: theme.text }]}>{dispute.explanation}</Text>
            </View>

            {/* The listing as removed */}
            <View style={[styles.listing, { borderColor: theme.border }]}>
              <View style={styles.listingHead}>
                <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
                  {listing.image ? (
                    <Image source={{ uri: listing.image }} style={styles.thumbImg} resizeMode="cover" />
                  ) : null}
                </View>
                <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={2}>
                  {listing.title}
                </Text>
              </View>
              <View style={styles.pairRow}>
                <DetailRow label="Price" value={money(listing.price)} />
                <DetailRow label="Quantity" value={String(listing.quantity)} />
              </View>
              <View style={styles.pairRow}>
                <DetailRow label="Category" value={listing.category} />
                <DetailRow label="Condition" value={listing.condition ?? '—'} />
              </View>
              {listing.description ? (
                <DetailRow label="Description" value={listing.description} />
              ) : null}
            </View>

            {resolve.isError ? <AdminError message={apiErrorMessage(resolve.error)} /> : null}

            {!isOpen ? (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {dispute.status === 'approved' ? 'Approved' : 'Rejected'}
                  {dispute.reviewedBy ? ` by @${dispute.reviewedBy}` : ''}
                </Text>
                {dispute.reviewNote ? (
                  <Text style={[styles.explanation, { color: theme.text }]}>{dispute.reviewNote}</Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          {isOpen ? (
            <View style={styles.footer}>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={1000}
                editable={!resolve.isPending}
                placeholder="Note to the seller (optional)"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text },
                ]}
              />
              <View style={styles.actions}>
                <AdminButton
                  label="Reject"
                  tone="secondary"
                  icon={Ban}
                  onPress={() => decide('reject')}
                  disabled={resolve.isPending}
                  style={styles.action}
                />
                <AdminButton
                  label="Approve & reinstate"
                  tone="success"
                  icon={Check}
                  loading={resolve.isPending}
                  onPress={() => decide('approve')}
                  style={styles.action}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 38, height: 4, borderRadius: Radius.full },

  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.three },
  headText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: Fonts.display[700] },
  subtitle: { fontSize: 12, fontFamily: Fonts.sans[400] },

  scroll: { flexGrow: 0 },
  scrollBody: { gap: Spacing.three, paddingBottom: Spacing.three },

  removed: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 3 },
  removedLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  removedText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[600], color: '#991b1b' },

  field: { gap: 5 },
  label: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  explanation: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },

  listing: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.three },
  listingHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 44, height: 44, borderRadius: Radius.md, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  listingTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.sans[700] },
  pairRow: { flexDirection: 'row', gap: Spacing.four },

  footer: { gap: Spacing.two, paddingTop: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
