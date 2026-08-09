import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { mockDeals, mockProducts } from '@/constants/mockData';

/**
 * Escrow checkout — the phone version of `web/src/pages/Checkout.tsx`.
 *
 * Same flow and copy: item, quantity stepper, simulated payment method, then
 * the order summary with the split escrow fee. The web lays it out as two
 * columns with a sticky summary; a phone stacks them and keeps the pay button
 * at the end of the scroll.
 *
 * Reads `mockProducts`. The web posts the checkout and routes to the new deal;
 * with no API here, paying returns you to My Deals — see `placeOrder`.
 */

/**
 * Mirror of the server's fiat fee so the preview matches: 1.5%, minimum GH₵2,
 * capped at GH₵150. Kept identical to the web's `computeFee`.
 */
function computeFee(amount: number): number {
  let raw = Math.floor(amount * 100 * 0.015) / 100;
  if (raw < 2) raw = 2;
  if (raw > 150) raw = 150;
  return raw;
}

const PAYMENT_METHODS = [
  { id: 'momo' as const, label: 'Mobile Money', hint: 'MTN / Telecel / AirtelTigo', icon: Smartphone },
  { id: 'card' as const, label: 'Debit / Credit Card', hint: 'Visa / Mastercard', icon: CreditCard },
];

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CheckoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  // The web reads ?listing=<id>; expo-router hands query params the same way.
  const { listing: listingId } = useLocalSearchParams<{ listing?: string }>();

  const listing = useMemo(() => mockProducts.find((p) => p.id === listingId), [listingId]);

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card'>('momo');

  const maxQty = listing?.quantity ?? 1;

  const totals = useMemo(() => {
    if (!listing) return null;
    const amount = listing.price * quantity;
    const fee = computeFee(amount);
    const buyerFee = Math.floor((fee / 2) * 100) / 100;
    const sellerFee = fee - buyerFee;
    return {
      amount,
      buyerFee,
      fundingTotal: amount + buyerFee,
      sellerPayout: amount - sellerFee,
    };
  }, [listing, quantity]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/marketplace');
  };

  const backButton = (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back to listing"
      style={({ pressed }) => [
        styles.backRow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <ArrowLeft size={20} color={theme.text} />
      <Text style={[styles.backText, { color: theme.text }]}>Back to Listing</Text>
    </Pressable>
  );

  // The web shows a "Listing unavailable" card when the id doesn't resolve.
  if (!listing || !totals) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.notFound, { color: theme.text }]}>Listing unavailable</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              This listing can&apos;t be checked out — it may have been removed or sold.
            </Text>
            <Pressable
              onPress={() => router.replace('/marketplace')}
              style={({ pressed }) => [
                styles.payBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.payBtnText}>Browse Marketplace</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isOwnListing = user?.username === listing.vendor.username;

  const placeOrder = () => {
    if (isOwnListing) return;
    // The web posts the checkout and then `navigate('/escrow/<new deal id>',
    // { replace: true })` — replace, so Back doesn't return to a checkout that
    // has already been paid. Same here.
    //
    // TODO(api): use the deal id the server returns. Mock data can't create a
    // deal, so stand in with an existing one for this vendor (any deal, if
    // there's none) — otherwise the detail screen would say "Deal not found".
    const standIn =
      mockDeals.find((d) => d.counterparty.username === listing.vendor.username) ?? mockDeals[0];
    router.replace(`/escrow/${standIn.id}`);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {backButton}

        {/* Heading */}
        <View style={styles.heading}>
          <View style={styles.eyebrowRow}>
            <Lock size={13} color={theme.primary} />
            <Text style={[styles.eyebrow, { color: theme.primary }]}>Secure Escrow Checkout</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Review Your Order</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your payment is held in escrow — the seller is only paid after you confirm delivery.
          </Text>
        </View>

        {/* Item */}
        <View style={[styles.card, styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Image source={listing.images[0]} style={styles.itemImage} contentFit="cover" />
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
              {listing.title}
            </Text>
            <Pressable onPress={() => router.push(`/seller/${listing.vendor.username}`)} hitSlop={6}>
              <Text style={[styles.itemSeller, { color: theme.textTertiary }]} numberOfLines={1}>
                @{listing.vendor.username}
                {listing.vendor.verified ? ' · Verified' : ''}
              </Text>
            </Pressable>
            <Text style={[styles.itemPrice, { color: theme.text }]}>
              {formatMoney(listing.price, listing.currency)}{' '}
              <Text style={[styles.itemEach, { color: theme.textTertiary }]}>each</Text>
            </Text>
          </View>
        </View>

        {/* Quantity */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.qtyRow}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Quantity</Text>
              <Text style={[styles.cardHint, { color: theme.textTertiary }]}>
                {maxQty} available
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                style={[
                  styles.stepBtn,
                  { borderColor: theme.border, opacity: quantity <= 1 ? 0.4 : 1 },
                ]}
              >
                <Minus size={16} color={theme.text} />
              </Pressable>
              <Text style={[styles.qtyValue, { color: theme.text }]}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                style={[
                  styles.stepBtn,
                  { borderColor: theme.border, opacity: quantity >= maxQty ? 0.4 : 1 },
                ]}
              >
                <Plus size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Payment Method</Text>

          {PAYMENT_METHODS.map(({ id, label, hint, icon: Icon }) => {
            const on = paymentMethod === id;
            return (
              <Pressable
                key={id}
                onPress={() => setPaymentMethod(id)}
                style={[
                  styles.method,
                  {
                    backgroundColor: on ? theme.primaryLight : theme.inputBackground,
                    borderColor: on ? theme.primary : theme.border,
                  },
                ]}
              >
                <Icon size={20} color={theme.primary} />
                <View style={styles.methodText}>
                  <Text style={[styles.methodLabel, { color: theme.text }]}>{label}</Text>
                  <Text style={[styles.methodHint, { color: theme.textTertiary }]}>{hint}</Text>
                </View>
                {on ? <CheckCircle2 size={16} color={theme.primary} /> : null}
              </Pressable>
            );
          })}

          <Text style={[styles.simNotice, { color: theme.textTertiary }]}>
            Simulated for this prototype — no real payment is taken.
          </Text>
        </View>

        {/* Order summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.summaryTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            Order Summary
          </Text>

          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>
              {formatMoney(listing.price, listing.currency)} × {quantity}
            </Text>
            <Text style={[styles.sumValue, { color: theme.text }]}>
              {formatMoney(totals.amount, listing.currency)}
            </Text>
          </View>

          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: theme.textSecondary }]}>
              Escrow fee (your half)
            </Text>
            <Text style={[styles.sumValue, { color: theme.text }]}>
              {formatMoney(totals.buyerFee, listing.currency)}
            </Text>
          </View>

          <View style={[styles.sumRow, styles.sumTotal, { borderTopColor: theme.border }]}>
            <Text style={[styles.sumTotalLabel, { color: theme.text }]}>You pay</Text>
            <Text style={[styles.sumTotalValue, { color: theme.text }]}>
              {formatMoney(totals.fundingTotal, listing.currency)}
            </Text>
          </View>

          <View style={[styles.escrowNote, { backgroundColor: theme.primaryLight }]}>
            <ShieldCheck size={14} color={theme.primary} />
            <Text style={[styles.escrowNoteText, { color: theme.primary }]}>
              Held in escrow until you confirm delivery. Seller receives{' '}
              {formatMoney(totals.sellerPayout, listing.currency)} on release.
            </Text>
          </View>

          {isOwnListing ? (
            <View style={styles.ownWarning}>
              <AlertTriangle size={13} color="#92400e" />
              <Text style={styles.ownWarningText}>
                This is your own listing — you can&apos;t buy it.
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={placeOrder}
            disabled={isOwnListing}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: theme.primary,
                opacity: isOwnListing ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Lock size={16} color="#ffffff" />
            <Text style={styles.payBtnText}>
              Pay {formatMoney(totals.fundingTotal, listing.currency)} &amp; Fund Escrow
            </Text>
          </Pressable>

          <Text style={[styles.footNote, { color: theme.textTertiary }]}>
            Payment is simulated for this prototype — no card is charged.
          </Text>
        </View>
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

  heading: { gap: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 22, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 13, fontFamily: Fonts.display[700] },
  cardHint: { fontSize: 11, fontFamily: Fonts.sans[400], marginTop: 2 },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  notFound: { fontSize: 17, fontFamily: Fonts.display[700] },

  itemCard: { flexDirection: 'row', alignItems: 'center' },
  itemImage: { height: 72, width: 72, borderRadius: Radius.md },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  itemSeller: { fontSize: 11, fontFamily: Fonts.sans[400] },
  itemPrice: { fontSize: 13, fontFamily: Fonts.sans[700], marginTop: 2 },
  itemEach: { fontSize: 10.5, fontFamily: Fonts.sans[400] },

  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepBtn: {
    height: 38,
    width: 38,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { minWidth: 24, textAlign: 'center', fontSize: 15, fontFamily: Fonts.sans[700] },

  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  methodText: { flex: 1, gap: 1 },
  methodLabel: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  methodHint: { fontSize: 10.5, fontFamily: Fonts.sans[400] },
  simNotice: { fontSize: 10.5, lineHeight: 14, fontFamily: Fonts.sans[400] },

  summaryTitle: {
    fontSize: 14,
    fontFamily: Fonts.display[700],
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sumLabel: { flex: 1, fontSize: 12, fontFamily: Fonts.sans[400] },
  sumValue: { fontSize: 12, fontFamily: Fonts.sans[700] },
  sumTotal: { borderTopWidth: 1, paddingTop: Spacing.two },
  sumTotalLabel: { fontSize: 13, fontFamily: Fonts.sans[700] },
  sumTotalValue: { fontSize: 17, fontFamily: Fonts.display[700] },

  escrowNote: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  escrowNoteText: { flex: 1, fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[500] },

  ownWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  ownWarningText: { flex: 1, fontSize: 11, fontFamily: Fonts.sans[700], color: '#92400e' },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
  },
  payBtnText: { fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
  footNote: { fontSize: 10, textAlign: 'center', fontFamily: Fonts.sans[400] },
});
