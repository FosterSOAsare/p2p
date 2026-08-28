import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  LockKeyhole,
  ShieldCheck,
  User,
} from '@/components/icons';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardAwareScroll, useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { useCreateStandaloneEscrow } from '../data/dealsApi';
import { quoteFee, type FeeSplit } from '../data/fees';
import { apiErrorMessage } from '@/features/shared/data/api';

/**
 * Standalone Off-Platform Contract — the phone version of the web's
 * `web/src/pages/NewEscrow.tsx`, reached from the "Start New Escrow Deal"
 * button on My Deals (the web reaches it at `/escrow/new`).
 *
 * Same fields in the same order, same copy, same fee preview. The web uses
 * `<select>` for currency and fee split; a phone gets segmented chips instead,
 * which is the native equivalent.
 *
 * The fee shown comes from the shared `quoteFee` helper rather than a flat
 * percentage worked out inline. That matters: the real schedule is 1.5% on GHS
 * with a GH₵2 minimum and a GH₵150 cap, but 1.0% and uncapped on TRX, so a flat
 * 1.5% quoted a figure the server would not charge on small, large, or crypto
 * deals.
 */

type Role = 'buyer' | 'seller';
type Currency = 'GHS' | 'TRX';

const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'GHS', label: 'GH₵ (MoMo / Cards)' },
  { key: 'TRX', label: 'TRX (Tron Crypto)' },
];

// Lowercase keys: the server's Joi schema accepts `buyer` / `seller` / `split`
// and rejects anything else, so these double as the wire values.
const FEE_SPLITS: { key: FeeSplit; label: string }[] = [
  { key: 'buyer', label: 'Buyer Pays Full Fee' },
  { key: 'seller', label: 'Seller Pays Full Fee' },
  { key: 'split', label: 'Split Fee (50 / 50)' },
];

/** "GHS 1,250.00" — same shape as the deals list. */
function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function NewEscrowScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Focusing a field asks the scroll view to lift it clear of the keyboard —
  // the same wiring AuthField uses on the login and signup forms.
  const ensureVisible = useEnsureVisible();
  const titleRow = useRef<View>(null);
  const counterpartyRow = useRef<View>(null);
  const amountRow = useRef<View>(null);
  const termsRow = useRef<View>(null);

  const [role, setRole] = useState<Role>('buyer');
  const [title, setTitle] = useState('');
  const [invitedUsername, setInvitedUsername] = useState('');
  const [amount, setAmount] = useState('500');
  const [currency, setCurrency] = useState<Currency>('GHS');
  // Same default as the web form and the server's schema.
  const [feeSplit, setFeeSplit] = useState<FeeSplit>('split');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createEscrow = useCreateStandaloneEscrow();

  // The web binds a number input; a phone keyboard hands back a string, so parse
  // once here and treat anything unparseable as 0 for the preview.
  const amountValue = Number.parseFloat(amount) || 0;
  const {
    fee: estimatedFee,
    buyerTotal,
    sellerPayout,
  } = quoteFee(amountValue, currency, feeSplit);

  /**
   * Mirrors the web's guard, plus the server's 3-character minimum on the title
   * — worth catching here so a valid-looking two-letter title doesn't come back
   * as a 400 after the round trip.
   */
  const handleSubmit = () => {
    setError(null);
    if (title.trim().length < 3) {
      setError('Give the contract a title of at least 3 characters.');
      return;
    }
    if (amountValue <= 0) {
      setError('Enter a deal amount greater than zero.');
      return;
    }

    createEscrow.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amountValue,
        currency,
        role,
        invitedUsername: invitedUsername.trim() || undefined,
        feeSplit,
      },
      {
        // Straight to the new deal, as the web does — that screen carries the
        // share code and QR the creator needs to invite the other side.
        onSuccess: (deal) => router.replace(`/escrow/${deal.id}`),
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  /** Back to My Deals — falls back to the tab when there's nothing to pop. */
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/deals');
  };

  /** One segmented row of choices, standing in for the web's <select>. */
  const chipRow = <T extends string>(
    options: { key: T; label: string }[],
    selected: T,
    onSelect: (key: T) => void,
  ) => (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const on = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[
              styles.chip,
              {
                backgroundColor: on ? theme.primary : theme.inputBackground,
                borderColor: on ? theme.primary : theme.inputBorder,
              },
            ]}
          >
            <Text
              style={[styles.chipText, { color: on ? '#ffffff' : theme.textSecondary }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const label = (text: string, hint?: string) => (
    <Text style={[styles.label, { color: theme.textSecondary }]}>
      {text}
      {hint ? <Text style={[styles.labelHint, { color: theme.textTertiary }]}> {hint}</Text> : null}
    </Text>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        {/* Back control — the web uses a small text link, but on a phone that's
            both hard to see and hard to hit, so it's a pill button here. */}
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

        {/* Heading block */}
        <View style={[styles.eyebrow, { backgroundColor: theme.primaryLight }]}>
          <ShieldCheck size={13} color={theme.primary} />
          <Text style={[styles.eyebrowText, { color: theme.primary }]}>
            Standalone Off-Platform Contract
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Start a Standalone Escrow Deal</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Lock funds securely for freelance services, direct sales, or off-market items. Funds
          release only upon manual buyer confirmation.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Role */}
        <View style={styles.field}>
          {label('My Role in this Contract')}
          {chipRow<Role>(
            [
              { key: 'buyer', label: '🛒 I am the Buyer' },
              { key: 'seller', label: '📦 I am the Seller' },
            ],
            role,
            setRole,
          )}
        </View>

        {/* Contract title */}
        <View ref={titleRow} collapsable={false} style={styles.field}>
          {label('Contract Title')}
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
            ]}
          >
            <FileText size={16} color={theme.textTertiary} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Custom Web Development & Design Package"
              placeholderTextColor={theme.textTertiary}
              onFocus={() => ensureVisible(titleRow.current)}
              style={[styles.input, { color: theme.text }]}
            />
          </View>
        </View>

        {/* Counterparty */}
        <View ref={counterpartyRow} collapsable={false} style={styles.field}>
          {label('Counterparty Username', '(optional)')}
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
            ]}
          >
            <User size={16} color={theme.textTertiary} />
            <TextInput
              value={invitedUsername}
              onChangeText={setInvitedUsername}
              placeholder="e.g. kwame_dev or seller_username"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => ensureVisible(counterpartyRow.current)}
              style={[styles.input, { color: theme.text }]}
            />
          </View>
          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            Leave blank to generate a public invite link to share with anyone.
          </Text>
        </View>

        {/* Amount */}
        <View ref={amountRow} collapsable={false} style={styles.field}>
          {label('Deal Amount')}
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
            ]}
          >
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="500"
              placeholderTextColor={theme.textTertiary}
              onFocus={() => ensureVisible(amountRow.current)}
              style={[styles.input, styles.inputStrong, { color: theme.text }]}
            />
          </View>
        </View>

        {/* Currency / rail */}
        <View style={styles.field}>
          {label('Currency / Rail')}
          {chipRow<Currency>(CURRENCIES, currency, setCurrency)}
        </View>

        {/* Fee split */}
        <View style={styles.field}>
          {label('Escrow Fee Paid By')}
          {chipRow<FeeSplit>(FEE_SPLITS, feeSplit, setFeeSplit)}
        </View>

        {/* Terms */}
        <View ref={termsRow} collapsable={false} style={styles.field}>
          {label('Contract Terms & Deliverables')}
          <View
            style={[
              styles.textareaWrap,
              { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
            ]}
          >
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe expected deliverables, project scope, and release conditions..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => ensureVisible(termsRow.current)}
              style={[styles.textarea, { color: theme.text }]}
            />
          </View>
        </View>

        {/* Protection note */}
        <View style={[styles.protection, { backgroundColor: theme.primaryLight }]}>
          <LockKeyhole size={16} color={theme.primary} />
          <Text style={[styles.protectionText, { color: theme.primary }]}>
            Protection: Funds stay in escrow until buyer confirms receipt.
          </Text>
        </View>

        {/* Fee preview */}
        <View
          style={[
            styles.preview,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
              Contract Base Amount:
            </Text>
            <Text style={[styles.previewValue, { color: theme.text }]}>
              {formatMoney(amountValue, currency)}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
              Platform Fee ({currency === 'TRX' ? '1.0%' : '1.5%'}):
            </Text>
            <Text style={[styles.previewValue, { color: theme.text }]}>
              {formatMoney(estimatedFee, currency)}
            </Text>
          </View>
          <View style={[styles.previewRow, styles.previewTotal, { borderTopColor: theme.border }]}>
            <Text style={[styles.previewTotalLabel, { color: theme.text }]}>
              Buyer Total Payment:
            </Text>
            <Text style={[styles.previewTotalValue, { color: theme.primary }]}>
              {formatMoney(buyerTotal, currency)}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewTotalLabel, { color: theme.text }]}>Seller Net Payout:</Text>
            <Text style={[styles.previewTotalValue, { color: theme.primary }]}>
              {formatMoney(sellerPayout, currency)}
            </Text>
          </View>
        </View>

        {/* Submit. Disabled while in flight: the endpoint has no request key to
            collapse duplicates on, so two taps would create two deals. */}
        <Pressable
          onPress={handleSubmit}
          disabled={createEscrow.isPending}
          accessibilityRole="button"
          accessibilityState={{ disabled: createEscrow.isPending, busy: createEscrow.isPending }}
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: theme.primary,
              opacity: createEscrow.isPending ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {createEscrow.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <ArrowRight size={16} color="#ffffff" />
          )}
          <Text style={styles.submitText}>
            {createEscrow.isPending ? 'Creating…' : 'Create & Launch Escrow Deal'}
          </Text>
        </Pressable>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },

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

  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  eyebrowText: { fontSize: 11, fontFamily: Fonts.sans[700], textTransform: 'uppercase', letterSpacing: 0.4 },
  // Screen heading — the web's `font-display` (Space Grotesk).
  title: { fontSize: 20, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 19, fontFamily: Fonts.sans[400] },

  errorBox: {
    borderRadius: Radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.three,
  },
  errorText: { fontSize: 12, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  field: { gap: 6 },
  label: { fontSize: 11, fontFamily: Fonts.sans[700], textTransform: 'uppercase', letterSpacing: 0.4 },
  labelHint: { fontFamily: Fonts.sans[400], textTransform: 'none', letterSpacing: 0 },
  hint: { fontSize: 11, fontFamily: Fonts.sans[400] },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  input: { flex: 1, fontSize: 13, fontFamily: Fonts.sans[400], outlineStyle: 'none' } as never,
  inputStrong: { fontFamily: Fonts.sans[600] },

  textareaWrap: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  textarea: {
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    minHeight: 96,
    outlineStyle: 'none',
  } as never,

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  chipText: { fontSize: 12, fontFamily: Fonts.sans[700], textAlign: 'center' },

  protection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  protectionText: { flex: 1, fontSize: 11.5, lineHeight: 17, fontFamily: Fonts.sans[600] },

  preview: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  previewLabel: { fontSize: 12, fontFamily: Fonts.sans[400] },
  previewValue: { fontSize: 12, fontFamily: Fonts.sans[600] },
  previewTotal: { borderTopWidth: 1, paddingTop: Spacing.two },
  previewTotalLabel: { fontSize: 13, fontFamily: Fonts.sans[700] },
  // The web sets these two figures in `font-display`.
  previewTotalValue: { fontSize: 13, fontFamily: Fonts.display[700] },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  submitText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
