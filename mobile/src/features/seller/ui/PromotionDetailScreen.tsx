import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  ArrowLeft,
  BadgeDollarSign,
  Check,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  Sparkles,
  Store,
  Trash2,
  Wallet,
} from '@/components/icons';
import { Fonts, ReadingWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useListing } from '@/features/listings/data/listingsApi';
import { useWallet } from '@/features/wallet/data/walletApi';
import { useTopUp, type PayMethod } from '@/features/wallet/data/paymentsApi';
import { PaymentSheet } from '@/features/wallet/ui/PaymentSheet';
import {
  MAX_PRIORITY,
  PRIORITY_STEP,
  PROMOTION_PLANS,
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
} from '../data/promotions';

/**
 * Promotion studio — the phone version of `web/src/pages/PromotionDetail.tsx`.
 *
 * Same three steps in the same order (plan · rank · preview) and the same
 * investment summary, with the web's pricing logic ported intact: the two
 * grades of quote freshness, the mirrored amendment rule, and the adopt-once
 * ref that stops a re-keyed quote from stomping the seller's edit.
 *
 * Two things are native rather than literal. The web's rank control is an
 * `<input type="range">`; React Native has no built-in slider, so this is
 * quick-pick chips plus a ±`PRIORITY_STEP` stepper over a progress track —
 * the same 0…100 in the same increments, without pulling in a gesture library.
 *
 * And paying: the web stashes a `pendingAction` in sessionStorage and hands the
 * whole browser to the provider, because the page it leaves is gone. The
 * phone's `useTopUp` keeps the flow inside one function, so a shortfall opens
 * the same PaymentSheet every other purchase here uses — which also supplies
 * the momo/card choice the web's promotion path never asks for.
 */

function formatMoney(amount: number, currency = 'GHS') {
  const symbol = currency === 'GHS' ? 'GH₵' : currency;
  return `${symbol} ${amount.toLocaleString('en-GH', {
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

const round2 = (n: number) => Math.round(n * 100) / 100;

function statusBadge(status: PromotionStatus) {
  if (status === 'active') return { label: 'Live & Promoted', bg: '#dcfce7', text: '#166534' };
  if (status === 'paused') return { label: 'Paused', bg: '#fef3c7', text: '#92400e' };
  if (status === 'expired') return { label: 'Expired', bg: '#e5e7eb', text: '#374151' };
  return { label: getPromotionStatusLabel(status), bg: '#fee2e2', text: '#991b1b' };
}

function getBoostTier(score: number) {
  if (score >= 80) return { label: 'Maximum Exposure', color: '#9333ea' };
  if (score >= 50) return { label: 'Turbo Boost', color: '#d97706' };
  if (score >= 20) return { label: 'Enhanced Visibility', color: '#059669' };
  return { label: 'Standard Boost', color: '#2563eb' };
}

const RANKING_RULES = [
  'Promoted listings stay pinned above organic search results.',
  'Higher priority scores win tie-breakers between items.',
  'Paused or cancelled promotions stop affecting search rank.',
  'Pausing banks the time left; resuming picks up where you stopped.',
  'Switching plan buys that term and adds it to the days you have left — you never lose paid time.',
  "Changing only the rank costs the price difference; lowering it is free and isn't refunded.",
  "Cancelling ends the run — the term is bought up front and isn't refunded.",
];

export function PromotionDetailScreen() {
  const theme = useTheme();
  const tones = useTones();
  const router = useRouter();
  const { listingId = '' } = useLocalSearchParams<{ listingId: string }>();
  const { user } = useAuth();

  const listingQuery = useListing(listingId);
  const { data: metrics } = usePromotionMetrics();

  const [planId, setPlanId] = useState<PromotionPlanId>('14d');
  const [priority, setPriority] = useState<number>(10);
  /*
    What the quote is actually keyed on. The stepper moves in fives, so tapping
    it across the range fires one request per step; let the position settle
    first and `keepPreviousData` holds the last answer on screen meanwhile.
  */
  const [quotedPriority, setQuotedPriority] = useState(priority);
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (quotedPriority === priority) return;
    const timer = setTimeout(() => setQuotedPriority(priority), 250);
    return () => clearTimeout(timer);
  }, [priority, quotedPriority]);

  // Same source the deal screens use. Deliberately not read off the quote: a
  // pricing call that fails would then render a real balance as GH₵0.00.
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
    listingId check keeps a quote still in flight for the previous listing from
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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/promotions'));

  if (listingQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.centre}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.centreText, { color: theme.textSecondary }]}>
            Loading promotion studio…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const listing = listingQuery.data;
  if (!listingId || !listing) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.centre}>
          <View style={[styles.centreIcon, { backgroundColor: tones.danger.chip }]}>
            <Store size={28} color={tones.danger.icon} />
          </View>
          <Text style={[styles.centreTitle, { color: theme.text }]}>Listing not found</Text>
          <Text style={[styles.centreText, { color: theme.textSecondary }]}>
            The product listing you are trying to promote could not be retrieved.
          </Text>
          <Pressable
            onPress={() => router.replace('/promotions')}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <ArrowLeft size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Return to Promotions Hub</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const plans = metrics?.plans ?? PROMOTION_PLANS;
  const maxPriority = metrics?.maxPriority ?? MAX_PRIORITY;
  // The seller pays from their own wallet, so only the owner can buy — admins
  // included. The server enforces the same rule.
  const isOwner = Boolean(user && listing.seller && user.username === listing.seller.username);
  const isActive = listing.status === 'active';
  const boostTier = getBoostTier(priority);

  /*
    Two grades of freshness, because a held-over quote is right about some of
    its answer and wrong about the rest. What a change does to the *term* —
    which mode it is, the days it adds, when it ends — turns on the plan and
    the live run, not on the rank, so a quote for this plan still answers it at
    any stepper position. The *money* turns on the rank, so it needs a quote for
    exactly this position; until one lands the mirrored formula covers it.
  */
  const planQuote = quoteData?.planId === planId ? quoteData : undefined;
  const priceQuote = planQuote?.priority === priority ? planQuote : undefined;

  // Mirror of the server's amendment rule (planChange), for the gap before the
  // quote catches up: no live run pays list price, the same plan pays only the
  // difference in rank, and a different plan buys that term outright.
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
          round2(
            previewTotal - promotionPrice(currentPromotion.planId, currentPromotion.priority, plans),
          ),
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

  const busy = launch.isPending || topUp.isPending;
  const mutationError = launch.error ?? pause.error ?? resume.error ?? cancel.error ?? null;
  const errorMessage = payError ?? (mutationError ? apiErrorMessage(mutationError) : null);

  const shortfall = round2(Math.max(0, charge - walletBalance));

  /**
   * Buying is the end of the studio's job, so hand back to the hub — that's
   * where the run is managed from, and its list and header numbers are the
   * confirmation that the purchase landed. The receipt rides along as a route
   * param instead of flashing here on a screen we're leaving.
   */
  const onLaunched = (charged: number) => {
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

  const submitLaunch = async () => {
    const result = await launch.mutateAsync({ listingId, planId, priority });
    setPayOpen(false);
    onLaunched(result.charged);
  };

  /**
   * Wallet first, provider for the rest — a balance that covers the spotlight
   * pays for it outright, and a short one is topped up by exactly the
   * difference. The top-up lands in the wallet, then the launch debits the full
   * price from it, so the seller pays their shortfall once and the balance is
   * spent rather than stranded. Same order as checkout, and for the same
   * reason: if the launch fails after a successful charge, the money is sitting
   * in the wallet rather than lost, and the button can simply be pressed again.
   */
  const startPurchase = async () => {
    setPayError(null);
    if (charge <= 0 || charge <= walletBalance) {
      try {
        await submitLaunch();
      } catch (err) {
        setPayError(apiErrorMessage(err));
      }
      return;
    }
    setPayOpen(true);
  };

  const payWithProvider = async (_walletAmount: number, method: PayMethod) => {
    setPayError(null);
    try {
      const outcome = await topUp.run(shortfall, method);
      if (!outcome.ok) {
        setPayError(
          outcome.reason === 'cancelled'
            ? 'Payment cancelled — nothing was charged.'
            : "We couldn't confirm that payment. If you were charged, the amount will appear in your wallet shortly.",
        );
        return;
      }
      await submitLaunch();
    } catch (err) {
      setPayError(apiErrorMessage(err));
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

  const setRank = (next: number) =>
    setPriority(
      Math.min(maxPriority, Math.max(0, Math.round(next / PRIORITY_STEP) * PRIORITY_STEP)),
    );

  const stepHead = (n: string, title: string) => (
    <View style={styles.stepHead}>
      <View style={[styles.stepNum, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.stepNumText, { color: theme.primary }]}>{n}</Text>
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );

  const line = (label: string, value: string, strong = false) => (
    <View style={styles.line} key={label}>
      <Text style={[styles.lineLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.lineValue, { color: strong ? theme.primary : theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top navigation */}
        <View style={styles.topNav}>
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.backRow,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <ArrowLeft size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back to Promotions Hub</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/marketplace/${listing.id}`)}
            hitSlop={8}
            style={styles.viewLive}
          >
            <Text style={[styles.viewLiveText, { color: theme.primary }]}>View Live Listing</Text>
            <ExternalLink size={13} color={theme.primary} />
          </Pressable>
        </View>

        {/* Hero. The web runs a slate→primary gradient here; RN has no gradient
            without another dependency, so this is the darkest stop flat — the
            same call the splash screen makes. */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {listing.images[0] ? (
              <Image source={listing.images[0]} style={styles.heroThumb} contentFit="cover" />
            ) : (
              <View style={[styles.heroThumb, styles.thumbEmpty]}>
                <Store size={24} color="#94a3b8" />
              </View>
            )}
            <View style={styles.heroBody}>
              <View style={styles.heroPills}>
                <View style={styles.heroPill}>
                  <Sparkles size={12} color="#86efac" />
                  <Text style={styles.heroPillText}>Promotion Studio</Text>
                </View>
                {/* Only once there's a real run — a listing that was never
                    promoted used to render a red "Cancelled" pill. */}
                {currentPromotion ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: statusBadge(currentPromotion.status).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: statusBadge(currentPromotion.status).text },
                      ]}
                    >
                      {statusBadge(currentPromotion.status).label}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              <Text style={styles.heroMeta}>
                {formatMoney(listing.price, listing.currency)} · {listing.category} ·{' '}
                {listing.condition ?? 'Standard condition'}
              </Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>WALLET</Text>
              <Text style={[styles.heroStatValue, { color: '#4ade80' }]}>
                {formatMoney(walletBalance)}
              </Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>BOOST SCORE</Text>
              <Text style={[styles.heroStatValue, { color: '#fcd34d' }]}>{priority} pts</Text>
            </View>
          </View>
        </View>

        {/* Step 1 — plan */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {stepHead('1', 'Select Promotion Duration')}

          {plans.map((plan) => {
            const isSelected = planId === plan.id;
            const isPopular = plan.id === '14d';
            const dailyRate = plan.price / plan.days;

            return (
              <Pressable
                key={plan.id}
                onPress={() => setPlanId(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.plan,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? theme.primaryLight : 'transparent',
                  },
                ]}
              >
                {isPopular ? (
                  <View style={styles.popular}>
                    <Flame size={10} color="#ffffff" />
                    <Text style={styles.popularText}>POPULAR CHOICE</Text>
                  </View>
                ) : null}

                <View style={styles.planHead}>
                  <Text style={[styles.planLabel, { color: theme.text }]}>{plan.label}</Text>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? theme.primary : theme.inputBorder,
                        backgroundColor: isSelected ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected ? <Check size={10} color="#ffffff" /> : null}
                  </View>
                </View>

                <Text style={[styles.planDesc, { color: theme.textSecondary }]}>
                  {plan.description}
                </Text>

                <View style={[styles.planFoot, { borderTopColor: theme.border }]}>
                  <View>
                    <Text style={[styles.planPrice, { color: theme.text }]}>
                      {formatMoney(plan.price)}
                    </Text>
                    <Text style={[styles.planRate, { color: theme.textTertiary }]}>
                      {formatMoney(dailyRate)}/day
                    </Text>
                  </View>
                  <View style={[styles.daysPill, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.daysPillText, { color: theme.primary }]}>
                      {plan.days} Days
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          <Text style={[styles.note, { color: theme.textSecondary }]}>
            Listed prices are at boost 0. Raising the priority rank adds a surcharge — up to double
            at rank {maxPriority}.
          </Text>
        </View>

        {/* Step 2 — rank */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {stepHead('2', 'Priority Rank Controller')}

          <View style={[styles.tier, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.tierText, { color: boostTier.color }]}>
              {boostTier.label} ({priority} pts)
            </Text>
          </View>

          <View style={styles.rankRow}>
            <Text style={[styles.rankLabel, { color: theme.textSecondary }]}>
              Priority Boost Level
            </Text>
            <Text style={[styles.rankValue, { color: theme.text }]}>
              {priority} / {maxPriority} points
            </Text>
          </View>

          <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
            <View
              style={[
                styles.trackFill,
                { backgroundColor: theme.primary, width: `${(priority / maxPriority) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => setRank(priority - PRIORITY_STEP)}
              disabled={priority <= 0}
              accessibilityLabel="Lower priority"
              style={[
                styles.stepBtn,
                { borderColor: theme.border, opacity: priority <= 0 ? 0.4 : 1 },
              ]}
            >
              <Minus size={16} color={theme.text} />
            </Pressable>

            <View style={styles.quickPicks}>
              {[0, 25, 50, maxPriority].map((value) => {
                const active = priority === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRank(value)}
                    style={[
                      styles.quickPick,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primaryLight : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickPickText,
                        { color: active ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {value === 0
                        ? 'Standard'
                        : value === 25
                          ? 'Enhanced'
                          : value === 50
                            ? 'Turbo'
                            : 'Maximum'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setRank(priority + PRIORITY_STEP)}
              disabled={priority >= maxPriority}
              accessibilityLabel="Raise priority"
              style={[
                styles.stepBtn,
                { borderColor: theme.border, opacity: priority >= maxPriority ? 0.4 : 1 },
              ]}
            >
              <Plus size={16} color={theme.text} />
            </Pressable>
          </View>

          <View style={[styles.subCard, { borderColor: theme.border }]}>
            {line('Price at this rank', formatMoney(total))}
            {line('Surcharge over list price', `+${Math.round((priority / maxPriority) * 100)}%`)}
            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Higher priority scores break ties when multiple sellers promote listings in the same
              category.
            </Text>
          </View>
        </View>

        {/* Step 3 — preview */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {stepHead('3', 'Live Marketplace Card Preview')}
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            Here is how your promoted product will appear to buyers browsing search results and
            category feeds:
          </Text>

          <View
            style={[styles.mock, { borderColor: theme.primary, backgroundColor: theme.background }]}
          >
            <View style={styles.mockTags}>
              <View style={styles.promotedTag}>
                <Flame size={12} color="#ffffff" />
                <Text style={styles.promotedTagText}>PROMOTED</Text>
              </View>
              <View style={styles.boostTag}>
                <Text style={styles.boostTagText}>Boost {priority}</Text>
              </View>
            </View>

            {listing.images[0] ? (
              <Image source={listing.images[0]} style={styles.mockImage} contentFit="cover" />
            ) : (
              <View
                style={[
                  styles.mockImage,
                  styles.thumbEmpty,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <Store size={32} color={theme.textTertiary} />
              </View>
            )}

            <Text style={[styles.category, { color: theme.textTertiary }]}>
              {listing.category.toUpperCase()}
            </Text>
            <Text style={[styles.mockTitle, { color: theme.text }]} numberOfLines={1}>
              {listing.title}
            </Text>
            <View style={[styles.mockFoot, { borderTopColor: theme.border }]}>
              <Text style={[styles.mockPrice, { color: theme.text }]}>
                {formatMoney(listing.price, listing.currency)}
              </Text>
              <View style={styles.verified}>
                <Text style={styles.verifiedText}>Verified Seller</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Summary + actions */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.summaryHead, { borderBottomColor: theme.border }]}>
            <Text style={[styles.summaryKicker, { color: theme.primary }]}>CAMPAIGN OVERVIEW</Text>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>Investment Summary</Text>
          </View>

          {line('Selected Plan', getPromotionPlanDetails(planId, plans).label)}
          {line(`Price at boost ${priority}`, formatMoney(total))}
          {currentPromotion
            ? line('Spent on this run so far', formatMoney(currentPromotion.amount))
            : null}
          {mode === 'extend' ? line('Adds to your run', `+${addedDays} days`, true) : null}
          {line('Wallet balance', formatMoney(walletBalance))}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {line('Start Date', formatDate(currentPromotion?.startsAt ?? new Date().toISOString()))}
          {line('Expiration Date', endsAt ? formatDate(endsAt) : '—')}

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>
              {mode === 'extend'
                ? 'DUE NOW (EXTENSION)'
                : mode === 'priority'
                  ? 'DUE NOW (RANK CHANGE)'
                  : 'TOTAL CAMPAIGN COST'}
            </Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{formatMoney(charge)}</Text>
              <Text style={styles.totalCurrency}>GHS Fiat</Text>
            </View>
            <Text style={styles.totalNote}>
              {charge <= 0
                ? 'Lowering the rank costs nothing — and refunds nothing.'
                : shortfall <= 0
                  ? 'Debited from your wallet balance.'
                  : `${formatMoney(walletBalance)} comes from your wallet — the remaining ${formatMoney(shortfall)} is topped up first.`}
            </Text>
          </View>

          {errorMessage ? (
            <View
              style={[
                styles.error,
                { backgroundColor: tones.danger.chip, borderColor: tones.danger.border },
              ]}
            >
              <Text style={[styles.errorText, { color: tones.danger.text }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={startPurchase}
            disabled={!isActive || !isOwner || busy}
            accessibilityRole="button"
            style={[
              styles.primaryBtn,
              {
                backgroundColor: theme.primary,
                opacity: !isActive || !isOwner || busy ? 0.5 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : shortfall > 0 ? (
              <Wallet size={16} color="#ffffff" />
            ) : (
              <BadgeDollarSign size={16} color="#ffffff" />
            )}
            <Text style={styles.primaryBtnText}>{busy ? 'Processing…' : ctaLabel}</Text>
          </Pressable>

          {currentPromotion?.status === 'active' ? (
            <Pressable
              onPress={() => pause.mutate(currentPromotion.id)}
              disabled={pause.isPending}
              style={[
                styles.secondaryBtn,
                { borderColor: theme.border, opacity: pause.isPending ? 0.5 : 1 },
              ]}
            >
              <PauseCircle size={15} color={theme.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                Pause Promotion
              </Text>
            </Pressable>
          ) : null}

          {currentPromotion?.status === 'paused' ? (
            <Pressable
              onPress={() => resume.mutate(currentPromotion.id)}
              disabled={resume.isPending}
              style={[
                styles.secondaryBtn,
                { borderColor: theme.border, opacity: resume.isPending ? 0.5 : 1 },
              ]}
            >
              <PlayCircle size={15} color={theme.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                Resume Promotion
              </Text>
            </Pressable>
          ) : null}

          {currentPromotion ? (
            <Pressable
              onPress={() => cancel.mutate(currentPromotion.id)}
              disabled={cancel.isPending}
              style={[
                styles.secondaryBtn,
                {
                  borderColor: tones.danger.border,
                  backgroundColor: tones.danger.surface,
                  opacity: cancel.isPending ? 0.5 : 1,
                },
              ]}
            >
              <Trash2 size={14} color={tones.danger.icon} />
              <Text style={[styles.secondaryBtnText, { color: tones.danger.text }]}>
                Cancel Promotion
              </Text>
            </Pressable>
          ) : null}

          {!isOwner ? (
            <View
              style={[
                styles.callout,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}
            >
              <View style={styles.calloutHead}>
                <Info size={14} color={theme.text} />
                <Text style={[styles.calloutTitle, { color: theme.text }]}>Not your listing</Text>
              </View>
              <Text style={[styles.calloutText, { color: theme.textSecondary }]}>
                A spotlight is charged to the seller&apos;s own wallet, so only the owner can buy
                one.
              </Text>
            </View>
          ) : null}

          {!isActive ? (
            <View
              style={[
                styles.callout,
                { borderColor: tones.warning.border, backgroundColor: tones.warning.surface },
              ]}
            >
              <View style={styles.calloutHead}>
                <Info size={14} color={tones.warning.text} />
                <Text style={[styles.calloutTitle, { color: tones.warning.text }]}>
                  Inactive Listing
                </Text>
              </View>
              <Text style={[styles.calloutText, { color: tones.warning.text }]}>
                This listing must be active before it can be promoted — update its status from My
                Listings.
                {currentPromotion
                  ? ' Its current spotlight keeps running in the meantime, and the clock does not stop on its own: pause it below to bank the time you have left.'
                  : ''}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.callout,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}
          >
            <View style={styles.calloutHead}>
              <HelpCircle size={14} color={theme.primary} />
              <Text style={[styles.calloutTitle, { color: theme.text }]}>
                Promotion Ranking Rules
              </Text>
            </View>
            {RANKING_RULES.map((rule) => (
              <Text key={rule} style={[styles.calloutText, { color: theme.textSecondary }]}>
                • {rule}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Only ever opened for a shortfall — a covered charge launches outright. */}
      <PaymentSheet
        open={payOpen}
        total={charge}
        balance={walletBalance}
        isPending={busy}
        errorMessage={payError}
        onClose={() => {
          if (!busy) setPayOpen(false);
        }}
        onPayFromWallet={() => {
          void submitLaunch().catch((err) => setPayError(apiErrorMessage(err)));
        }}
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
    gap: Spacing.four,
    width: '100%',
    maxWidth: ReadingWidth,
    alignSelf: 'center',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.six,
  },
  centreIcon: {
    height: 56,
    width: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreTitle: { fontSize: 19, fontFamily: Fonts.display[700] },
  centreText: { fontSize: 12.5, lineHeight: 19, textAlign: 'center', fontFamily: Fonts.sans[400] },

  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backText: { fontSize: 12.5, fontFamily: Fonts.sans[600] },
  viewLive: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  viewLiveText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  hero: {
    gap: Spacing.four,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    backgroundColor: '#0f172a',
  },
  heroTop: { flexDirection: 'row', gap: Spacing.three },
  heroThumb: { height: 72, width: 72, borderRadius: Radius.lg, backgroundColor: '#1e293b' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  heroBody: { flex: 1, gap: Spacing.one },
  heroPills: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.3)',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  heroPillText: { fontSize: 10, color: '#86efac', fontFamily: Fonts.sans[700] },
  heroTitle: { fontSize: 20, lineHeight: 26, color: '#ffffff', fontFamily: Fonts.display[700] },
  heroMeta: { fontSize: 11.5, color: '#cbd5e1', fontFamily: Fonts.sans[400] },
  heroStats: { flexDirection: 'row', gap: Spacing.two },
  heroStat: {
    flex: 1,
    gap: 2,
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
  },
  heroStatLabel: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#cbd5e1',
    fontFamily: Fonts.sans[700],
  },
  heroStatValue: { fontSize: 17, fontFamily: Fonts.display[700] },

  card: { gap: Spacing.three, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepNum: {
    height: 24,
    width: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 11, fontFamily: Fonts.sans[800] },
  stepTitle: { flex: 1, fontSize: 15, fontFamily: Fonts.display[700] },

  plan: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.two,
  },
  popular: {
    position: 'absolute',
    top: -10,
    left: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.full,
    backgroundColor: '#f59e0b',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  popularText: { fontSize: 8.5, letterSpacing: 0.6, color: '#ffffff', fontFamily: Fonts.sans[800] },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planLabel: { fontSize: 13.5, fontFamily: Fonts.display[700] },
  radio: {
    height: 18,
    width: 18,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDesc: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },
  planFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  planPrice: { fontSize: 17, fontFamily: Fonts.display[700] },
  planRate: { fontSize: 10, fontFamily: Fonts.sans[400] },
  daysPill: { borderRadius: Radius.sm, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  daysPillText: { fontSize: 10, fontFamily: Fonts.sans[700] },

  note: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },

  tier: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  tierText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rankLabel: { fontSize: 12, fontFamily: Fonts.sans[600] },
  rankValue: { fontSize: 12, fontFamily: Fonts.mono },
  track: { height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: Radius.full },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBtn: {
    height: 38,
    width: 38,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPicks: { flex: 1, flexDirection: 'row', gap: Spacing.one },
  quickPick: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  quickPickText: { fontSize: 10, fontFamily: Fonts.sans[700] },

  subCard: { gap: Spacing.two, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  lineLabel: { flex: 1, fontSize: 11.5, fontFamily: Fonts.sans[400] },
  lineValue: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  divider: { height: 1, marginVertical: Spacing.one },

  mock: { gap: Spacing.two, borderWidth: 2, borderRadius: Radius.lg, padding: Spacing.three },
  mockTags: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promotedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.full,
    backgroundColor: '#f59e0b',
    paddingHorizontal: Spacing.three,
    paddingVertical: 3,
  },
  promotedTagText: {
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#ffffff',
    fontFamily: Fonts.sans[800],
  },
  boostTag: {
    borderRadius: Radius.full,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  boostTagText: { fontSize: 9.5, color: '#ffffff', fontFamily: Fonts.sans[700] },
  mockImage: { height: 160, width: '100%', borderRadius: Radius.md },
  category: { fontSize: 9.5, letterSpacing: 0.6, fontFamily: Fonts.sans[700] },
  mockTitle: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  mockFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  mockPrice: { fontSize: 15, fontFamily: Fonts.display[700] },
  verified: {
    borderRadius: Radius.sm,
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  verifiedText: { fontSize: 10, color: '#166534', fontFamily: Fonts.sans[700] },

  summaryHead: { gap: 2, borderBottomWidth: 1, paddingBottom: Spacing.three },
  summaryKicker: { fontSize: 10, letterSpacing: 0.8, fontFamily: Fonts.sans[700] },
  summaryTitle: { fontSize: 18, fontFamily: Fonts.display[700] },

  totalBox: { gap: 2, borderRadius: Radius.lg, backgroundColor: '#0f172a', padding: Spacing.four },
  totalLabel: { fontSize: 9.5, letterSpacing: 0.8, color: '#94a3b8', fontFamily: Fonts.sans[700] },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  totalValue: { fontSize: 24, color: '#4ade80', fontFamily: Fonts.display[700] },
  totalCurrency: { fontSize: 11, color: '#cbd5e1', fontFamily: Fonts.sans[500] },
  totalNote: { fontSize: 10, lineHeight: 15, color: '#94a3b8', fontFamily: Fonts.sans[400] },

  error: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: { fontSize: 11.5, lineHeight: 17, fontFamily: Fonts.sans[600] },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  primaryBtnText: { fontSize: 12.5, color: '#ffffff', fontFamily: Fonts.sans[700] },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  secondaryBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  callout: { gap: Spacing.one, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four },
  calloutHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  calloutTitle: { fontSize: 12, fontFamily: Fonts.sans[700] },
  calloutText: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },

  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  badgeText: { fontSize: 9.5, fontFamily: Fonts.sans[700] },
});
