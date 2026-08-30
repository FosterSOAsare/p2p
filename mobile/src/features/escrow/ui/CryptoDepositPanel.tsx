import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import * as Clipboard from 'expo-clipboard';

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  RefreshCw,
} from '@/components/icons';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { payStatusLabel, type CryptoDeposit } from '../data/cryptoApi';

interface CryptoDepositPanelProps {
  deposit: CryptoDeposit;
  /** Asking the provider for the authoritative status right now. */
  isChecking?: boolean;
  /** Opening a replacement invoice for a dead one. */
  isReopening?: boolean;
  errorMessage?: string | null;
  onCheck: () => void;
  onReopen: () => void;
}

/**
 * Live state of a TRX deposit, shown on the deal page once an invoice is open —
 * the phone version of `web/src/features/escrow/ui/CryptoDepositPanel.tsx`.
 *
 * The buyer pays on the provider's page, so this is a watcher, not a form: it
 * says what is owed, what has arrived, and where the transfer is. The one
 * button that matters is "I've paid" — the escape hatch for a server the
 * provider's callback cannot reach, and on a phone the *normal* path rather
 * than the exception, since no redirect comes back into the app.
 *
 * Tones are fixed pastels rather than themed surfaces, matching `TONE_COLORS`
 * and the payment sheet's error box — a status colour that inverts in dark mode
 * stops reading as a status.
 */

const TONE = {
  good: { bg: '#dcfce7', border: '#bbf7d0', icon: '#166534', iconBg: '#bbf7d0' },
  bad: { bg: '#fee2e2', border: '#fecaca', icon: '#991b1b', iconBg: '#fecaca' },
  pending: { bg: '#fef9c3', border: '#fde68a', icon: '#854d0e', iconBg: '#fde68a' },
} as const;

/** TRX to 6dp, trailing zeros trimmed — the precision the chain actually uses. */
const trx = (n: number, unit: string) => `${Number(n.toFixed(6))} ${unit.toUpperCase()}`;

export function CryptoDepositPanel({
  deposit,
  isChecking = false,
  isReopening = false,
  errorMessage,
  onCheck,
  onReopen,
}: CryptoDepositPanelProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const { label, tone } = deposit.funded
    ? ({ label: 'Deposit received — deal funded', tone: 'good' } as const)
    : payStatusLabel(deposit.payStatus);
  const palette = TONE[tone];

  const copyAddress = () => {
    if (!deposit.depositAddress) return;
    Clipboard.setStringAsync(deposit.depositAddress).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* clipboard blocked — the address is on screen to copy by hand */
      },
    );
  };

  const shortfall = Math.max(0, deposit.expected - deposit.received);

  const body = deposit.funded
    ? `${trx(deposit.received, deposit.payCurrency)} received and held in escrow.`
    : deposit.dead
      ? 'This invoice is no longer payable. Open a new one to try again.'
      : deposit.payStatus === 'partially_paid'
        ? `Short by ${trx(shortfall, deposit.payCurrency)}. Send the balance, or contact support to sort it out.`
        : `Send ${trx(deposit.expected, deposit.payCurrency)} on the invoice page. This updates by itself once the network confirms it.`;

  return (
    <View style={[styles.panel, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.head}>
        <View style={[styles.headIcon, { backgroundColor: palette.iconBg }]}>
          {tone === 'good' ? (
            <CheckCircle2 size={17} color={palette.icon} />
          ) : tone === 'bad' ? (
            <AlertTriangle size={17} color={palette.icon} />
          ) : (
            <Coins size={17} color={palette.icon} />
          )}
        </View>
        <View style={styles.headBody}>
          <Text style={[styles.headTitle, { color: palette.icon }]}>{label}</Text>
          <Text style={[styles.headText, { color: palette.icon }]}>{body}</Text>
        </View>
      </View>

      {/* Amounts */}
      <View style={styles.amounts}>
        <View style={styles.amount}>
          <Text style={[styles.amountLabel, { color: palette.icon }]}>DUE</Text>
          <Text style={[styles.amountValue, { color: palette.icon }]}>
            {trx(deposit.expected, deposit.payCurrency)}
          </Text>
        </View>
        <View style={styles.amount}>
          <Text style={[styles.amountLabel, { color: palette.icon }]}>RECEIVED</Text>
          <Text style={[styles.amountValue, { color: palette.icon }]}>
            {trx(deposit.received, deposit.payCurrency)}
          </Text>
        </View>
      </View>

      {/* Deposit address — only exists once the buyer has picked a coin. */}
      {deposit.depositAddress ? (
        <View style={styles.addressBlock}>
          <Text style={[styles.amountLabel, { color: palette.icon }]}>DEPOSIT ADDRESS</Text>
          <Pressable
            onPress={copyAddress}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Address copied' : 'Copy deposit address'}
            style={({ pressed }) => [styles.address, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.addressText, { color: palette.icon }]} numberOfLines={1}>
              {deposit.depositAddress}
            </Text>
            {copied ? (
              <Check size={13} color="#16a34a" />
            ) : (
              <Copy size={13} color={palette.icon} />
            )}
          </Pressable>
        </View>
      ) : null}

      {deposit.explorerUrl ? (
        <Pressable
          onPress={() => Linking.openURL(deposit.explorerUrl as string)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.explorer, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ExternalLink size={12} color={theme.primary} />
          <Text style={[styles.explorerText, { color: theme.primary }]}>
            View transaction on Tronscan
          </Text>
        </Pressable>
      ) : null}

      {errorMessage ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!deposit.funded ? (
        <View style={styles.actions}>
          {deposit.dead ? (
            <Pressable
              onPress={onReopen}
              disabled={isReopening}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: isReopening ? 0.5 : pressed ? 0.85 : 1 },
              ]}
            >
              {isReopening ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Coins size={14} color="#ffffff" />
              )}
              <Text style={styles.primaryBtnText}>New invoice</Text>
            </Pressable>
          ) : deposit.invoiceUrl ? (
            <Pressable
              onPress={() => Linking.openURL(deposit.invoiceUrl as string)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ExternalLink size={14} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Open invoice</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onCheck}
            disabled={isChecking}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                opacity: isChecking ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <RefreshCw size={14} color={theme.text} />
            )}
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>I&apos;ve paid</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headIcon: {
    height: 36,
    width: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headBody: { flex: 1, gap: 2 },
  headTitle: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  headText: { fontSize: 11.5, lineHeight: 17, fontFamily: Fonts.sans[400] },

  amounts: { flexDirection: 'row', gap: Spacing.two },
  amount: {
    flex: 1,
    gap: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  amountLabel: { fontSize: 10, letterSpacing: 0.6, fontFamily: Fonts.sans[700] },
  amountValue: { fontSize: 13.5, fontFamily: Fonts.display[700] },

  addressBlock: { gap: Spacing.one },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  addressText: { flex: 1, fontSize: 11, fontFamily: Fonts.mono },

  explorer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  explorerText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  error: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
    padding: Spacing.three,
  },
  errorText: { fontSize: 11.5, lineHeight: 17, color: '#991b1b', fontFamily: Fonts.sans[600] },

  actions: { gap: Spacing.two },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
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
});
