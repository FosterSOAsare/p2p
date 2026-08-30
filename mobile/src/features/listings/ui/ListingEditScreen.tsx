import { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, Layers, Package, Star, Tag, Trash2 } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import {
  useDeleteListing,
  useListing,
  useUpdateListing,
  type ListingStatus,
} from '../data/listingsApi';
import { CONDITIONS, ListingForm, type ListingFormValues } from './ListingForm';
import { ListingDisputePanel } from './ListingDisputePanel';

/**
 * Edit a listing — the phone version of `web/src/pages/ListingDetail.tsx`.
 *
 * Same three parts as the web, in the same order: a header card summarising the
 * listing (with view-public-page and delete beside it), the three-up stat strip,
 * and the shared `ListingForm` prefilled from the listing. Status *is* shown
 * here (`showStatus`), unlike create — the web only exposes it on edit too.
 *
 * Reads `GET /api/listings/:id` and writes through `PATCH` and `DELETE` on the
 * same path — the endpoints the web's edit page uses.
 */

/** The web's `knownCondition` guard — a listing may carry a free-text condition. */
function toKnownCondition(condition: string): (typeof CONDITIONS)[number] {
  return CONDITIONS.includes(condition as (typeof CONDITIONS)[number])
    ? (condition as (typeof CONDITIONS)[number])
    : 'Good';
}

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "Out of Stock" from `out_of_stock` — the web capitalises the same way. */
function statusLabel(status: ListingStatus) {
  return status
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ListingEditScreen() {
  const theme = useTheme();
  const tones = useTones();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const listingQuery = useListing(id ?? '');
  const listing = listingQuery.data;

  /**
   * A removed listing is frozen — the server guard refuses edits to one, so the
   * form is replaced by an explanation rather than left there to fail. Mirrors
   * the web's `editingLocked`.
   */
  const editingLocked = listing?.status === 'removed';
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();

  const backToListings = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/listings');
  };

  /**
   * Not-found covers three cases the web splits between its error state and its
   * seller guard: an unknown id, a listing owned by someone else, and one just
   * deleted on this screen.
   */
  const notMine = listing != null && listing.seller?.username !== user?.username;

  if (!listing || notMine || deleted) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.notFound}>
          <Package size={28} color={theme.textTertiary} />
          <Text style={[styles.notFoundTitle, { color: theme.text }]}>
            {deleted ? 'Listing deleted' : 'Listing not found'}
          </Text>
          <Text style={[styles.notFoundBody, { color: theme.textSecondary }]}>
            {notMine
              ? "This listing belongs to another seller, so it can't be edited here."
              : deleted
                ? 'It has been removed from your catalog.'
                : "We couldn't find that listing in your catalog."}
          </Text>
          <Pressable
            onPress={() => router.replace('/listings')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ArrowLeft size={14} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Back to My Listings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async (values: ListingFormValues) => {
    try {
      await updateListing.mutateAsync({
        id: listing.id,
        title: values.title,
        description: values.description || null,
        price: Number(values.price),
        category: values.category,
        condition: values.condition,
        quantity: Number(values.quantity),
        location: values.location || null,
        status: values.status,
        // Only http(s) URLs survive: the picker yields on-device file paths,
        // which the server rejects — uploading them is still to do.
        images: values.images.filter(
          (i): i is string => typeof i === 'string' && /^https?:\/\//.test(i),
        ),
      });
      router.replace('/listings');
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    }
  };

  const onDelete = async () => {
    try {
      await deleteListing.mutateAsync(listing.id);
      setConfirmOpen(false);
      setDeleted(true);
    } catch (err) {
      setConfirmOpen(false);
      setSaveError(apiErrorMessage(err));
    }
  };

  const stats: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Layers size={12} color={theme.textTertiary} />,
      label: 'In Stock',
      value: String(listing.quantity),
    },
    {
      icon: <Star size={12} color={theme.textTertiary} />,
      label: 'Reviews',
      value: String(listing.reviewCount),
    },
    {
      icon: <Tag size={12} color={theme.textTertiary} />,
      label: 'Status',
      value: statusLabel(listing.status),
    },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={backToListings}
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

        {/* Listing header — thumb, title/price, and the two icon actions the
            web sits in the same corner. */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.headerRow}>
            {listing.images[0] != null ? (
              <Image source={listing.images[0]} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.backgroundElement }]}>
                <Package size={20} color={theme.textTertiary} />
              </View>
            )}

            <View style={styles.headerBody}>
              <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={2}>
                {listing.title}
              </Text>
              <Text style={[styles.listingMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {formatMoney(listing.price, listing.currency)} · {listing.category}
              </Text>
            </View>

            <View style={styles.iconActions}>
              <Pressable
                onPress={() => router.push(`/marketplace/${listing.id}`)}
                accessibilityRole="button"
                accessibilityLabel="View public page"
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                  },
                ]}
              >
                <ExternalLink size={14} color={theme.textSecondary} />
              </Pressable>

              <Pressable
                onPress={() => setConfirmOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Delete listing"
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: tones.danger.border,
                    backgroundColor: pressed ? tones.danger.surface : 'transparent',
                  },
                ]}
              >
                <Trash2 size={14} color={tones.danger.icon} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.statRow, { borderTopColor: theme.border }]}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <View style={styles.statLabelRow}>
                  {stat.icon}
                  <Text style={[styles.statLabel, { color: theme.textTertiary }]}>{stat.label}</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Why a save or a delete was refused. `saveError` was being set in
            three places and rendered in none, so a rejected save looked exactly
            like a successful one that hadn't navigated. The web shows the same
            box in the same spot, between the header and the form. */}
        {saveError ? (
          <View
            style={[
              styles.apiError,
              { backgroundColor: tones.danger.surface, borderColor: tones.danger.border },
            ]}
          >
            <Text style={[styles.apiErrorText, { color: tones.danger.text }]}>{saveError}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* "Listing", not "Edit Listing", once it's frozen — the web switches
              the same heading rather than showing a promise it can't keep. */}
          <Text style={[styles.sectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            {editingLocked ? 'Listing' : 'Edit Listing'}
          </Text>

          {/* Takedown notice and the appeal, on a removed listing you own. This
              is where the "Your listing was removed" notification lands. */}
          {listing.removal ? (
            <ListingDisputePanel listingId={listing.id} removal={listing.removal} />
          ) : null}

          {/**
           * A removed listing is frozen while it's under moderation — the server
           * refuses edits to one, so offering the form would only produce a
           * rejection. It becomes a read-only view instead of disappearing: the
           * seller still needs to see what was taken down in order to argue
           * about it, and the appeal sits directly above.
           */}
          {editingLocked ? (
            <View style={styles.lockedWrap}>
              <View
                style={[
                  styles.lockedNotice,
                  { backgroundColor: theme.inputBackground, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.lockedText, { color: theme.textSecondary }]}>
                  A removed listing is frozen while it&apos;s under moderation, so it can&apos;t be
                  edited. Create a new listing if you want to sell the item again.
                </Text>
              </View>

              <View style={[styles.readOnly, { borderColor: theme.border }]}>
                {(
                  [
                    ['Title', listing.title],
                    ['Price', formatMoney(listing.price, listing.currency)],
                    ['Category', listing.category],
                    ['Condition', listing.condition ?? '—'],
                    ['Quantity', String(listing.quantity)],
                    ['Location', listing.location ?? '—'],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={styles.readOnlyRow}>
                    <Text style={[styles.readOnlyLabel, { color: theme.textTertiary }]}>
                      {label}
                    </Text>
                    <Text style={[styles.readOnlyValue, { color: theme.text }]}>{value}</Text>
                  </View>
                ))}

                {listing.description ? (
                  <View style={[styles.readOnlyDesc, { borderTopColor: theme.border }]}>
                    <Text style={[styles.readOnlyLabel, { color: theme.textTertiary }]}>
                      Description
                    </Text>
                    <Text style={[styles.readOnlyBody, { color: theme.textSecondary }]}>
                      {listing.description}
                    </Text>
                  </View>
                ) : null}
              </View>

              {listing.images.length > 0 ? (
                <View style={styles.readOnlyImages}>
                  {listing.images.map((src) => (
                    <Image
                      key={src}
                      source={src}
                      style={[styles.readOnlyThumb, { borderColor: theme.border }]}
                      contentFit="cover"
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
          <ListingForm
            initial={{
              title: listing.title,
              // The API nulls empty optional text; the form fields want strings.
              description: listing.description ?? '',
              price: String(listing.price),
              category: listing.category,
              condition: toKnownCondition(listing.condition ?? ''),
              quantity: String(listing.quantity),
              location: listing.location ?? '',
              images: listing.images,
              // `removed` is an admin takedown, not something a seller can set,
              // so the form opens such a listing as a draft.
              status: listing.status === 'removed' ? 'draft' : listing.status,
            }}
            submitLabel="Save Changes"
            pendingLabel="Saving..."
            isPending={updateListing.isPending}
            showStatus
            onSubmit={onSubmit}
          />
          )}
        </View>
      </KeyboardAwareScroll>

      {/* Delete confirmation — same dialog anatomy as MyListingsScreen, and a
          Modal for the same reason: it must sit over the scrolling page and
          freeze it, not scroll away with it. */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Delete this listing?</Text>
            <Text style={[styles.dialogBody, { color: theme.textSecondary }]}>
              “{listing.title}” will be permanently removed from the marketplace. This can&apos;t be
              undone.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setConfirmOpen(false)}
                style={[styles.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete Listing</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  thumb: { height: 72, width: 72, borderRadius: Radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  headerBody: { flex: 1, gap: 4 },
  // Listing name uses the web's `font-display`.
  listingTitle: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  listingMeta: { fontSize: 12, fontFamily: Fonts.sans[500] },

  iconActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    height: 32,
    width: 32,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: Spacing.three },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: { fontSize: 14, fontFamily: Fonts.sans[700] },

  apiError: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  apiErrorText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600] },

  lockedWrap: { gap: Spacing.three },
  lockedNotice: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  lockedText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },

  // The web's <dl>: a label column and a value that wraps rather than clipping.
  readOnly: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
  readOnlyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  readOnlyLabel: {
    width: 76,
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  readOnlyValue: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600] },
  readOnlyDesc: { borderTopWidth: 1, paddingTop: Spacing.two, gap: 4 },
  readOnlyBody: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  readOnlyImages: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  readOnlyThumb: { height: 76, width: 76, borderRadius: Radius.md, borderWidth: 1 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.display[700],
    borderBottomWidth: 1,
    paddingBottom: Spacing.three,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.two,
  },
  notFoundTitle: { fontSize: 19, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  notFoundBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400], textAlign: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  primaryBtnText: { flexShrink: 1, fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

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
    gap: Spacing.two,
  },
  dialogTitle: { fontSize: 15, fontFamily: Fonts.display[700] },
  dialogBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  dialogActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  /**
   * The two dialog buttons share the width instead of sizing to their labels.
   *
   * Right-aligned and intrinsically sized, "Delete listing" plus "Cancel" plus
   * their padding overran the dialog on a narrow phone — and because the row
   * couldn't shrink them, the overflow clipped rather than wrapped. `flex: 1`
   * each makes them halve whatever width the dialog has.
   */
  cancelBtn: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  deleteBtn: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
