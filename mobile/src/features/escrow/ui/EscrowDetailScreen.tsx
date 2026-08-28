import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Lock,
  FileText,
  MessageCircle,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Truck,
} from '@/components/icons';

import { Accent, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  useCancelDeal,
  useFundDeal,
  useDeal,
  useDeliverDeal,
  useDisputeDeal,
  useReleaseDeal,
  useUpdateEscrow,
  type EscrowAction,
} from '../data/dealsApi';
import {
  useCheckCryptoDeposit,
  useCryptoDeposit,
  useStartCryptoDeposit,
} from '../data/cryptoApi';
import { useWallet } from '@/features/wallet/data/walletApi';
import { useTopUp, type PayMethod } from '@/features/wallet/data/paymentsApi';
import { PaymentSheet } from '@/features/wallet/ui/PaymentSheet';
import { CryptoDepositPanel } from './CryptoDepositPanel';
import { statusBadge, TONE_COLORS, type DealStatus } from './dealStatus';

/**
 * Escrow deal detail — the phone version of `web/src/pages/EscrowDetail.tsx`.
 *
 * Same spine: header with status and escrow amount, the parties, deal terms,
 * the audit timeline, and a role- and status-aware action panel. The web opens
 * its dispatch / dispute / edit forms in modals; on a phone they expand inline
 * so there's no nested-scroll trap.
 *
 * Reads `GET /api/escrows/:id` and writes through the same endpoints the web
 * uses: deliver, release, cancel, dispute and a terms edit. Which of those are
 * offered comes from the server's `availableActions`, never from a local guess.
 */

/**
 * Human copy per audit event.
 *
 * The server stores only a machine name (`resolve_release`, `fund`) and no
 * sentence, so without this the timeline printed raw identifiers at the user —
 * twice, since the row shows a title and a description.
 */
const EVENT_COPY: Record<string, { label: string; text: string }> = {
  created: { label: 'Created', text: 'Escrow deal created.' },
  joined: { label: 'Joined', text: 'The counterparty accepted and joined this deal.' },
  updated: { label: 'Updated', text: 'Deal terms were changed.' },
  fund: { label: 'Funded', text: 'Payment received and locked in escrow.' },
  funded: { label: 'Funded', text: 'Payment received and locked in escrow.' },
  deliver: { label: 'Delivered', text: 'The seller marked this as delivered.' },
  release: {
    label: 'Released',
    text: 'Receipt confirmed — the escrow was released to the seller.',
  },
  dispute: {
    label: 'Disputed',
    text: 'A dispute was opened. Funds stay frozen until an admin rules.',
  },
  resolve_release: {
    label: 'Dispute Resolved',
    text: 'An admin ruled for the seller and released the funds.',
  },
  resolve_refund: {
    label: 'Dispute Resolved',
    text: 'An admin ruled for the buyer and refunded the funds.',
  },
  resolve_partial: {
    label: 'Dispute Resolved',
    text: 'An admin split the escrow between both parties.',
  },
  cancel: { label: 'Cancelled', text: 'The deal was cancelled and the buyer refunded.' },
};

/** Falls back to a tidied version of the name rather than printing raw snake_case. */
function eventCopy(event: string) {
  return (
    EVENT_COPY[event] ?? {
      label: event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      text: '',
    }
  );
}

const DISPUTE_REASONS = [
  { value: 'not_delivered', label: 'Item was never delivered' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'service_not_done', label: 'Service not completed' },
  { value: 'other', label: 'Other' },
];

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStamp(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EscrowDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const dealQuery = useDeal(id ?? '');

  /**
   * Adapts the server's deal onto the shape this screen was written against.
   *
   * The two differ in three ways worth naming: the server sends `buyer`/`seller`
   * plus `myRole` rather than the mock's creator/counterparty pair; tracking is
   * flat (`carrier` + `trackingNumber`); and audit rows use `event`/`actorRole`
   * where the mock used `type`/`actor` and carried a written description.
   *
   * Mapping here keeps the whole render below untouched, and puts every rename
   * in one place instead of scattering them through the JSX.
   */
  const deal = useMemo(() => {
    const d = dealQuery.data;
    if (!d) return undefined;

    const other = d.myRole === 'seller' ? d.buyer : d.seller;

    return {
      id: d.id,
      code: d.code,
      title: d.title,
      description: d.description ?? '',
      status: d.status,
      rail: d.rail,
      currency: d.currency,
      amount: d.amount,
      /**
       * Which side you are, straight from the server. This screen used to work
       * it out by comparing `creatorUsername` against the signed-in handle,
       * which only holds while every deal is buyer-created — a seller-created
       * deal inverted the whole screen, labelling the seller "You (Buyer)" and
       * offering them the buyer's release button.
       */
      myRole: d.myRole,
      isBuyer: d.myRole === 'buyer',
      buyerUsername: d.buyer?.username ?? d.creatorUsername,
      sellerUsername: d.seller?.username ?? '—',
      counterparty: { username: other?.username ?? '—' },
      /** Server-computed, fees and all — see the note on `formatMoney` below. */
      fundingTotal: d.fundingTotal,
      sellerPayout: d.sellerPayout,
      availableActions: d.availableActions,
      /** Distinguishes "cancel and refund" from "cancel, nothing has moved". */
      fundedAt: d.fundedAt,
      tracking: d.trackingNumber
        ? { carrier: d.carrier ?? 'Carrier', code: d.trackingNumber }
        : undefined,
      // The server has no free-text release condition; the delivery note is the
      // nearest equivalent it does send.
      releaseCondition: d.deliveryNote ?? '',
      events: d.events.map((e) => {
        const copy = eventCopy(e.event);
        return {
          id: e.id,
          type: copy.label,
          description: copy.text,
          actor: e.actorRole,
          createdAt: e.createdAt,
        };
      }),
    };
  }, [dealQuery.data]);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('not_delivered');
  const [disputeDesc, setDisputeDesc] = useState('');

  // Dispatch form — all three optional, matching the web and the server.
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  /**
   * Releasing is irreversible and it is the buyer's money, so it takes a second
   * tap rather than firing on the first. The web opens a confirm modal here.
   */
  const [confirmRelease, setConfirmRelease] = useState(false);

  // Amending terms, allowed only before funding.
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRole, setEditRole] = useState<'buyer' | 'seller'>('buyer');

  const deliverDeal = useDeliverDeal();
  const releaseDeal = useReleaseDeal();
  const cancelDeal = useCancelDeal();
  const fundDeal = useFundDeal();
  const wallet = useWallet();
  const topUp = useTopUp();

  /*
    Crypto rail. The deposit query is only meaningful for a TRX deal, so it is
    gated on the rail rather than fired for every deal and discarded — the same
    shape the web uses. `dealQuery.data` is read directly here because `deal`
    (the adapter below) is not in scope yet at hook-declaration time.
  */
  const isCryptoDeal = dealQuery.data?.rail === 'crypto';
  const depositQuery = useCryptoDeposit(id ?? '', Boolean(isCryptoDeal));
  const startCrypto = useStartCryptoDeposit();
  const checkCrypto = useCheckCryptoDeposit();

  const [fundOpen, setFundOpen] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  /** Funding isn't idempotent either — see the same guard in CheckoutScreen. */
  const funding = useRef(false);
  const disputeDeal = useDisputeDeal();
  const updateEscrow = useUpdateEscrow();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/deals');
  };

  const backButton = (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back to My Deals"
      style={({ pressed }) => [
        styles.backRow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <ArrowLeft size={20} color={theme.text} />
      <Text style={[styles.backText, { color: theme.text }]}>Back to My Deals</Text>
    </Pressable>
  );

  /**
   * Must come before the not-found branch: the fetch takes seconds against a
   * database this far away, and without it a perfectly real deal would show
   * "Deal not found" for the whole wait before correcting itself.
   */
  if (dealQuery.isLoading) {
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

  // The web renders a "Deal not found" card for an id it can't resolve.
  if (!deal) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {backButton}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.notFound, { color: theme.text }]}>Deal not found</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              This deal doesn&apos;t exist, or you&apos;re not a party to it.
            </Text>
            <Pressable
              onPress={() => router.replace('/deals')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Go to My Deals</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const badge = statusBadge(deal.status as DealStatus);
  const tone = TONE_COLORS[badge.tone];

  const isBuyer = deal.isBuyer;
  const other = deal.counterparty;

  /**
   * Which buttons to show, mirroring the web's `has(...)`.
   *
   * Read off `availableActions` rather than re-derived from `status`, because
   * only the server knows the whole rule — an already-disputed deal, a deal
   * whose auto-release window has passed, a party who has already acted. The
   * old local guess could offer an action the server would then refuse.
   */
  const has = (a: EscrowAction) => deal.availableActions.includes(a);
  const isDone = deal.status === 'disbursed';
  /** Pre-funding cancels move no money, so the copy must drop the refund claim. */
  const cancelRefunds = Boolean(deal.fundedAt);

  const busy =
    deliverDeal.isPending ||
    releaseDeal.isPending ||
    cancelDeal.isPending ||
    disputeDeal.isPending ||
    fundDeal.isPending ||
    topUp.isPending;

  const actionError =
    deliverDeal.error ?? releaseDeal.error ?? cancelDeal.error ?? disputeDeal.error;

  const walletBalance = wallet.data?.balance ?? 0;

  const payFromWallet = async () => {
    if (funding.current) return;
    funding.current = true;
    setFundError(null);
    try {
      await fundDeal.mutateAsync(deal.id);
      setFundOpen(false);
    } catch (err) {
      setFundError(apiErrorMessage(err));
    } finally {
      funding.current = false;
    }
  };

  const payWithProvider = async (_walletAmount: number, method: PayMethod) => {
    if (funding.current) return;
    funding.current = true;
    setFundError(null);
    try {
      /*
        Top up the shortfall first, then fund from the wallet — the same order
        as checkout, and for the same reason: if the funding call fails after a
        successful charge, the money is sitting in the buyer's balance rather
        than lost, and the button can simply be pressed again.
      */
      const shortfall =
        Math.round((deal.fundingTotal - Math.min(walletBalance, deal.fundingTotal)) * 100) / 100;
      const outcome = await topUp.run(shortfall, method);

      if (!outcome.ok) {
        setFundError(
          outcome.reason === 'cancelled'
            ? 'Payment cancelled — nothing was charged.'
            : "We couldn't confirm that payment. If you were charged, the amount will appear in your wallet shortly.",
        );
        return;
      }
      await fundDeal.mutateAsync(deal.id);
      setFundOpen(false);
    } catch (err) {
      setFundError(apiErrorMessage(err));
    } finally {
      funding.current = false;
    }
  };

  /**
   * Open the hosted TRX invoice.
   *
   * `openBrowserAsync`, not the `openAuthSessionAsync` the fiat top-up uses: the
   * provider's success URL points at `WEB_ORIGIN` (see `crypto.service`), so no
   * redirect ever comes back to the app and there is no return URL to wait on.
   * That costs nothing here, because arriving back was never what confirmed a
   * crypto deposit — the chain is. Closing the browser just re-checks, and the
   * panel below keeps polling either way.
   */
  const payWithCrypto = async () => {
    setFundError(null);
    try {
      const deposit = await startCrypto.mutateAsync(deal.id);
      setFundOpen(false);
      if (deposit.invoiceUrl) {
        await WebBrowser.openBrowserAsync(deposit.invoiceUrl);
        // Back in the app: ask once immediately rather than waiting out a poll
        // interval, since a buyer who has just paid is watching this screen.
        checkCrypto.mutate({ escrowId: deal.id });
      }
    } catch (err) {
      setFundError(apiErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {backButton}

        {/* Header */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.headRow}>
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.badgeText, { color: tone.text }]}>{badge.label}</Text>
            </View>
            <Text style={[styles.code, { color: theme.textTertiary }]}>{deal.code}</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{deal.title}</Text>

          <View style={styles.amountBlock}>
            <Text style={[styles.amountLabel, { color: theme.textTertiary }]}>Escrow Amount</Text>
            <Text style={[styles.amount, { color: theme.primary }]}>
              {formatMoney(deal.amount, deal.currency)}
            </Text>
            <Text style={[styles.rail, { color: theme.textTertiary }]}>
              {deal.rail.toUpperCase()} · {deal.currency}
            </Text>
          </View>

          {/* Parties */}
          <View style={[styles.parties, { borderTopColor: theme.border }]}>
            <View style={styles.party}>
              <Text style={[styles.partyLabel, { color: theme.textTertiary }]}>
                {isBuyer ? 'You (Buyer)' : 'Buyer'}
              </Text>
              <Text style={[styles.partyName, { color: theme.text }]} numberOfLines={1}>
                @{deal.buyerUsername}
              </Text>
            </View>
            <View style={styles.party}>
              <Text style={[styles.partyLabel, { color: theme.textTertiary }]}>
                {isBuyer ? 'Seller' : 'You (Seller)'}
              </Text>
              <Text style={[styles.partyName, { color: theme.text }]} numberOfLines={1}>
                @{deal.sellerUsername}
              </Text>
            </View>
          </View>

          {/* On a disputed deal the web turns this amber and relabels it, since
              the thread is where evidence gets submitted. */}
          <Pressable
            onPress={() =>
              router.push(`/messages/${other.username}?redirect=/escrow/${deal.id}`)
            }
            style={({ pressed }) => [
              styles.messageBtn,
              deal.status === 'disputed'
                ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }
                : {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: theme.border,
                  },
              deal.status === 'disputed' && pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <MessageCircle size={15} color={deal.status === 'disputed' ? '#ffffff' : theme.text} />
            <Text
              style={[
                styles.messageText,
                { color: deal.status === 'disputed' ? '#ffffff' : theme.text },
              ]}
            >
              {deal.status === 'disputed'
                ? 'Open Dispute Chat & Submit Evidence'
                : `Message @${other.username}`}
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Actions</Text>

          {/* Why the server refused — insufficient balance on a fund, a deal
              someone else already moved, a dispute window that has closed.
              Without this a rejected action just leaves the button sitting
              there as though nothing happened. */}
          {actionError ? (
            <View style={[styles.errorBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <AlertCircle size={14} color="#b91c1c" />
              <Text style={styles.errorText}>{apiErrorMessage(actionError)}</Text>
            </View>
          ) : null}

          {isDone ? (
            <View style={[styles.doneBox, { backgroundColor: theme.primaryLight }]}>
              <CheckCircle2 size={18} color={theme.primary} />
              <Text style={[styles.doneText, { color: theme.primary }]}>
                {isBuyer
                  ? 'Completed — funds released to the seller.'
                  : 'Payout released to your wallet.'}
              </Text>
            </View>
          ) : null}

          {/* Only while the deal is still `created` — once funded the terms are
              locked, same condition as the web's `deal.status === 'created'`. */}
          {deal.status === 'created' && !editOpen ? (
            <Pressable
              onPress={() => {
                // Seed from the deal so the form opens on the current terms
                // rather than empty — the web does this in an effect.
                setEditTitle(deal.title);
                setEditAmount(String(deal.amount));
                setEditDesc(deal.description);
                setEditRole(deal.myRole === 'seller' ? 'seller' : 'buyer');
                setEditOpen(true);
              }}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderWidth: 1,
                  borderColor: theme.border,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Pencil size={16} color={theme.text} />
              <Text style={[styles.primaryBtnText, { color: theme.text }]}>Edit Deal Terms</Text>
            </Pressable>
          ) : null}

          {deal.status === 'created' && editOpen ? (
            <View style={[styles.formBox, { borderColor: theme.border }]}>
              <Text style={[styles.formHead, { color: theme.textSecondary }]}>Edit Deal Terms</Text>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Title</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="What is this deal for?"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Amount ({deal.currency})
              </Text>
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Side</Text>
              <View style={styles.roleRow}>
                {(['buyer', 'seller'] as const).map((role) => {
                  const on = editRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => setEditRole(role)}
                      style={[
                        styles.roleBtn,
                        {
                          backgroundColor: on ? theme.primaryLight : theme.inputBackground,
                          borderColor: on ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          { color: on ? theme.primary : theme.textSecondary },
                        ]}
                      >
                        I&apos;m the {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Terms, condition, delivery expectations..."
                placeholderTextColor={theme.textTertiary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                    minHeight: 64,
                  },
                ]}
              />

              {updateEscrow.error ? (
                <Text style={styles.errorText}>{apiErrorMessage(updateEscrow.error)}</Text>
              ) : null}

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => setEditOpen(false)}
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    // Same guard as the web: a blank title or a non-positive
                    // amount is rejected here rather than round-tripped.
                    const amount = Number(editAmount);
                    if (!editTitle.trim() || !Number.isFinite(amount) || amount <= 0) return;
                    updateEscrow.mutate(
                      {
                        id: deal.id,
                        title: editTitle.trim(),
                        amount,
                        role: editRole,
                        description: editDesc.trim() || undefined,
                      },
                      { onSuccess: () => setEditOpen(false) },
                    );
                  }}
                  disabled={updateEscrow.isPending}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    {
                      backgroundColor: theme.primary,
                      opacity: updateEscrow.isPending ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {updateEscrow.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Pencil size={14} color="#ffffff" />
                  )}
                  <Text style={styles.submitBtnText}>Save Terms</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {has('DELIVER') && !deliverOpen ? (
            <Pressable
              onPress={() => setDeliverOpen(true)}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.text, opacity: busy ? 0.5 : pressed ? 0.85 : 1 },
              ]}
            >
              <Truck size={16} color={theme.background} />
              <Text style={[styles.primaryBtnText, { color: theme.background }]}>
                Mark as Dispatched
              </Text>
            </Pressable>
          ) : null}

          {has('DELIVER') && deliverOpen ? (
            <View style={[styles.formBox, { borderColor: theme.border }]}>
              <Text style={[styles.formHead, { color: theme.textSecondary }]}>
                Dispatch &amp; Delivery Details
              </Text>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Shipping Carrier / Method
              </Text>
              <TextInput
                value={carrier}
                onChangeText={setCarrier}
                placeholder="e.g. DHL Express, Local Rider, Online"
                placeholderTextColor={theme.textTertiary}
                // Server caps: carrier 40, tracking 60, note 500. Enforced here
                // so an over-long value is impossible rather than rejected.
                maxLength={40}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Tracking Code / Phone Number
              </Text>
              <TextInput
                value={tracking}
                onChangeText={setTracking}
                placeholder="e.g. DHL-GH-99201 or courier phone"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="characters"
                maxLength={60}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Delivery Note (Optional)
              </Text>
              <TextInput
                value={deliveryNote}
                onChangeText={setDeliveryNote}
                placeholder="Courier contact, rider phone, or digital item instructions"
                placeholderTextColor={theme.textTertiary}
                maxLength={500}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                    minHeight: 64,
                  },
                ]}
              />

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => setDeliverOpen(false)}
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    deliverDeal.mutate(
                      {
                        id: deal.id,
                        // Trimmed to undefined rather than sent empty — the
                        // server stores "" as a carrier otherwise.
                        carrier: carrier.trim() || undefined,
                        trackingNumber: tracking.trim() || undefined,
                        note: deliveryNote.trim() || undefined,
                      },
                      { onSuccess: () => setDeliverOpen(false) },
                    )
                  }
                  disabled={deliverDeal.isPending}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    {
                      backgroundColor: theme.primary,
                      opacity: deliverDeal.isPending ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {deliverDeal.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Truck size={14} color="#ffffff" />
                  )}
                  <Text style={styles.submitBtnText}>Confirm Delivery</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/*
            Paying for a deal that was created but never funded — a standalone
            escrow, or one the buyer backed out of at checkout. Same sheet as
            marketplace checkout, so the wallet-plus-shortfall split behaves
            identically wherever money is taken.
          */}
          {/* Crypto rail: once an invoice exists the panel IS the funding UI —
              it carries the amount due, the address and the "I've paid" check,
              so the Fund button below would be a second, worse way in. */}
          {isCryptoDeal && depositQuery.data?.invoiceUrl ? (
            <CryptoDepositPanel
              deposit={depositQuery.data}
              isChecking={checkCrypto.isPending}
              isReopening={startCrypto.isPending}
              errorMessage={
                fundError ??
                (checkCrypto.isError
                  ? apiErrorMessage(checkCrypto.error)
                  : startCrypto.isError
                    ? apiErrorMessage(startCrypto.error)
                    : null)
              }
              onCheck={() => checkCrypto.mutate({ escrowId: deal.id })}
              onReopen={payWithCrypto}
              onOpenInvoice={() => {
                const url = depositQuery.data?.invoiceUrl;
                if (url) void WebBrowser.openBrowserAsync(url);
              }}
            />
          ) : null}

          {has('FUND') && !(isCryptoDeal && depositQuery.data?.invoiceUrl) ? (
            <>
              <Pressable
                onPress={() => {
                  setFundError(null);
                  setFundOpen(true);
                }}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.primary, opacity: busy ? 0.5 : pressed ? 0.85 : 1 },
                ]}
              >
                <Lock size={16} color="#ffffff" />
                <Text style={styles.primaryBtnText}>
                  Pay {formatMoney(deal.fundingTotal, deal.currency)} &amp; Fund Escrow
                </Text>
              </Pressable>
              {fundError ? (
                <Text style={[styles.fundError, { color: Accent.error }]}>{fundError}</Text>
              ) : null}
            </>
          ) : null}

          {has('RELEASE') && !confirmRelease ? (
            <Pressable
              onPress={() => setConfirmRelease(true)}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: busy ? 0.5 : pressed ? 0.85 : 1 },
              ]}
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Confirm Receipt &amp; Release</Text>
            </Pressable>
          ) : null}

          {has('RELEASE') && confirmRelease ? (
            <View style={[styles.formBox, { borderColor: theme.border }]}>
              <Text style={[styles.formHead, { color: theme.textSecondary }]}>
                Release the escrow?
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {formatMoney(deal.sellerPayout, deal.currency)} goes to @{deal.sellerUsername}.
                This confirms you received what you paid for and can&apos;t be undone.
              </Text>
              <View style={styles.formActions}>
                <Pressable
                  onPress={() => setConfirmRelease(false)}
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Not yet</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    releaseDeal.mutate(deal.id, { onSettled: () => setConfirmRelease(false) })
                  }
                  disabled={releaseDeal.isPending}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    {
                      backgroundColor: theme.primary,
                      opacity: releaseDeal.isPending ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {releaseDeal.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <CheckCircle2 size={14} color="#ffffff" />
                  )}
                  <Text style={styles.submitBtnText}>Release Funds</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {has('CANCEL') && !cancelOpen ? (
            <Pressable
              onPress={() => setCancelOpen(true)}
              disabled={busy}
              style={({ pressed }) => [
                styles.outlineBtn,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Ban size={15} color={theme.text} />
              <Text style={[styles.outlineBtnText, { color: theme.text }]}>
                {cancelRefunds ? 'Cancel Order & Refund Buyer' : 'Cancel Deal'}
              </Text>
            </Pressable>
          ) : null}

          {has('CANCEL') && cancelOpen ? (
            <View style={[styles.formBox, { borderColor: theme.border }]}>
              <Text style={[styles.formHead, { color: theme.textSecondary }]}>
                {cancelRefunds ? 'Cancel this order' : 'Cancel this deal'}
              </Text>

              {/* The consequence in money terms, which differs entirely
                  depending on whether the buyer has funded yet. */}
              <View
                style={[
                  styles.consequence,
                  { backgroundColor: theme.inputBackground, borderColor: theme.border },
                ]}
              >
                <RotateCcw size={16} color={theme.textTertiary} />
                <View style={styles.consequenceText}>
                  <Text style={[styles.consequenceTitle, { color: theme.text }]}>
                    {cancelRefunds
                      ? `${formatMoney(deal.fundingTotal, deal.currency)} goes back to @${deal.buyerUsername}`
                      : 'Nothing has been funded yet'}
                  </Text>
                  <Text style={[styles.consequenceBody, { color: theme.textSecondary }]}>
                    {cancelRefunds
                      ? 'A full refund including the platform fee — you earn nothing on this deal. Stock returns to the listing. This can’t be undone.'
                      : 'No money has moved, so there is nothing to refund. The deal closes for both sides and can’t be reopened.'}
                  </Text>
                </View>
              </View>

              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                maxLength={300}
                placeholder="Why are you cancelling? (optional — shared with the other party)"
                placeholderTextColor={theme.textTertiary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    color: theme.text,
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                    minHeight: 64,
                  },
                ]}
              />

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => setCancelOpen(false)}
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                    {cancelRefunds ? 'Keep Order' : 'Keep Deal'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    cancelDeal.mutate(
                      { id: deal.id, reason: cancelReason.trim() || undefined },
                      { onSuccess: () => setCancelOpen(false) },
                    )
                  }
                  disabled={cancelDeal.isPending}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: '#e11d48', opacity: cancelDeal.isPending ? 0.6 : pressed ? 0.85 : 1 },
                  ]}
                >
                  {cancelDeal.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ban size={14} color="#ffffff" />
                  )}
                  <Text style={styles.submitBtnText}>
                    {cancelRefunds ? 'Cancel & Refund' : 'Cancel Deal'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {has('DISPUTE') && !disputeOpen ? (
            <Pressable
              onPress={() => setDisputeOpen(true)}
              style={({ pressed }) => [
                styles.disputeBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AlertTriangle size={15} color="#b91c1c" />
              <Text style={styles.disputeBtnText}>Open Dispute</Text>
            </Pressable>
          ) : null}

          {has('DISPUTE') && disputeOpen ? (
            <View style={styles.disputeForm}>
              <Text style={styles.disputeHead}>Open a Formal Dispute</Text>

              {/* The web's pre-dispute warning, kept verbatim */}
              <View style={styles.warnBox}>
                <AlertCircle size={16} color="#92400e" />
                <View style={styles.warnText}>
                  <Text style={styles.warnTitle}>Contact Counterparty First</Text>
                  <Text style={styles.warnBody}>
                    Please make sure you have attempted to message the other party via the deal chat.
                    Submit a formal dispute only if they are uncooperative, unresponsive, or refusing
                    to resolve the issue.
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason</Text>
              {DISPUTE_REASONS.map((reason) => {
                const on = disputeReason === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    onPress={() => setDisputeReason(reason.value)}
                    style={[
                      styles.reasonRow,
                      {
                        backgroundColor: on ? theme.primaryLight : theme.inputBackground,
                        borderColor: on ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.reasonText, { color: on ? theme.primary : theme.textSecondary }]}
                    >
                      {reason.label}
                    </Text>
                    {on ? <CheckCircle2 size={15} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                What went wrong?
              </Text>
              <TextInput
                value={disputeDesc}
                onChangeText={setDisputeDesc}
                placeholder="Describe the issue with dates and what you expected..."
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

              <View style={styles.disputeActions}>
                <Pressable
                  onPress={() => setDisputeOpen(false)}
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    disputeDeal.mutate(
                      {
                        id: deal.id,
                        reason: disputeReason,
                        description: disputeDesc.trim(),
                      },
                      { onSuccess: () => setDisputeOpen(false) },
                    )
                  }
                  // The server requires at least 10 characters, so a shorter
                  // description is refused here rather than after a round trip.
                  disabled={disputeDesc.trim().length < 10 || disputeDeal.isPending}
                  style={[
                    styles.submitDispute,
                    (disputeDesc.trim().length < 10 || disputeDeal.isPending) && { opacity: 0.5 },
                  ]}
                >
                  {disputeDeal.isPending ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                  <Text style={styles.submitDisputeText}>Submit Dispute</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {deal.availableActions.length === 0 && deal.status !== 'created' && !isDone ? (
            <View style={[styles.waitBox, { backgroundColor: theme.inputBackground }]}>
              <ShieldCheck size={15} color={theme.textTertiary} />
              <Text style={[styles.waitText, { color: theme.textSecondary }]}>
                Nothing to do on this deal right now.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Deal Details — the web's own heading, with its money grid. I'd
            titled this "Deal Terms" and left the amounts out entirely. */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sectionHead}>
            <FileText size={17} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Deal Details</Text>
          </View>

          {deal.description ? (
            <View style={[styles.descBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={[styles.body, { color: theme.text }]}>{deal.description}</Text>
            </View>
          ) : null}

          {deal.tracking ? (
            <View style={[styles.trackingBox, { backgroundColor: theme.inputBackground }]}>
              <Truck size={15} color={theme.textTertiary} />
              <Text style={[styles.termValue, { color: theme.text }]} numberOfLines={2}>
                <Text style={{ fontFamily: Fonts.sans[700] }}>{deal.tracking.carrier}:</Text>{' '}
                {deal.tracking.code}
              </Text>
            </View>
          ) : null}

          {/* Item Amount + what this side actually pays or receives */}
          <View style={styles.moneyGrid}>
            <View style={[styles.moneyCell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={[styles.moneyLabel, { color: theme.textTertiary }]}>Item Amount</Text>
              <Text style={[styles.moneyValue, { color: theme.text }]}>
                {formatMoney(deal.amount, deal.currency)}
              </Text>
            </View>
            <View style={[styles.moneyCell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Text style={[styles.moneyLabel, { color: theme.textTertiary }]}>
                {isBuyer ? 'You Paid' : 'Your Payout'}
              </Text>
              <Text style={[styles.moneyValue, { color: theme.text }]}>
                {formatMoney(isBuyer ? deal.fundingTotal : deal.sellerPayout, deal.currency)}
              </Text>
            </View>
          </View>

          {/* Extra to the web: the mock carries a release condition and it's
              worth surfacing on a screen about releasing money. */}
          <View style={[styles.termRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.termLabel, { color: theme.textTertiary }]}>Release Condition</Text>
            <Text style={[styles.termValue, { color: theme.text }]}>{deal.releaseCondition}</Text>
          </View>
        </View>

        {/* Audit timeline */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Audit Timeline</Text>

          {deal.events.map((event, i) => {
            const last = i === deal.events.length - 1;
            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventRail}>
                  <View style={[styles.eventDot, { backgroundColor: theme.primary }]} />
                  {!last ? <View style={[styles.eventLine, { backgroundColor: theme.border }]} /> : null}
                </View>
                <View style={styles.eventBody}>
                  <Text style={[styles.eventType, { color: theme.text }]}>
                    {event.type.toUpperCase()}
                  </Text>
                  {event.description ? (
                    <Text style={[styles.eventDesc, { color: theme.textSecondary }]}>
                      {event.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.eventMeta, { color: theme.textTertiary }]}>
                    {/* `actorRole` is a role (buyer/seller/system/admin), not a
                        handle — an "@" prefix would read as a username. */}
                    {event.actor} · {formatStamp(event.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>

      <PaymentSheet
        open={fundOpen}
        total={deal.fundingTotal}
        balance={walletBalance}
        rail={deal.rail === 'crypto' ? 'crypto' : 'fiat'}
        currency={deal.currency === 'TRX' ? 'TRX' : 'GHS'}
        isPending={fundDeal.isPending || topUp.isPending || startCrypto.isPending}
        errorMessage={fundError}
        onClose={() => {
          if (!busy) setFundOpen(false);
        }}
        onPayFromWallet={payFromWallet}
        onPayWithProvider={payWithProvider}
        onPayWithCrypto={payWithCrypto}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fundError: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[500], textAlign: 'center' },
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

  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  code: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  // Heading uses the web's `font-display`.
  title: { fontSize: 19, fontFamily: Fonts.display[700], letterSpacing: -0.3, lineHeight: 25 },

  amountBlock: { gap: 2 },
  amountLabel: { fontSize: 11, fontFamily: Fonts.sans[500] },
  amount: { fontSize: 26, fontFamily: Fonts.display[700], letterSpacing: -0.5 },
  rail: { fontSize: 10.5, fontFamily: Fonts.sans[600] },

  parties: { flexDirection: 'row', gap: Spacing.three, borderTopWidth: 1, paddingTop: Spacing.three },
  party: { flex: 1, gap: 2 },
  partyLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  partyName: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  messageText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.display[700] },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },
  notFound: { fontSize: 17, fontFamily: Fonts.display[700] },

  termRow: { borderTopWidth: 1, paddingTop: Spacing.three, gap: 2 },
  termLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  termValue: { fontSize: 12.5, lineHeight: 17, fontFamily: Fonts.sans[500] },
  descBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  moneyGrid: { flexDirection: 'row', gap: Spacing.two },
  moneyCell: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 2 },
  moneyLabel: { fontSize: 10, fontFamily: Fonts.sans[500] },
  moneyValue: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  trackingText: { flex: 1, gap: 2 },

  eventRow: { flexDirection: 'row', gap: Spacing.three },
  eventRail: { alignItems: 'center', width: 12 },
  eventDot: { height: 9, width: 9, borderRadius: Radius.full, marginTop: 3 },
  eventLine: { flex: 1, width: 1.5, marginTop: 2 },
  eventBody: { flex: 1, paddingBottom: Spacing.three, gap: 2 },
  eventType: { fontSize: 10.5, fontFamily: Fonts.sans[700], letterSpacing: 0.3 },
  eventDesc: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  eventMeta: { fontSize: 10, fontFamily: Fonts.sans[500] },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  // Shared shell for the inline dispatch / cancel / release / edit forms —
  // where the web opens a modal, a phone expands in place.
  formBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
  formHead: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  formActions: { flexDirection: 'row', gap: Spacing.two, marginTop: 2 },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  submitBtnText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  outlineBtnText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },

  consequence: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  consequenceText: { flex: 1, gap: 2 },
  consequenceTitle: { fontSize: 12, fontFamily: Fonts.sans[700] },
  consequenceBody: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400] },

  roleRow: { flexDirection: 'row', gap: Spacing.two },
  roleBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  roleText: { fontSize: 12, fontFamily: Fonts.sans[600] },

  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  doneText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },

  /**
   * `minHeight`, not `height`, on every button on this screen — and `flexShrink`
   * on their labels.
   *
   * The labels here are sentences, not words ("Cancel Order & Refund Buyer",
   * "Open Dispute Chat & Submit Evidence"). A fixed height with an unshrinkable
   * label meant that on a narrow phone the text overflowed the button instead of
   * wrapping inside it. Now the label wraps and the button grows to fit.
   */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  primaryBtnText: {
    flexShrink: 1,
    fontSize: 13.5,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
  },

  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
  },
  disputeBtnText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#b91c1c' },

  disputeForm: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  disputeHead: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#b91c1c',
  },
  warnBox: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  warnText: { flex: 1, gap: 2 },
  warnTitle: { fontSize: 12, fontFamily: Fonts.sans[700], color: '#92400e' },
  warnBody: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400], color: '#92400e' },

  fieldLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  reasonText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans[600] },
  textarea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    minHeight: 88,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,

  disputeActions: { flexDirection: 'row', gap: Spacing.two, marginTop: 2 },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cancelText: { flexShrink: 1, fontSize: 12.5, fontFamily: Fonts.sans[700] },
  submitDispute: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: '#e11d48',
  },
  submitDisputeText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
  },

  waitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  waitText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans[500] },
});
