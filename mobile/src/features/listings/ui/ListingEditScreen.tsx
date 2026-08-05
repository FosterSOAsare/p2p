import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, Layers, Package, Star, Tag, Trash2 } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { mockProducts, type Product } from '@/constants/mockData';
import { CONDITIONS, ListingForm, type ListingFormValues } from './ListingForm';

/**
 * Edit a listing — the phone version of `web/src/pages/ListingDetail.tsx`.
 *
 * Same three parts as the web, in the same order: a header card summarising the
 * listing (with view-public-page and delete beside it), the three-up stat strip,
 * and the shared `ListingForm` prefilled from the listing. Status *is* shown
 * here (`showStatus`), unlike create — the web only exposes it on edit too.
 *
 * Reads `mockProducts`, the same collection `MyListingsScreen` scopes by vendor,
 * so an id that works in the list works here. Saving and deleting are local
 * no-ops for now; both are marked `TODO(api)`.
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
function statusLabel(status: Product['status']) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ListingEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const listing = useMemo(() => mockProducts.find((p) => p.id === id), [id]);

  const backToListings = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/listings');
  };

  /**
   * Not-found covers three cases the web splits between its error state and its
   * seller guard: an unknown id, a listing owned by someone else, and one just
   * deleted on this screen.
   */
  const notMine = listing != null && listing.vendor.username !== user?.username;

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

  const onSubmit = async (_values: ListingFormValues) => {
    setPending(true);
    // TODO(api): PATCH /api/listings/:id, then land on /listings as the web does.
    // Nothing is persisted yet, so edits won't survive leaving this screen.
    await new Promise((r) => setTimeout(r, 600));
    setPending(false);
    router.replace('/listings');
  };

  const onDelete = () => {
    // TODO(api): DELETE /api/listings/:id — local only, like the list screen.
    setConfirmOpen(false);
    setDeleted(true);
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
      value: String(listing.reviews.length),
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
                  { borderColor: '#fecaca', backgroundColor: pressed ? '#fef2f2' : 'transparent' },
                ]}
              >
                <Trash2 size={14} color="#e11d48" />
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

        {/* Edit form — prefilled from the listing, as on the web. */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            Edit Listing
          </Text>
          <ListingForm
            initial={{
              title: listing.title,
              description: listing.description,
              price: String(listing.price),
              category: listing.category,
              condition: toKnownCondition(listing.condition),
              quantity: String(listing.quantity),
              location: listing.location,
              images: listing.images,
              status: listing.status,
            }}
            submitLabel="Save Changes"
            pendingLabel="Saving..."
            isPending={pending}
            showStatus
            onSubmit={onSubmit}
          />
        </View>
      </KeyboardAwareScroll>

      {/* Delete confirmation — same dialog anatomy as MyListingsScreen. */}
      {confirmOpen ? (
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
      ) : null}
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
    height: 44,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  primaryBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

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
    gap: Spacing.two,
  },
  dialogTitle: { fontSize: 15, fontFamily: Fonts.display[700] },
  dialogBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  cancelBtn: {
    height: 40,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  deleteBtn: {
    height: 40,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
