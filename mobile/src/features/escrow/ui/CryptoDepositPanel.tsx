import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Coins, ExternalLink, RefreshCw } from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { payStatusLabel, type CryptoDeposit } from '../data/cryptoApi';

/**
 * Live state of a TRX deposit, shown on the deal page once an invoice is open —
 * the phone version of `web/src/features/escrow/ui/CryptoDepositPanel.tsx`.
 *
 * The buyer pays on the provider's page, so this is a watcher, not a form: it
 * says what is owed, what has arrived, and where the transfer is. The one button
 * that matters is "I've paid" — the escape hatch for when the provider's
 * callback is slow or cannot reach us.
 */

interface CryptoDepositPanelProps {
  deposit: CryptoDeposit;
  /** Asking the provider for the authoritative status right now. */
  isChecking?: boolean;
  /** Opening a replacement invoice for a dead one. */
  isReopening?: boolean;
  errorMessage?: string | null;
  onCheck: () => void;
  onReopen: () => void;
  /** Re-open the hosted invoice in the browser. */
  onOpenInvoice: () => void;
}

/** Tones carry their own colours: these panels read the same in either scheme. */
const TONE = {
  good: { bg: '#dcfce7', border: '#86efac', icon: '#166534', text: '#14532d' },
  bad: { bg: '#fee2e2', border: '#fca5a5', icon: '#991b1b', text: '#7f1d1d' },
  pending: { bg: '#fef3c7', border: '#fcd34d', icon: '#92400e', text: '#78350f' },
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
  onOpenInvoice,
}: CryptoDepositPanelProps) {
  const theme = useTheme();

  const { label, tone } = deposit.funded
    ? ({ label: 'Deposit received — deal funded', tone: 'good' } as const)
    : payStatusLabel(deposit.payStatus);
  const palette = TONE[tone];

  const shortfall = Math.max(0, deposit.expected - deposit.received);

  const body = deposit.funded
    ? `${trx(deposit.received, deposit.payCurrency)} received and held in escrow.`
    : deposit.dead
      ? 'This invoice is no longer payable. Open a new one to try again.'
      : deposit.payStatus === 'partially_paid'
        ? `Short by ${trx(shortfall, deposit.payCurrency)}. Send the balance, or contact support to sort it out.`
        : `Send ${trx(deposit.expected, deposit.payCurrency)} on the invoice page. This updates by itself once the network confirms it.`;

  const Icon = tone === 'good' ? CheckCircle2 : tone === 'bad' ? AlertTriangle : Coins;

  return (
    <View style={[styles.panel, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBadge, { backgroundColor: '#ffffff' }]}>
          <Icon size={17} color={palette.icon} />
        </View>
        <View style={styles.headerBody}>
          <Text style={[styles.title, { color: palette.text }]}>{label}</Text>
          <Text style={[styles.body, { color: palette.text }]}>{body}</Text>
        </View>
      </View>

      {/* Amounts */}
      <View style={styles.amountRow}>
        <View style={styles.amountCell}>
          <Text style={[styles.amountLabel, { color: palette.icon }]}>DUE</Text>
          <Text style={[styles.amountValue, { color: palette.text }]}>
            {trx(deposit.expected, deposit.payCurrency)}
          </Text>
        </View>
        <View style={styles.amountCell}>
          <Text style={[styles.amountLabel, { color: palette.icon }]}>RECEIVED</Text>
          <Text style={[styles.amountValue, { color: palette.text }]}>
            {trx(deposit.received, deposit.payCurrency)}
          </Text>
        </View>
      </View>

      {/* Deposit address — only exists once the buyer has picked a coin.
          `selectable` rather than a copy button: the app carries no clipboard
          module, and long-press-to-copy is the platform gesture anyway. */}
      {deposit.depositAddress ? (
        <View style={styles.addressBlock}>
          <Text style={[styles.amountLabel, { color: palette.icon }]}>DEPOSIT ADDRESS</Text>
          <Text selectable style={[styles.address, { color: palette.text }]}>
            {deposit.depositAddress}
          </Text>
        </View>
      ) : null}

      {deposit.explorerUrl ? (
        <Pressable
          onPress={() => Linking.openURL(deposit.explorerUrl!)}
          accessibilityRole="link"
          style={styles.linkRow}
        >
          <ExternalLink size={12} color={theme.primary} />
          <Text style={[styles.linkText, { color: theme.primary }]}>
            View transaction on Tronscan
          </Text>
        </Pressable>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox}>
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
              style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: isReopening ? 0.6 : 1 }]}
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
              onPress={onOpenInvoice}
              accessibilityRole="button"
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            >
              <ExternalLink size={14} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Open invoice</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onCheck}
            disabled={isChecking}
            accessibilityRole="button"
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: isChecking ? 0.6 : 1,
              },
            ]}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <RefreshCw size={14} color={theme.text} />
            )}
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>I've paid</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
  body: { fontSize: 11.5, lineHeight: 17, fontFamily: Fonts.sans[400] },

  amountRow: { flexDirection: 'row', gap: Spacing.two },
  amountCell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  amountLabel: { fontSize: 9.5, fontFamily: Fonts.sans[700], letterSpacing: 0.6 },
  amountValue: { fontSize: 13, fontFamily: Fonts.display[700] },

  addressBlock: { gap: 4 },
  address: {
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },

  errorBox: {
    borderRadius: Radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.two,
  },
  errorText: { fontSize: 11.5, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  actions: { gap: Spacing.two },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  secondaryBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },
});
