import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Minus, Plus, Sparkles, Store, Wallet } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useListing } from '@/features/listings/data/listingsApi';
import { useWallet } from '@/features/wallet/data/walletApi';
import { useTopUp } from '@/features/wallet/data/paymentsApi';
import {
  MAX_PRIORITY,
  PRIORITY_STEP,
  PROMOTION_PLANS,
  getBoostTier,
  getPromotionPlanDetails,
  getPromotionStatusLabel,
  promotionPrice,
  useCancelPromotion,
  useLaunchPromotion,
  usePausePromotion,
  usePromotionMetrics,
  usePromotionQuote,
  useResumePromotion,
  type PromotionPlanId,
  type PromotionStatus,
} from '../data/promotionsApi';

/**
 * Promotion Studio — the phone version of `web/src/pages/PromotionDetail.tsx`.
 *
 * Where a spotlight is actually bought: pick a term, pick a rank, see what the
 * wallet will be charged, buy it.
 *
 * Two deliberate departures from the web.
 *
 * The web drags a range slider; React Native has no built-in one and the
 * community slider isn't a dependency here, so rank is a stepper on the same
 * grid of fives the server validates against. It also removes the need for the
 * web's 250ms debounce — a tap is one discrete move, not a stream of them —
 * though the debounce is kept anyway for the seller who taps quickly.
 *
 * Paying a shortfall reuses `useTopUp`, which keeps the hosted-payment round
 * trip inside one function. The web has to stash a `pendingAction` in
 * sessionStorage and resume on a callback route because its page is gone by
 * then; nothing here is unmounted, so there is nothing to stash or resume.
 */

function formatMoney(amount: number) {
  return `GH₵ ${amount.toLocaleString('en-GH', {
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

const STATUS_STYLE: Record<PromotionStatus, { bg: string; text: string }> = {
  active: { bg: '#dcfce7', text: '#166534' },
  paused: { bg: '#fef3c7', text: '#92400e' },
  expired: { bg: '#e5e7eb', text: '#374151' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

export function PromotionStudioScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { listingId = '' } = useLocalSearchParams<{ listingId: string }>();
  const { user } = useAuth();

  const listingQuery = useListing(listingId);
  const metricsQuery = usePromotionMetrics();
  const metrics = metricsQuery.data;

  const [planId, setPlanId] = useState<PromotionPlanId>('14d');
  const [priority, setPriority] = useState(10);
  // What the quote is keyed on, held one beat behind the stepper so a seller
  // tapping quickly doesn't fire a request per tap.
  const [quotedPriority, setQuotedPriority] = useState(priority);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (quotedPriority === priority) return;
    const timer = setTimeout(() => setQuotedPriority(priority), 250);
    return () => clearTimeout(timer);
  }, [priority, quotedPriority]);

  const walletQuery = useWallet();
  const quoteQuery = usePromotionQuote(listingId, planId, quotedPriority, Boolean(listingId));
  const launch = useLaunchPromotion();
  const pause = usePausePromotion();
  const resume = useResumePromotion();
  const cancel = useCancelPromotion();
  const topUp = useTopUp();

  const quoteData = quoteQuery.data;
  const currentPromotion = quoteData?.current ?? null;

  /*
    Adopt the live run's settings once, when the studio first learns about it.
    A ref rather than an effect dependency: the quote is re-keyed on every
    stepper move, so anything derived from it flickers, and a dependency that
    flickers re-runs the effect and stomps the edit the seller just made. The
    listingId check keeps a quote still in flight for a previous listing from
    adopting its settings here.
  */
  const adoptedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentPromotion || currentPromotion.listingId !== listingId) return;
    if (adoptedRef.current === currentPromotion.id) return;
    adoptedRef.current = currentPromotion.id;
    setPlanId(currentPromotion.planId);
    setPriority(currentPromotion.priority);
    // Moved together, so adopting doesn't cost a debounce round-trip.
    setQuotedPriority(currentPromotion.priority);
  }, [currentPromotion, listingId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/promotions');
  };

  const backButton = (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back to Promotions"
      style={({ pressed }) => [
        styles.backRow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <ArrowLeft size={20} color={theme.text} />
      <Text style={[styles.backText, { color: theme.text }]}>Back to Promotions</Text>
    </Pressable>
  );

  if (listingQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <ActivityIndicator color={theme.primary} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const listing = listingQuery.data;
  if (!listing) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Store size={28} color={theme.textTertiary} />
            <Text style={[styles.notFound, { color: theme.text }]}>Listing not found</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              The product listing you are trying to promote could not be retrieved.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const plans = metrics?.plans ?? PROMOTION_PLANS;
  const maxPriority = metrics?.maxPriority ?? MAX_PRIORITY;
  // The seller pays from their own wallet, so only the owner can buy — admins
  // included. The server enforces the same rule.
  const isOwner = Boolean(user && user.username === listing.seller?.username);
  const isActive = listing.status === 'active';

  const boostTier = getBoostTier(priority);

  /*
    Two grades of freshness, because a held-over quote is right about some of
    its answer and wrong about the rest. What a change does to the *term* —
    which mode it is, the days it adds, when it ends — turns on the plan and the
    live run, not on the rank, so a quote for this plan still answers it at any
    stepper position. The *money* turns on the rank, so it needs a quote for
    exactly this position; until one lands the mirrored formula covers it.
  */
  const planQuote = quoteData?.planId === planId ? quoteData : undefined;
  const priceQuote = planQuote?.priority === priority ? planQuote : undefined;

  // Mirror of the server's amendment rule, for the gap before the quote catches
  // up: no live run pays list price, the same plan pays only the difference in
  // rank, and a different plan buys that term outright.
  const previewMode = !currentPromotion
    ? 'new'
    : currentPromotion.planId === planId
      ? 'priority'
      : 'extend';
  const previewTotal = promotionPrice(planId, priority, plans);
  const previewCharge =
    currentPromotion && previewMode === 'priority'
      ? Math.max(
          0,
          Math.round(
            (previewTotal - promotionPrice(currentPromotion.planId, currentPromotion.priority, plans)) *
              100,
          ) / 100,
        )
      : previewTotal;

  const total = priceQuote?.total ?? previewTotal;
  const charge = priceQuote?.charge ?? previewCharge;
  const mode = planQuote?.mode ?? previewMode;
  const addedDays =
    planQuote?.addedDays ??
    (previewMode === 'priority' ? 0 : getPromotionPlanDetails(planId, plans).days);
  const walletBalance = walletQuery.data?.balance ?? 0;
  const endsAt = planQuote?.endsAt ?? null;

  const shortfall = Math.round(Math.max(0, charge - walletBalance) * 100) / 100;
  const busy = launch.isPending || topUp.isPending;
  const actionBusy = pause.isPending || resume.isPending || cancel.isPending;

  const mutationError = launch.error ?? pause.error ?? resume.error ?? cancel.error ?? null;
  const errorMessage = error ?? (mutationError ? apiErrorMessage(mutationError) : null);

  const onLaunched = (charged: number) => {
    // Back to the hub, as the web does — that's where the run is managed from,
    // and its list and header numbers confirm the purchase landed.
    router.replace({
      pathname: '/promotions',
      params: {
        notice:
          charged > 0
            ? `Spotlight live — ${formatMoney(charged)} debited from your wallet.`
            : 'Spotlight updated — no extra charge for this change.',
      },
    });
  };

  /**
   * Wallet first, the provider for the rest — and nothing to choose, so no
   * picker: a balance that covers the spotlight pays for it outright, and a
   * short one is topped up by exactly the difference. The top-up lands in the
   * wallet, then the launch debits the full price from it, so the seller pays
   * their shortfall once and the balance is spent rather than stranded.
   */
  const startPurchase = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);

    try {
      if (shortfall > 0) {
        // momo is the sheet's default elsewhere and the common rail in Ghana;
        // the provider's own page still offers a card once the buyer is there.
        const outcome = await topUp.run(shortfall, 'momo');
        if (!outcome.ok) {
          setError(
            outcome.reason === 'cancelled'
              ? 'Payment cancelled — nothing was charged.'
              : "We couldn't confirm that payment. If you were charged, the amount will appear in your wallet shortly.",
          );
          return;
        }
      }
      const { charged } = await launch.mutateAsync({ listingId, planId, priority });
      onLaunched(charged);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const ctaLabel =
    charge <= 0
      ? 'Update Promotion'
      : shortfall > 0
        ? `Top up ${formatMoney(shortfall)} & launch`
        : mode === 'extend'
          ? `Add ${addedDays} days for ${formatMoney(charge)}`
          : mode === 'priority'
            ? `Raise rank for ${formatMoney(charge)}`
            : `Launch for ${formatMoney(charge)}`;

  const stepPriority = (delta: number) => {
    setPriority((p) => Math.min(maxPriority, Math.max(0, p + delta)));
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {backButton}

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: theme.primary }]}>
          <View style={styles.heroEyebrow}>
            <Sparkles size={12} color="#ffffff" />
            <Text style={styles.heroEyebrowText}>Promotion Studio</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroThumb}>
              {listing.images?.[0] ? (
                <Image
                  source={{ uri: listing.images[0] }}
                  style={styles.heroThumbImage}
                  contentFit="cover"
                />
              ) : (
                <Store size={22} color="rgba(255,255,255,0.6)" />
              )}
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              <Text style={styles.heroMeta}>
                {formatMoney(listing.price)} · {listing.category}
              </Text>
              {currentPromotion ? (
                <View
                  style={[styles.pill, { backgroundColor: STATUS_STYLE[currentPromotion.status].bg }]}
                >
                  <Text
                    style={[styles.pillText, { color: STATUS_STYLE[currentPromotion.status].text }]}
                  >
                    {currentPromotion.status === 'active'
                      ? 'Live & Promoted'
                      : getPromotionStatusLabel(currentPromotion.status)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>WALLET</Text>
              <Text style={styles.heroStatValue}>{formatMoney(walletBalance)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>BOOST SCORE</Text>
              <Text style={styles.heroStatValue}>{priority} pts</Text>
            </View>
          </View>
        </View>

        {/* Not the owner, or not promotable — say so instead of offering a buy
            button the server will refuse. */}
        {!isOwner ? (
          <View style={[styles.notice, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
            <Text style={styles.noticeText}>
              Only the seller who owns this listing can promote it.
            </Text>
          </View>
        ) : !isActive ? (
          <View style={[styles.notice, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
            <Text style={styles.noticeText}>
              Only active listings can be promoted. This one is {listing.status.replace('_', ' ')}.
            </Text>
          </View>
        ) : null}

        {/* Plans */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Choose a spotlight term</Text>
        {plans.map((plan) => {
          const on = plan.id === planId;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setPlanId(plan.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[
                styles.plan,
                {
                  backgroundColor: on ? theme.primaryLight : theme.card,
                  borderColor: on ? theme.primary : theme.cardBorder,
                },
              ]}
            >
              <View style={styles.planBody}>
                <Text style={[styles.planLabel, { color: theme.text }]}>{plan.label}</Text>
                <Text style={[styles.planDesc, { color: theme.textSecondary }]}>
                  {plan.description}
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: on ? theme.primary : theme.text }]}>
                {formatMoney(promotionPrice(plan.id, priority, plans))}
              </Text>
            </Pressable>
          );
        })}

        {/* Boost rank */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Boost rank</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => stepPriority(-PRIORITY_STEP)}
              disabled={priority <= 0}
              accessibilityRole="button"
              accessibilityLabel="Lower boost rank"
              style={[
                styles.stepBtn,
                { borderColor: theme.border, opacity: priority <= 0 ? 0.4 : 1 },
              ]}
            >
              <Minus size={18} color={theme.text} />
            </Pressable>

            <View style={styles.stepperValue}>
              <Text style={[styles.stepperNumber, { color: theme.text }]}>{priority}</Text>
              <Text style={[styles.stepperTier, { color: boostTier.color }]}>
                {boostTier.label}
              </Text>
            </View>

            <Pressable
              onPress={() => stepPriority(PRIORITY_STEP)}
              disabled={priority >= maxPriority}
              accessibilityRole="button"
              accessibilityLabel="Raise boost rank"
              style={[
                styles.stepBtn,
                { borderColor: theme.border, opacity: priority >= maxPriority ? 0.4 : 1 },
              ]}
            >
              <Plus size={18} color={theme.text} />
            </Pressable>
          </View>

          {/* A bar rather than a slider — it reads the rank out, it isn't a control. */}
          <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
            <View
              style={[
                styles.trackFill,
                { backgroundColor: boostTier.color, width: `${(priority / maxPriority) * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.trackHint, { color: theme.textTertiary }]}>
            Higher rank pins your listing above other promoted items. Rank 0 pays list price; rank{' '}
            {maxPriority} pays double.
          </Text>
        </View>

        {/* Price summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Plan price</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{formatMoney(total)}</Text>
          </View>
          {mode !== 'new' ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                {mode === 'priority' ? 'Rank change only' : `Adds ${addedDays} days`}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {mode === 'priority' ? 'Term unchanged' : `+${addedDays}d`}
              </Text>
            </View>
          ) : null}
          {endsAt ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Runs until</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatDate(endsAt)}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.summaryTotal, { borderTopColor: theme.border }]}>
            <Text style={[styles.summaryTotalLabel, { color: theme.text }]}>Wallet charge</Text>
            <Text style={[styles.summaryTotalValue, { color: theme.primary }]}>
              {formatMoney(charge)}
            </Text>
          </View>
          {shortfall > 0 ? (
            <View style={styles.walletRow}>
              <Wallet size={13} color={theme.textTertiary} />
              <Text style={[styles.walletHint, { color: theme.textTertiary }]}>
                Balance {formatMoney(walletBalance)} — you&apos;ll top up{' '}
                {formatMoney(shortfall)} first.
              </Text>
            </View>
          ) : null}
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        {notice ? (
          <View style={[styles.notice, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <Text style={[styles.noticeText, { color: '#166534' }]}>{notice}</Text>
          </View>
        ) : null}

        {/* Buy */}
        <Pressable
          onPress={startPurchase}
          disabled={busy || !isOwner || !isActive}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !isOwner || !isActive, busy }}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: theme.primary,
              opacity: busy || !isOwner || !isActive ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Sparkles size={15} color="#ffffff" />
          )}
          <Text style={styles.ctaText}>{busy ? 'Processing…' : ctaLabel}</Text>
        </Pressable>

        {/* Managing an existing run */}
        {currentPromotion ? (
          <View style={styles.manageRow}>
            {currentPromotion.status === 'active' ? (
              <Pressable
                onPress={() => pause.mutate(currentPromotion.id)}
                disabled={actionBusy}
                accessibilityRole="button"
                style={[styles.manageBtn, { borderColor: theme.border, opacity: actionBusy ? 0.5 : 1 }]}
              >
                <Text style={[styles.manageText, { color: theme.text }]}>Pause</Text>
              </Pressable>
            ) : currentPromotion.status === 'paused' ? (
              <Pressable
                onPress={() => resume.mutate(currentPromotion.id)}
                disabled={actionBusy}
                accessibilityRole="button"
                style={[styles.manageBtn, { borderColor: theme.border, opacity: actionBusy ? 0.5 : 1 }]}
              >
                <Text style={[styles.manageText, { color: theme.text }]}>Resume</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => cancel.mutate(currentPromotion.id)}
              disabled={actionBusy || currentPromotion.status === 'cancelled'}
              accessibilityRole="button"
              style={[
                styles.manageBtn,
                {
                  borderColor: '#fecaca',
                  opacity: actionBusy || currentPromotion.status === 'cancelled' ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.manageText, { color: '#b91c1c' }]}>Cancel promotion</Text>
            </Pressable>
          </View>
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

  hero: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroEyebrowText: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  heroThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroThumbImage: { width: '100%', height: '100%' },
  heroBody: { flex: 1, gap: 4, minWidth: 0 },
  heroTitle: { fontSize: 16, fontFamily: Fonts.display[700], color: '#ffffff', letterSpacing: -0.3 },
  heroMeta: { fontSize: 11.5, fontFamily: Fonts.sans[400], color: 'rgba(255,255,255,0.85)' },

  heroStats: { flexDirection: 'row', gap: Spacing.two },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 2,
  },
  heroStatLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.sans[700],
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  heroStatValue: { fontSize: 15, fontFamily: Fonts.display[700], color: '#ffffff' },

  pill: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 9.5, fontFamily: Fonts.sans[700] },

  sectionTitle: { fontSize: 14.5, fontFamily: Fonts.display[700], marginTop: Spacing.two },

  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  planBody: { flex: 1, gap: 2, minWidth: 0 },
  planLabel: { fontSize: 13, fontFamily: Fonts.sans[700] },
  planDesc: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },
  planPrice: { fontSize: 14, fontFamily: Fonts.display[700] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { alignItems: 'center', gap: 2 },
  stepperNumber: { fontSize: 28, fontFamily: Fonts.display[700] },
  stepperTier: { fontSize: 11, fontFamily: Fonts.sans[700] },

  track: { height: 8, borderRadius: Radius.full, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: Radius.full },
  trackHint: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },

  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  summaryLabel: { fontSize: 12, fontFamily: Fonts.sans[400] },
  summaryValue: { fontSize: 12, fontFamily: Fonts.sans[600] },
  summaryTotal: { borderTopWidth: 1, paddingTop: Spacing.two },
  summaryTotalLabel: { fontSize: 13, fontFamily: Fonts.sans[700] },
  summaryTotalValue: { fontSize: 15, fontFamily: Fonts.display[700] },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletHint: { flex: 1, fontSize: 10.5, lineHeight: 15, fontFamily: Fonts.sans[400] },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
    marginTop: Spacing.one,
  },
  ctaText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

  manageRow: { flexDirection: 'row', gap: Spacing.two },
  manageBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  manageText: { fontSize: 12, fontFamily: Fonts.sans[700] },

  notice: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  noticeText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600], color: '#78350f' },

  notFound: { fontSize: 16, fontFamily: Fonts.display[700] },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  errorBox: {
    borderRadius: Radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.three,
  },
  errorText: { fontSize: 12, fontFamily: Fonts.sans[600], color: '#b91c1c' },
});
