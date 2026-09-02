import { useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Wallet,
} from '@/components/icons';

import { Fonts, ReadingWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useListing } from '@/features/listings/data/listingsApi';
import { useCheckout } from '@/features/escrow/data/dealsApi';
import { useWallet } from '@/features/wallet/data/walletApi';
import { useTopUp, type PayMethod } from '@/features/wallet/data/paymentsApi';
import { PaymentSheet } from '@/features/wallet/ui/PaymentSheet';

/**
 * Escrow checkout — the phone version of `web/src/pages/Checkout.tsx`.
 *
 * Same flow: item, quantity stepper, the order summary with the split escrow
 * fee, then payment. The web lays it out as two columns with a sticky summary;
 * a phone stacks them and keeps the pay button at the end of the scroll.
 *
 * Choosing *how* to pay happens in the payment sheet rather than on this
 * screen, matching the web. The buyer's wallet balance and a fresh momo/card
 * charge aren't alternatives — the balance is spent first and only the
 * shortfall is charged — so the two have to be decided together, with the
 * split visible, not picked from a radio list up here.
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

function formatMoney(amount: number, currency = 'GHS') {
  const symbol = currency === 'TRX' ? 'TRX ' : 'GH₵ ';
  return `${symbol}${amount.toLocaleString('en-GH', {
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

  const listingQuery = useListing(listingId ?? '');
  const walletQuery = useWallet();
  const checkout = useCheckout();
  const topUp = useTopUp();

  const listing = listingQuery.data;
  const walletBalance = walletQuery.data?.balance ?? 0;

  const [quantity, setQuantity] = useState(1);
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  /**
   * Checkout is not idempotent — a second POST buys a second time. A double
   * tap on the sheet's button, or a re-render while the hosted page is open,
   * would otherwise charge twice, so the guard is a ref rather than state:
   * it has to be true for the *next* synchronous call, not after a re-render.
   */
  const placing = useRef(false);

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

  // Don't claim the listing is gone while we're still asking.
  if (listingQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

  const seller = listing.seller;
  const isOwnListing = Boolean(seller && user?.username === seller.username);
  const soldOut = listing.quantity < 1 || listing.status !== 'active';
  const busy = checkout.isPending || topUp.isPending;

  /**
   * Create the escrow and fund it.
   *
   * `replace`, not `push`: the checkout has been paid, so Back must not return
   * to a screen whose button would buy the same thing again.
   */
  const completeOrder = async (paymentMethod: PayMethod | 'wallet') => {
    const { deal } = await checkout.mutateAsync({ listingId: listing.id, quantity, paymentMethod });
    setPayOpen(false);
    router.replace(`/escrow/${deal.id}`);
  };

  const payFromWallet = async () => {
    if (placing.current) return;
    placing.current = true;
    setPayError(null);
    try {
      await completeOrder('wallet');
    } catch (err) {
      setPayError(apiErrorMessage(err));
    } finally {
      placing.current = false;
    }
  };

  const payWithProvider = async (_walletAmount: number, method: PayMethod) => {
    if (placing.current) return;
    placing.current = true;
    setPayError(null);
    try {
      /*
        Top up only the shortfall, then buy from the wallet.

        The order is deliberate and matters: the wallet is credited first and
        the escrow is funded from it second, so a payment that succeeds while
        the checkout fails leaves the money in the buyer's balance rather than
        vanishing. They can retry, or spend it on something else.
      */
      const shortfall = Math.round((totals.fundingTotal - Math.min(walletBalance, totals.fundingTotal)) * 100) / 100;
      const outcome = await topUp.run(shortfall, method);

      if (!outcome.ok) {
        setPayError(
          outcome.reason === 'cancelled'
            ? 'Payment cancelled — nothing was charged.'
            : "We couldn't confirm that payment. If you were charged, the amount will appear in your wallet shortly.",
        );
        return;
      }
      await completeOrder(method);
    } catch (err) {
      setPayError(apiErrorMessage(err));
    } finally {
      placing.current = false;
    }
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
            {/* A removed seller leaves `seller` null, so this isn't assumed. */}
            {seller ? (
              <Pressable onPress={() => router.push(`/seller/${seller.username}`)} hitSlop={6}>
                <Text style={[styles.itemSeller, { color: theme.textTertiary }]} numberOfLines={1}>
                  @{seller.username}
                  {seller.verified ? ' · Verified' : ''}
                </Text>
              </Pressable>
            ) : null}
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

        {/* Wallet — how it will be spent is chosen in the payment sheet. */}
        {walletBalance > 0 ? (
          <View style={[styles.card, styles.walletRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.walletIcon, { backgroundColor: theme.primaryLight }]}>
              <Wallet size={17} color={theme.primary} />
            </View>
            <View style={styles.walletText}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {formatMoney(walletBalance, listing.currency)} in your wallet
              </Text>
              <Text style={[styles.cardHint, { color: theme.textTertiary }]}>
                {walletBalance >= totals.fundingTotal
                  ? 'Enough to cover this order.'
                  : 'Choose how much to use at payment.'}
              </Text>
            </View>
          </View>
        ) : null}

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
          ) : soldOut ? (
            <View style={styles.ownWarning}>
              <AlertTriangle size={13} color="#92400e" />
              <Text style={styles.ownWarningText}>
                This listing is no longer available to buy.
              </Text>
            </View>
          ) : null}

          {payError ? (
            <View style={[styles.payError, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
              <Text style={styles.payErrorText}>{payError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              setPayError(null);
              setPayOpen(true);
            }}
            disabled={isOwnListing || soldOut || busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: theme.primary,
                opacity: isOwnListing || soldOut || busy ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Lock size={16} color="#ffffff" />
            <Text style={styles.payBtnText}>
              Pay {formatMoney(totals.fundingTotal, listing.currency)} &amp; Fund Escrow
            </Text>
          </Pressable>

          <Text style={[styles.footNote, { color: theme.textTertiary }]}>
            Your payment is held in escrow, not sent to the seller, until you confirm delivery.
          </Text>
        </View>
      </ScrollView>

      <PaymentSheet
        open={payOpen}
        total={totals.fundingTotal}
        balance={walletBalance}
        // The wallet is GHS-only; a TRX listing settles on-chain instead.
        rail={listing.currency === 'TRX' ? 'crypto' : 'fiat'}
        currency={listing.currency}
        isPending={busy}
        errorMessage={payError}
        onClose={() => {
          if (!busy) setPayOpen(false);
        }}
        onPayFromWallet={payFromWallet}
        onPayWithProvider={payWithProvider}
      />
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
    maxWidth: ReadingWidth,
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

  loading: { paddingVertical: Spacing.eight, alignItems: 'center' },

  // Picking a payment method moved into the sheet, so this card only reports
  // the balance the sheet will offer to spend.
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletText: { flex: 1, gap: 2 },

  payError: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  payErrorText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[500], color: '#991b1b' },

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
