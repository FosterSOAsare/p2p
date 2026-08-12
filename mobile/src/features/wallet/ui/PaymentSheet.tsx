import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CreditCard, ShieldCheck, Smartphone, Wallet, X } from '@/components/icons';

import { Accent, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PayMethod } from '../data/paymentsApi';

/**
 * Pay for an order — the phone version of `web/src/features/escrow/ui/PaymentModal.tsx`.
 *
 * Deliberately says nothing about who processes the payment: the buyer picks
 * "Mobile Money" or "Card" and the provider is an implementation detail.
 *
 * The wallet and a fresh payment aren't alternatives — any balance the buyer
 * spends is subtracted first and only the shortfall goes to the provider, so
 * the split is shown live rather than made a either/or choice.
 */

interface PaymentSheetProps {
  open: boolean;
  /** Total the buyer must fund (item + their half of the escrow fee). */
  total: number;
  /** Spendable wallet balance (already cleared). Ignored on the crypto rail. */
  balance: number;
  /**
   * Which rail the deal settles on. Marketplace checkout is always fiat, hence
   * the default. `crypto` deals are funded on-chain, so momo/card and the GHS
   * wallet don't apply to them at all.
   */
  rail?: 'fiat' | 'crypto';
  currency?: 'GHS' | 'TRX';
  isPending?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  /** walletAmount covers the whole total — no provider step needed. */
  onPayFromWallet: (walletAmount: number) => void;
  /** Pay `walletAmount` from balance and the rest on the hosted page. */
  onPayWithProvider: (walletAmount: number, method: PayMethod) => void;
}

/** Round to pesewas so on-screen math always matches what the server charges. */
const round2 = (n: number) => Math.round(n * 100) / 100;

const money = (amount: number, currency = 'GHS') =>
  currency === 'TRX'
    ? `${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} TRX`
    : `GH₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const METHODS: { id: PayMethod; label: string; hint: string; Icon: typeof Wallet }[] = [
  { id: 'momo', label: 'Mobile Money', hint: 'MTN, Telecel, AirtelTigo', Icon: Smartphone },
  { id: 'card', label: 'Card', hint: 'Debit or credit card', Icon: CreditCard },
];

export function PaymentSheet({
  open,
  total,
  balance,
  rail = 'fiat',
  currency = 'GHS',
  isPending = false,
  errorMessage,
  onClose,
  onPayFromWallet,
  onPayWithProvider,
}: PaymentSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const isCrypto = rail === 'crypto';
  // The wallet is GHS-only, so a TRX deal can't draw on it whatever the balance.
  const hasBalance = balance > 0 && !isCrypto;
  const maxFromWallet = round2(Math.min(balance, total));

  const [useWallet, setUseWallet] = useState(hasBalance);
  // Kept as a string so the field can be cleared and typed into freely.
  const [walletInput, setWalletInput] = useState(String(maxFromWallet));
  const [method, setMethod] = useState<PayMethod>('momo');

  // Reset each time the sheet opens so a retry never inherits stale numbers.
  useEffect(() => {
    if (open) {
      setUseWallet(hasBalance);
      setWalletInput(String(maxFromWallet));
      setMethod('momo');
    }
  }, [open, hasBalance, maxFromWallet]);

  const walletAmount = useMemo(() => {
    if (!useWallet) return 0;
    const parsed = Number.parseFloat(walletInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return round2(Math.min(parsed, maxFromWallet));
  }, [useWallet, walletInput, maxFromWallet]);

  const remaining = round2(Math.max(0, total - walletAmount));
  const coveredByWallet = remaining === 0;
  const overTyped = Number.parseFloat(walletInput) > maxFromWallet;

  const submit = () => {
    if (isPending) return;
    if (coveredByWallet) onPayFromWallet(walletAmount);
    else onPayWithProvider(walletAmount, method);
  };

  if (!open) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={isPending ? undefined : onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable style={styles.backdropTap} onPress={isPending ? undefined : onClose} />

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
              <Text style={[styles.title, { color: theme.text }]}>Complete payment</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Held in escrow until you confirm delivery.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} disabled={isPending} accessibilityLabel="Close">
              <X size={19} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Total */}
            <View style={[styles.totalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total due</Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>{money(total, currency)}</Text>
            </View>

            {/* Wallet split */}
            {hasBalance ? (
              <View style={[styles.walletCard, { borderColor: theme.border }]}>
                <View style={styles.walletHead}>
                  <View style={styles.walletHeadText}>
                    <View style={styles.walletTitleRow}>
                      <Wallet size={15} color={theme.primary} />
                      <Text style={[styles.walletTitle, { color: theme.text }]}>Use wallet balance</Text>
                    </View>
                    <Text style={[styles.walletHint, { color: theme.textSecondary }]}>
                      Available {money(balance, currency)}
                    </Text>
                  </View>
                  <Switch
                    value={useWallet}
                    onValueChange={setUseWallet}
                    disabled={isPending}
                    trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
                  />
                </View>

                {useWallet ? (
                  <>
                    <View style={styles.amountRow}>
                      <TextInput
                        value={walletInput}
                        onChangeText={setWalletInput}
                        keyboardType="decimal-pad"
                        editable={!isPending}
                        placeholder="0.00"
                        placeholderTextColor={theme.textTertiary}
                        accessibilityLabel="Amount to spend from wallet"
                        style={[
                          styles.amountInput,
                          {
                            backgroundColor: theme.inputBackground,
                            borderColor: overTyped ? Accent.error : theme.inputBorder,
                            color: theme.text,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={() => setWalletInput(String(maxFromWallet))}
                        disabled={isPending}
                        hitSlop={8}
                        style={[styles.maxBtn, { borderColor: theme.border }]}
                      >
                        <Text style={[styles.maxBtnText, { color: theme.primary }]}>Use max</Text>
                      </Pressable>
                    </View>

                    {overTyped ? (
                      <Text style={[styles.overText, { color: Accent.error }]}>
                        More than you can spend here — capped at {money(maxFromWallet, currency)}.
                      </Text>
                    ) : null}

                    {/* The live split. This is the whole point of the sheet. */}
                    <View style={[styles.splitBox, { borderColor: theme.border }]}>
                      <View style={styles.splitRow}>
                        <Text style={[styles.splitLabel, { color: theme.textSecondary }]}>From wallet</Text>
                        <Text style={[styles.splitValue, { color: theme.text }]}>
                          −{money(walletAmount, currency)}
                        </Text>
                      </View>
                      <View style={[styles.splitDivider, { backgroundColor: theme.border }]} />
                      <View style={styles.splitRow}>
                        <Text style={[styles.splitLabelStrong, { color: theme.text }]}>Left to pay</Text>
                        <Text style={[styles.splitValueStrong, { color: theme.text }]}>
                          {money(remaining, currency)}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            {/* Method — only when there's actually a shortfall to charge. */}
            {!coveredByWallet ? (
              <View style={styles.methods}>
                <Text style={[styles.methodsLabel, { color: theme.textSecondary }]}>
                  Pay {money(remaining, currency)} with
                </Text>
                {METHODS.map((m) => {
                  const active = method === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMethod(m.id)}
                      disabled={isPending}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.method,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primaryLight : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.methodIcon, { backgroundColor: theme.backgroundElement }]}>
                        <m.Icon size={17} color={active ? theme.primary : theme.textSecondary} />
                      </View>
                      <View style={styles.methodBody}>
                        <Text style={[styles.methodLabel, { color: theme.text }]}>{m.label}</Text>
                        <Text style={[styles.methodHint, { color: theme.textSecondary }]}>{m.hint}</Text>
                      </View>
                      <View style={[styles.radio, { borderColor: active ? theme.primary : theme.inputBorder }]}>
                        {active ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {errorMessage ? (
              <View style={[styles.error, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.assurance}>
              <ShieldCheck size={14} color={theme.textTertiary} />
              <Text style={[styles.assuranceText, { color: theme.textTertiary }]}>
                Your money is held in escrow, not sent to the seller, until you confirm the item arrived.
              </Text>
            </View>
          </ScrollView>

          <Pressable
            onPress={submit}
            disabled={isPending}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.primary, opacity: isPending ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {coveredByWallet
                    ? `Pay ${money(total, currency)} from wallet`
                    : `Continue to pay ${money(remaining, currency)}`}
                </Text>
                <ArrowRight size={17} color="#ffffff" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 38, height: 4, borderRadius: Radius.full },

  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  headText: { flex: 1, gap: 3 },
  title: { fontSize: 17, fontFamily: Fonts.display[700] },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  scroll: { flexGrow: 0 },
  scrollBody: { gap: Spacing.three, paddingBottom: Spacing.three },

  totalCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  totalLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalValue: { fontSize: 25, fontFamily: Fonts.display[700], letterSpacing: -0.6 },

  walletCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  walletHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  walletHeadText: { flex: 1, gap: 2 },
  walletTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletTitle: { fontSize: 14, fontFamily: Fonts.sans[700] },
  walletHint: { fontSize: 11.5, fontFamily: Fonts.sans[400] },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: Fonts.sans[600],
  },
  maxBtn: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 11 },
  maxBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  overText: { fontSize: 11.5, fontFamily: Fonts.sans[500] },

  splitBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  splitDivider: { height: 1 },
  splitLabel: { fontSize: 12.5, fontFamily: Fonts.sans[400] },
  splitValue: { fontSize: 12.5, fontFamily: Fonts.sans[600] },
  splitLabelStrong: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
  splitValueStrong: { fontSize: 15, fontFamily: Fonts.display[700] },

  methods: { gap: Spacing.two },
  methodsLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  methodIcon: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  methodBody: { flex: 1, gap: 1 },
  methodLabel: { fontSize: 14, fontFamily: Fonts.sans[700] },
  methodHint: { fontSize: 11.5, fontFamily: Fonts.sans[400] },
  radio: { width: 19, height: 19, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: Radius.full },

  error: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  errorText: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[500], color: '#991b1b' },

  assurance: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  assuranceText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans[400] },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: 15,
    marginTop: Spacing.two,
  },
  ctaText: { fontSize: 15, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
