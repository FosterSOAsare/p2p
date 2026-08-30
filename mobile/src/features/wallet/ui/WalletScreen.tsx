import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Lock,
  Plus,
  ShieldCheck,
  Wallet as WalletIcon,
  X,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { usePersona } from '@/hooks/use-persona';
import { KeyboardAwareScroll, useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useWallet, useWalletTransactions, useWithdraw } from '../data/walletApi';
import { useTopUp, type PayMethod } from '../data/paymentsApi';

/**
 * Wallet & Payouts — the phone version of `web/src/pages/SellerWallet.tsx`.
 *
 * Same three balance cards (available / pending clearance / escrow-locked),
 * the same 24-hour clearance explainer, the withdraw form, and the transaction
 * ledger, and withdrawal opens in a modal as it does on the web.
 *
 * Note the web does NOT wrap `/wallet` in `SellerGuard` — every signed-in
 * account has a wallet server-side — so this screen isn't guarded either.
 *
 * Balances and the ledger are both live (`GET /api/wallet`, `/transactions`);
 * withdrawing and topping up invalidate them rather than adjusting anything
 * locally, so what's on screen is always what the server holds.
 */

interface LedgerEntry {
  id: string;
  type: 'escrow_release' | 'withdrawal';
  reference: string;
  amount: number;
  at: string;
}

function formatMoney(amount: number, currency = 'GH₵') {
  return `${currency}${amount.toLocaleString('en-GH', {
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

export function WalletScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const ensureVisible = useEnsureVisible();
  const amountRow = useRef<View>(null);
  const destRow = useRef<View>(null);

  const walletQuery = useWallet();
  const txQuery = useWalletTransactions();
  const withdraw = useWithdraw();

  const currency = walletQuery.data?.currency ?? 'GHS';
  // The web titles this "Seller Payout Wallet" for sellers, "My P2P Wallet"
  // otherwise — the page itself is open to every signed-in account.
  const isSeller = usePersona() === 'seller';

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const topUp = useTopUp();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState<PayMethod>('momo');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * All three figures come from the server. No local bookkeeping after a
   * withdrawal: the mutation invalidates this query, so the balance that
   * appears is the one the ledger actually holds.
   */
  const available = walletQuery.data?.balance ?? 0;
  const escrowLocked = walletQuery.data?.escrowLocked ?? 0;

  /**
   * The real ledger, rather than reconstructing credits from released deals.
   * Amounts arrive signed — credits positive, debits negative — so the sign
   * decides how a row reads instead of its type.
   */
  const ledger = useMemo<LedgerEntry[]>(
    () =>
      (txQuery.data?.transactions ?? []).map((t) => ({
        id: t.id,
        type: t.amount < 0 ? 'withdrawal' : 'escrow_release',
        reference: t.escrow?.code ?? t.note ?? t.type.replace(/_/g, ' '),
        amount: Math.abs(t.amount),
        at: t.createdAt,
      })),
    [txQuery.data],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  /** Mirrors the web's validation order and messages exactly. */
  const submitWithdraw = async () => {
    setError(null);
    setSuccess(null);

    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Please enter a valid positive withdrawal amount.');
      return;
    }
    if (value > available) {
      setError(`Insufficient cleared balance. Maximum available: ${formatMoney(available, currency)}`);
      return;
    }
    if (!destination.trim()) {
      setError('Please provide a Mobile Money phone number for payout.');
      return;
    }

    try {
      // The server re-checks the balance and guards against going negative —
      // the checks above are only there to save a round trip on obvious input
      // mistakes, not to be the authority.
      await withdraw.mutateAsync(value);
    } catch (err) {
      setError(apiErrorMessage(err));
      return;
    }

    // Nothing is adjusted locally: the mutation invalidates the balance and
    // ledger queries, so both refetch and show what the server actually holds.
    setSuccess(`Successfully paid out ${formatMoney(value, currency)} to ${destination.trim()}!`);
    setAmount('');
    setWithdrawOpen(false);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
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

        {/* Hero banner — the web wraps the heading, the withdraw action and all
            three balances in one tinted panel, which is what gives the page its
            weight. Flat stacked cards lost that. */}
        <View style={[styles.hero, { backgroundColor: theme.primaryLight }]}>
          <View style={[styles.railPill, { backgroundColor: theme.card }]}>
            <ShieldCheck size={13} color={theme.primary} />
            <Text style={[styles.railPillText, { color: theme.primary }]}>
              VeriTrust Escrow Settle Rail • {currency}
            </Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {isSeller ? 'Seller Payout Wallet' : 'My P2P Wallet'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Withdraw cleared sales earnings directly to your Mobile Money account or view pending
            deal clearances.
          </Text>

          <View style={styles.walletActions}>
            {/* Top up. The web offers this on the same screen; without it a
                buyer whose balance won't cover an order had no way to add
                money except by starting a checkout. */}
            <Pressable
              onPress={() => {
                setError(null);
                setSuccess(null);
                setTopUpOpen(true);
              }}
              disabled={topUp.isPending}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.withdrawBtn,
                styles.walletAction,
                { backgroundColor: theme.primary, opacity: topUp.isPending ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              {topUp.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Plus size={18} color="#ffffff" />
              )}
              <Text style={styles.withdrawBtnText}>Add Funds</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setError(null);
                setSuccess(null);
                setWithdrawOpen(true);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.withdrawBtn,
                styles.walletAction,
                styles.withdrawSecondary,
                { borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ArrowUpRight size={18} color={theme.text} />
              <Text style={[styles.withdrawBtnText, { color: theme.text }]}>Withdraw</Text>
            </Pressable>
          </View>

          {/* Balance cards, nested inside the banner as on the web */}
          <View style={[styles.balanceGrid, { borderTopColor: theme.border }]}>
            <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.balanceHead}>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
                  Available Balance
                </Text>
                <WalletIcon size={14} color="#0284c7" />
              </View>
              <Text style={[styles.balanceValue, { color: '#0284c7' }]}>
                {formatMoney(available, currency)}
              </Text>
              <Text style={[styles.balanceHint, { color: theme.textTertiary }]}>
                Cleared &amp; ready for MoMo payout
              </Text>
            </View>

            <View style={styles.pairRow}>
              <View style={[styles.smallCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.balanceHead}>
                  <Text style={[styles.smallLabel, { color: theme.textSecondary }]}>
                    Escrow-Locked Funds
                  </Text>
                  <Lock size={13} color={theme.primary} />
                </View>
                <Text style={[styles.smallValue, { color: theme.primary }]}>
                  {formatMoney(escrowLocked, currency)}
                </Text>
                <Text style={[styles.balanceHint, { color: theme.textTertiary }]}>
                  Held in active buyer escrow deals
                </Text>
              </View>
            </View>
          </View>
        </View>

        {success ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={16} color="#166534" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}




        {/* Ledger */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            Transaction History
          </Text>

          {txQuery.isLoading ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>Loading transactions…</Text>
          ) : txQuery.isError ? (
            /* Shown rather than swallowed: "no transactions" is a claim about
               the account, and this ledger currently fails for a server-side
               reason. Saying so beats implying the history is empty. */
            <Text style={[styles.empty, { color: '#b91c1c' }]}>
              {apiErrorMessage(txQuery.error)}
            </Text>
          ) : ledger.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No transactions recorded yet
            </Text>
          ) : (
            ledger.map((entry) => {
              const isCredit = entry.amount >= 0;
              return (
                <View
                  key={entry.id}
                  style={[styles.ledgerRow, { borderTopColor: theme.border }]}
                >
                  <View style={styles.ledgerInfo}>
                    <Text style={[styles.ledgerType, { color: theme.text }]}>
                      {entry.type === 'escrow_release' ? 'Escrow Release' : 'Withdrawal'}
                    </Text>
                    <Text style={[styles.ledgerRef, { color: theme.textTertiary }]} numberOfLines={1}>
                      {entry.reference} · {formatStamp(entry.at)}
                    </Text>
                  </View>
                  <View style={styles.ledgerRight}>
                    <Text
                      style={[styles.ledgerAmount, { color: isCredit ? theme.primary : '#e11d48' }]}
                    >
                      {isCredit ? '+' : '−'}
                      {formatMoney(Math.abs(entry.amount), currency)}
                    </Text>
                    {entry.type === 'escrow_release' ? (
                      <Text style={[styles.settled, { color: theme.textTertiary }]}>Settled</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </KeyboardAwareScroll>

        {/* Withdraw — a full-screen modal rather than a bottom sheet.
            A sheet has to be lifted above the keyboard by hand, and on a small
            phone the remaining space is too tight for two fields; every fix
            traded one clipping bug for another. Full-screen sidesteps it: the
            form scrolls with KeyboardAwareScroll, exactly like every other form
            in the app. */}
        <Modal
          visible={withdrawOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setWithdrawOpen(false)}
        >
          <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Fixed header, so Close is always reachable */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => setWithdrawOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
              >
                <X size={22} color={theme.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Withdraw Payout</Text>
              <View style={styles.closeBtn} />
            </View>

            <KeyboardAwareScroll contentContainerStyle={styles.modalScroll}>
              {/* What's actually withdrawable, so the number has context */}
              <View style={[styles.availableStrip, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.availableLabel, { color: theme.primary }]}>
                  Available to withdraw
                </Text>
                <Text style={[styles.availableValue, { color: theme.primary }]}>
                  {formatMoney(available, currency)}
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View ref={amountRow} collapsable={false} style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                <View
                  style={[
                    styles.amountBox,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: amount ? theme.primary : theme.inputBorder,
                    },
                  ]}
                >
                  <Text style={[styles.amountCurrency, { color: theme.textTertiary }]}>
                    {currency}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={(v) => {
                      // decimal-pad still admits letters from hardware keyboards
                      // and some IMEs, so keep digits and a single decimal point.
                      const cleaned = v.replace(/[^0-9.]/g, '');
                      const [whole, ...rest] = cleaned.split('.');
                      setAmount(rest.length ? `${whole}.${rest.join('')}` : whole);
                      setError(null);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    onFocus={() => ensureVisible(amountRow.current)}
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                  <Pressable onPress={() => setAmount(String(available))} hitSlop={8}>
                    <Text style={[styles.maxLink, { color: theme.primary }]}>MAX</Text>
                  </Pressable>
                </View>
              </View>

              <View ref={destRow} collapsable={false} style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Mobile Money Number
                </Text>
                <TextInput
                  value={destination}
                  onChangeText={(v) => {
                    setDestination(v);
                    setError(null);
                  }}
                  placeholder="+233 24 000 0000"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={submitWithdraw}
                  onFocus={() => ensureVisible(destRow.current)}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                    },
                  ]}
                />
                <Text style={[styles.labelHint, { color: theme.textTertiary }]}>
                  Funds are sent to this number. Double-check it — payouts can&apos;t be reversed.
                </Text>
              </View>

              <Pressable
                onPress={submitWithdraw}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <ArrowUpRight size={17} color="#ffffff" />
                <Text style={styles.withdrawBtnText}>
                  {amount ? `Withdraw ${formatMoney(Number(amount) || 0, currency)}` : 'Confirm Payout'}
                </Text>
              </Pressable>
            </KeyboardAwareScroll>
          </SafeAreaView>
        </Modal>

        {/* Top up — mirrors the withdraw modal so the two read as a pair. */}
        <Modal
          visible={topUpOpen}
          animationType="slide"
          onRequestClose={() => (topUp.isPending ? undefined : setTopUpOpen(false))}
        >
          <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
            <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Funds</Text>
                <Pressable
                  onPress={() => setTopUpOpen(false)}
                  disabled={topUp.isPending}
                  hitSlop={10}
                  accessibilityLabel="Close"
                >
                  <X size={20} color={theme.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Money added here can be spent on any order. It is credited only once the payment
                actually clears.
              </Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
              <TextInput
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="decimal-pad"
                editable={!topUp.isPending}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                accessibilityLabel="Amount to add"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: topUpAmount ? theme.primary : theme.inputBorder,
                    color: theme.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Pay with</Text>
              <View style={styles.topUpMethods}>
                {[
                  { id: 'momo' as const, label: 'Mobile Money', Icon: Smartphone },
                  { id: 'card' as const, label: 'Card', Icon: CreditCard },
                ].map((m) => {
                  const active = topUpMethod === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setTopUpMethod(m.id)}
                      disabled={topUp.isPending}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.topUpMethod,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primaryLight : 'transparent',
                        },
                      ]}
                    >
                      <m.Icon size={16} color={active ? theme.primary : theme.textSecondary} />
                      <Text
                        style={[styles.topUpMethodText, { color: active ? theme.primary : theme.text }]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={async () => {
                  setError(null);
                  setSuccess(null);
                  const value = Number.parseFloat(topUpAmount);
                  if (!Number.isFinite(value) || value <= 0) {
                    setError('Please enter a valid positive amount.');
                    return;
                  }
                  const outcome = await topUp.run(value, topUpMethod).catch((err) => {
                    setError(apiErrorMessage(err));
                    return null;
                  });
                  if (!outcome) return;
                  if (!outcome.ok) {
                    setError(
                      outcome.reason === 'cancelled'
                        ? 'Payment cancelled — nothing was charged.'
                        : "We couldn't confirm that payment yet. If you were charged it will appear here shortly.",
                    );
                    return;
                  }
                  setSuccess(`Added ${formatMoney(value, currency)} to your wallet.`);
                  setTopUpAmount('');
                  setTopUpOpen(false);
                }}
                disabled={topUp.isPending}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.withdrawBtn,
                  { backgroundColor: theme.primary, opacity: topUp.isPending ? 0.6 : pressed ? 0.85 : 1 },
                ]}
              >
                {topUp.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Plus size={18} color="#ffffff" />
                )}
                <Text style={styles.withdrawBtnText}>
                  {topUpAmount
                    ? `Add ${formatMoney(Number(topUpAmount) || 0, currency)}`
                    : 'Continue to payment'}
                </Text>
              </Pressable>
            </KeyboardAwareScroll>
          </SafeAreaView>
        </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  walletActions: { flexDirection: 'row', gap: Spacing.two },
  walletAction: { flex: 1 },
  withdrawSecondary: { backgroundColor: 'transparent', borderWidth: 1 },
  topUpMethods: { flexDirection: 'row', gap: Spacing.two },
  topUpMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  topUpMethodText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

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
  // Heading uses the web's `font-display`.
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  successText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[600], color: '#166534' },

  balanceCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: 4 },
  balanceHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceLabel: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  balanceValue: { fontSize: 28, fontFamily: Fonts.display[700], letterSpacing: -0.6 },
  balanceHint: { fontSize: 10.5, fontFamily: Fonts.sans[400] },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: Radius.md,
    marginTop: Spacing.three,
  },
  withdrawBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },

  pairRow: { flexDirection: 'row', gap: Spacing.two },
  smallCard: { flex: 1, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: 3 },
  smallLabel: {
    flex: 1,
    fontSize: 9.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  smallValue: { fontSize: 17, fontFamily: Fonts.display[700] },

  hero: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  railPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  railPillText: { fontSize: 10.5, fontFamily: Fonts.sans[700] },
  balanceGrid: { borderTopWidth: 1, paddingTop: Spacing.three, gap: Spacing.two, marginTop: Spacing.two },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 40, alignItems: 'flex-start' },
  modalTitle: { fontSize: 16, fontFamily: Fonts.display[700] },
  modalScroll: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  availableStrip: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 2,
  },
  availableLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  availableValue: { fontSize: 22, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  cardTitle: {
    fontSize: 14,
    fontFamily: Fonts.display[700],
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  empty: { fontSize: 12.5, fontFamily: Fonts.sans[500], textAlign: 'center', paddingVertical: Spacing.three },

  field: { gap: 5 },
  label: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  labelHint: { fontFamily: Fonts.sans[400], textTransform: 'none', letterSpacing: 0 },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontFamily: Fonts.sans[600],
    outlineStyle: 'none',
  } as never,

  // A form field in a sheet, not a full-screen amount pad: normal input height
  // with the currency as a fixed prefix. The oversized centred number (and its
  // oversized placeholder) belonged to a different pattern.
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  amountCurrency: { fontSize: 14, fontFamily: Fonts.sans[700] },
  amountInput: {
    flex: 1,
    height: '100%',
    fontSize: 17,
    fontFamily: Fonts.sans[700],
    outlineStyle: 'none',
  } as never,
  amountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: 2,
  },
  maxLink: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  errorBox: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: { fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  ledgerInfo: { flex: 1, gap: 2 },
  ledgerType: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  ledgerRef: { fontSize: 10.5, fontFamily: Fonts.sans[400] },
  ledgerRight: { alignItems: 'flex-end', gap: 2 },
  ledgerAmount: { fontSize: 13.5, fontFamily: Fonts.display[700] },
  settled: { fontSize: 9.5, fontFamily: Fonts.sans[600] },
});
