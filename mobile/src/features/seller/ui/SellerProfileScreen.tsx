import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Store,
  UserX,
} from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useBlocked } from '@/context/BlockedContext';
import { mockProducts } from '@/constants/mockData';

/**
 * Public vendor profile — the phone version of `web/src/pages/SellerProfile.tsx`.
 *
 * Reached from a listing's vendor card, the chat header, checkout and "Block
 * Vendor". Same shape: header with store name, verified pill, handle, country
 * and join date; Message / Block actions; a three-stat strip; and the vendor's
 * active listings. Blocking hides the listings and swaps in the blocked notice,
 * exactly as the web does.
 *
 * The mobile mock has no user directory, so the profile is derived from the
 * vendor attached to their listings. Blocking writes to `BlockedContext`, so a
 * blocked vendor's listings drop out of the marketplace — the web's
 * `useBlockVendor` + marketplace filter, in one place.
 */

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function SellerProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { username = '' } = useLocalSearchParams<{ username: string }>();

  // Shared, so blocking here actually removes the vendor's listings from the
  // marketplace — as it does on the web.
  const { isBlocked, block, unblock } = useBlocked();
  const blocked = isBlocked(username);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState<string | null>(null);

  // Everything this vendor has listed; the first one carries their details.
  const listings = useMemo(
    () => mockProducts.filter((p) => p.vendor.username === username && p.status === 'active'),
    [username],
  );
  const vendor = useMemo(
    () => mockProducts.find((p) => p.vendor.username === username)?.vendor,
    [username],
  );
  const joinedAt = useMemo(
    () => mockProducts.find((p) => p.vendor.username === username)?.createdAt,
    [username],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/marketplace');
  };

  const backButton = (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [
        styles.backRow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <ArrowLeft size={20} color={theme.text} />
      <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
    </Pressable>
  );

  // The web shows "Profile Not Found" for an unknown handle.
  if (!vendor) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.notFound, { color: theme.text }]}>Profile Not Found</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              No vendor with the handle @{username}.
            </Text>
            <Pressable
              onPress={() => router.replace('/marketplace')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Browse Marketplace</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const displayName = vendor.storeName || `@${vendor.username}`;
  const isOwnProfile = user?.username === vendor.username;
  const salesCompleted = listings.reduce((sum, l) => sum + l.reviews.length, 0);

  const confirmBlock = () => {
    if (blockReason.trim().length < 5) {
      setBlockError('Give a short reason so we can act on it.');
      return;
    }
    // TODO(api): POST the block with its reason (web: useBlockVendor).
    setBlockError(null);
    setBlockFormOpen(false);
    block(username, blockReason.trim());
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {backButton}

        {/* Profile header */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.headerRow}>
            {vendor.avatarUrl ? (
              <Image source={vendor.avatarUrl} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarLetter}>
                  {vendor.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={[styles.storeName, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {vendor.verified ? (
                  <View style={styles.verifiedPill}>
                    <ShieldCheck size={12} color="#166534" />
                    <Text style={styles.verifiedText}>Verified Seller</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: theme.textTertiary }]}>@{vendor.username}</Text>
                {listings[0]?.location ? (
                  <View style={styles.metaItem}>
                    <MapPin size={11} color={theme.textTertiary} />
                    <Text style={[styles.meta, { color: theme.textTertiary }]} numberOfLines={1}>
                      {listings[0].location}
                    </Text>
                  </View>
                ) : null}
                {joinedAt ? (
                  <View style={styles.metaItem}>
                    <CalendarDays size={11} color={theme.textTertiary} />
                    <Text style={[styles.meta, { color: theme.textTertiary }]}>
                      Joined {formatJoined(joinedAt)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {!isOwnProfile && !blocked ? (
            <View style={styles.actions}>
              <Pressable
                onPress={() =>
                  router.push(`/messages/${vendor.username}?redirect=/seller/${vendor.username}`)
                }
                style={({ pressed }) => [
                  styles.messageBtn,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <MessageCircle size={16} color="#ffffff" />
                <Text style={styles.messageText}>Message Seller</Text>
              </Pressable>

              <Pressable
                onPress={() => setBlockFormOpen(true)}
                style={({ pressed }) => [
                  styles.blockBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                  },
                ]}
              >
                <UserX size={16} color="#e11d48" />
                <Text style={styles.blockText}>Block</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Block form */}
        {blockFormOpen ? (
          <View style={[styles.card, styles.blockForm, { backgroundColor: theme.card }]}>
            <View style={styles.blockHead}>
              <View style={styles.blockIcon}>
                <UserX size={20} color="#e11d48" />
              </View>
              <View style={styles.blockHeadText}>
                <Text style={[styles.blockTitle, { color: theme.text }]}>Block {displayName}?</Text>
                <Text style={[styles.blockHint, { color: theme.textTertiary }]}>
                  Their listings will be hidden from your feed and contact disabled.
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Why are you blocking this vendor?
            </Text>
            <TextInput
              value={blockReason}
              onChangeText={(v) => {
                setBlockReason(v);
                setBlockError(null);
              }}
              placeholder="e.g. Kept pushing me to pay outside escrow..."
              placeholderTextColor={theme.textTertiary}
              multiline
              textAlignVertical="top"
              style={[
                styles.textarea,
                {
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                },
              ]}
            />
            {blockError ? <Text style={styles.blockError}>{blockError}</Text> : null}

            <View style={styles.blockActions}>
              <Pressable
                onPress={() => {
                  setBlockFormOpen(false);
                  setBlockError(null);
                }}
                style={[styles.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmBlock} style={styles.confirmBlockBtn}>
                <Text style={styles.confirmBlockText}>Block Vendor</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Blocked notice */}
        {blocked ? (
          <View style={[styles.blockedNotice, { borderColor: '#fecaca' }]}>
            <UserX size={18} color="#b91c1c" />
            <View style={styles.blockedText}>
              <Text style={styles.blockedTitle}>You blocked {displayName}</Text>
              <Text style={styles.blockedBody}>
                Their listings are hidden from your feed and contact is disabled.
              </Text>
            </View>
            <Pressable onPress={() => unblock(username)} hitSlop={6}>
              <Text style={styles.unblockText}>Unblock</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Stats */}
        {!blocked ? (
          <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>{listings.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Active Listings</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>{salesCompleted}</Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Completed Sales</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <View style={styles.ratingRow}>
                <Star size={13} color="#f59e0b" fill="#f59e0b" />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {vendor.rating ?? '—'}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Rating</Text>
            </View>
          </View>
        ) : null}

        {/* Listings — hidden while blocked, as on the web */}
        {!blocked ? (
          <>
            <View style={styles.sectionHead}>
              <Store size={17} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>
                Listings by {displayName}
              </Text>
            </View>

            {listings.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No active listings right now.
                </Text>
              </View>
            ) : (
              listings.map((listing) => (
                <Pressable
                  key={listing.id}
                  onPress={() => router.push(`/marketplace/${listing.id}`)}
                  style={({ pressed }) => [
                    styles.listing,
                    {
                      backgroundColor: theme.card,
                      borderColor: pressed ? theme.primary : theme.cardBorder,
                    },
                  ]}
                >
                  <Image source={listing.images[0]} style={styles.listingImage} contentFit="cover" />
                  <View style={styles.listingInfo}>
                    <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text style={[styles.listingMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                      {listing.category} · {listing.condition}
                    </Text>
                    <Text style={[styles.listingPrice, { color: theme.text }]}>
                      {formatMoney(listing.price, listing.currency)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </>
        ) : null}
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

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  notFound: { fontSize: 17, fontFamily: Fonts.display[700] },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { height: 72, width: 72, borderRadius: Radius.lg },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 26, fontFamily: Fonts.sans[700], color: '#ffffff' },
  headerText: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  // Heading uses the web's `font-display`.
  storeName: { flexShrink: 1, fontSize: 19, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 10, fontFamily: Fonts.sans[700], color: '#166534' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 11, fontFamily: Fonts.sans[400] },

  actions: { flexDirection: 'row', gap: Spacing.two },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: Radius.md,
  },
  messageText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  blockText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#e11d48' },

  blockForm: { borderColor: '#fecaca' },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  blockIcon: {
    height: 40,
    width: 40,
    borderRadius: Radius.md,
    backgroundColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockHeadText: { flex: 1, gap: 2 },
  blockTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  blockHint: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400] },
  label: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    minHeight: 80,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  blockError: { fontSize: 11, fontFamily: Fonts.sans[600], color: '#b91c1c' },
  blockActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cancelText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  confirmBlockBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  confirmBlockText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  blockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: '#fef2f2',
    padding: Spacing.three,
  },
  blockedText: { flex: 1, gap: 2 },
  blockedTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#b91c1c' },
  blockedBody: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400], color: '#b91c1c' },
  unblockText: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#b91c1c' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 28 },
  statValue: { fontSize: 17, fontFamily: Fonts.display[700] },
  statLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: Fonts.display[700] },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  listingImage: { height: 60, width: 60, borderRadius: Radius.md },
  listingInfo: { flex: 1, gap: 2 },
  listingTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  listingMeta: { fontSize: 10.5, fontFamily: Fonts.sans[400] },
  listingPrice: { fontSize: 13.5, fontFamily: Fonts.display[700] },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
