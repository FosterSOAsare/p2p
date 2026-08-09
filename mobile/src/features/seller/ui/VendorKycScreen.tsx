import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Store,
} from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll, useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { SelectField } from '@/features/shared/ui/SelectField';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useMyKyc, useSubmitKyc, type KycSubmission } from '../data/kycApi';

/**
 * Vendor KYC — the phone version of `web/src/pages/VendorKyc.tsx`, serving both
 * `/sell` and `/vendor/kyc` as the web does.
 *
 * Same four states driven by the account's KYC status: verified (congratulations),
 * pending (under review), and the application form for unverified or rejected.
 * The form keeps the web's three steps — Business & Store Information,
 * Government Identity, Escrow Payout Accounts — with the same labels and the
 * same country / document options.
 *
 * The web's selects become chip rows, which is the native equivalent. Nothing
 * is submitted yet — see `onSubmit`.
 */

const COUNTRIES = ['Ghana', 'Nigeria', 'Kenya', 'United States', 'United Kingdom'];

const ID_TYPES = [
  { value: 'National ID', label: 'National ID Card (Ghana Card)' },
  { value: 'Passport', label: 'International Passport' },
  { value: 'Drivers License', label: "Driver's License" },
];

export function VendorKycScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const ensureVisible = useEnsureVisible();
  const fieldRefs = useRef<Record<string, View | null>>({});

  const [legalName, setLegalName] = useState(user?.fullName ?? '');
  const [storeName, setStoreName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('National ID');
  const [idNumber, setIdNumber] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const myKyc = useMyKyc();
  const submitKyc = useSubmitKyc();

  /**
   * `/api/kyc/me` is the authority — it knows about a submission made from any
   * device, which the session's own `kycStatus` only learns on the next
   * `/api/auth/me`. Fall back to the session while that query is in flight so
   * the screen doesn't flash the blank form at an already-verified seller.
   */
  const status = myKyc.data?.status ?? user?.kycStatus ?? 'unverified';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const backButton = (
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
  );

  const header = (
    <View style={styles.heading}>
      <View style={[styles.eyebrow, { backgroundColor: theme.primaryLight }]}>
        <Store size={13} color={theme.primary} />
        <Text style={[styles.eyebrowText, { color: theme.primary }]}>
          Vendor Onboarding &amp; KYC
        </Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Become a Verified Vendor</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Upgrade your buyer account to start listing physical goods on P2P Trust Market. Identity
        verification ensures 100% buyer trust.
      </Text>
    </View>
  );

  const label = (text: string, hint?: string) => (
    <Text style={[styles.label, { color: theme.textSecondary }]}>
      {text}
      {hint ? <Text style={[styles.labelHint, { color: theme.textTertiary }]}> {hint}</Text> : null}
    </Text>
  );

  /** Function, not a component — see the note in ProfileTabScreen. */
  const field = (
    key: string,
    labelText: string,
    value: string,
    onChangeText: (v: string) => void,
    placeholder: string,
    extra?: { hint?: string; multiline?: boolean; keyboardType?: 'phone-pad' },
  ) => (
    <View
      ref={(node) => {
        fieldRefs.current[key] = node;
      }}
      collapsable={false}
      style={styles.field}
    >
      {label(labelText, extra?.hint)}
      <TextInput
        value={value}
        onChangeText={(v) => {
          onChangeText(v);
          setError(null);
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        autoCorrect={false}
        multiline={extra?.multiline}
        keyboardType={extra?.keyboardType}
        textAlignVertical={extra?.multiline ? 'top' : 'center'}
        onFocus={() => ensureVisible(fieldRefs.current[key])}
        style={[
          styles.input,
          extra?.multiline ? styles.textarea : null,
          {
            color: theme.text,
            backgroundColor: theme.inputBackground,
            borderColor: theme.inputBorder,
          },
        ]}
      />
    </View>
  );

  const onSubmit = async () => {
    if (!legalName.trim() || !storeName.trim() || !address.trim() || !idNumber.trim()) {
      setError('Fill in your legal name, store name, address and document number.');
      return;
    }
    if (!momoNumber.trim() && !trxAddress.trim()) {
      setError('Add at least one payout account — mobile money or a TRX address.');
      return;
    }
    setError(null);

    // Optional fields are omitted rather than sent empty: the server validates
    // `trxAddress` against the TRON pattern, and "" would fail it.
    const body: KycSubmission = {
      legalName: legalName.trim(),
      storeName: storeName.trim(),
      country,
      address: address.trim(),
      idType: idType as KycSubmission['idType'],
      idNumber: idNumber.trim(),
      ...(taxId.trim() ? { taxId: taxId.trim() } : {}),
      ...(momoNumber.trim() ? { momoNumber: momoNumber.trim() } : {}),
      ...(trxAddress.trim() ? { trxAddress: trxAddress.trim() } : {}),
    };

    try {
      // No local `submitted` flag: the mutation invalidates the KYC query, so
      // `status` becomes 'pending' from the server's own answer.
      await submitKyc.mutateAsync(body);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  /* ── Verified ─────────────────────────────────────────────── */
  if (status === 'verified') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
          {backButton}
          {header}

          <View style={[styles.stateCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={[styles.stateIcon, { backgroundColor: theme.primary }]}>
              <ShieldCheck size={30} color="#ffffff" />
            </View>
            <View style={[styles.statePill, { backgroundColor: '#dcfce7' }]}>
              <ShieldCheck size={13} color="#166534" />
              <Text style={[styles.statePillText, { color: '#166534' }]}>Verified Seller</Text>
            </View>
            <Text style={[styles.stateTitle, { color: '#052e16' }]}>Congratulations!</Text>
            <Text style={[styles.stateBody, { color: '#166534' }]}>
              Your vendor KYC application has been verified. You can now post listings to the
              marketplace, manage inventory, and receive escrow payouts to your payout accounts.
            </Text>

            <Pressable
              onPress={() => router.push('/listings')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Create Your First Listing</Text>
              <ArrowRight size={16} color="#ffffff" />
            </Pressable>
          </View>
        </KeyboardAwareScroll>
      </SafeAreaView>
    );
  }

  /* ── Under review ─────────────────────────────────────────── */
  if (status === 'pending') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
          {backButton}
          {header}

          <View style={[styles.stateCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <View style={[styles.stateIcon, { backgroundColor: '#f59e0b' }]}>
              <Clock size={30} color="#ffffff" />
            </View>
            <View style={[styles.statePill, { backgroundColor: '#fef3c7' }]}>
              <Clock size={13} color="#92400e" />
              <Text style={[styles.statePillText, { color: '#92400e' }]}>
                Application Under Review
              </Text>
            </View>
            <Text style={[styles.stateTitle, { color: '#451a03' }]}>
              We&apos;re reviewing your application
            </Text>
            <Text style={[styles.stateBody, { color: '#92400e' }]}>
              Your KYC submission is with our review team. You&apos;ll be able to list on the
              marketplace once it&apos;s approved. You can keep buying and using escrow deals in the
              meantime.
            </Text>

            <Pressable
              onPress={() => router.replace('/home')}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: '#f59e0b', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Return to Dashboard</Text>
              <ArrowRight size={16} color="#ffffff" />
            </Pressable>
          </View>
        </KeyboardAwareScroll>
      </SafeAreaView>
    );
  }

  /* ── Application form (unverified / rejected) ─────────────── */
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        {backButton}
        {header}

        {status === 'rejected' ? (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedText}>
              Your previous submission was rejected. Correct the details below and resubmit.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Step 1 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.stepTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            Business &amp; Store Information
          </Text>
          {field('legalName', 'Legal Full Name', legalName, setLegalName, 'Kwame Asante')}
          {field('storeName', 'Public Store / Brand Name', storeName, setStoreName, 'Kwame Tech Hub')}
          {field('taxId', 'Tax ID / Business Reg Number', taxId, setTaxId, 'CS1234567890', {
            hint: '(optional)',
          })}

          <SelectField
            label="Operating Country"
            value={country}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            onSelect={setCountry}
            sheetTitle="Select operating country"
          />

          {field('address', 'Business Street Address', address, setAddress, '12 Oxford Street, Osu, Accra', {
            multiline: true,
          })}
        </View>

        {/* Step 2 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.stepTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            Government Identity
          </Text>

          <SelectField
            label="Document Type"
            value={idType}
            options={ID_TYPES}
            onSelect={setIdType}
            sheetTitle="Select document type"
          />

          {field('idNumber', 'Document Number', idNumber, setIdNumber, 'GHA-000000000-0')}
        </View>

        {/* Step 3 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.stepTitle, { color: theme.text, borderBottomColor: theme.border }]}>
            Escrow Payout Accounts
          </Text>
          <Text style={[styles.stepHint, { color: theme.textTertiary }]}>
            Add at least one — this is where released escrow funds are paid out.
          </Text>

          {field('momo', 'Mobile Money Number', momoNumber, setMomoNumber, '+233 24 000 0000', {
            hint: '(GH₵ · simulated)',
            keyboardType: 'phone-pad',
          })}
          {field('trx', 'TRX Address', trxAddress, setTrxAddress, 'T...', {
            hint: '(TRON Shasta testnet)',
          })}
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={submitKyc.isPending}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: theme.primary,
              opacity: submitKyc.isPending ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <ShieldCheck size={16} color="#ffffff" />
          <Text style={styles.primaryBtnText}>
            {submitKyc.isPending ? 'Submitting...' : 'Submit Vendor KYC Application'}
          </Text>
        </Pressable>

        <Text style={[styles.footNote, { color: theme.textTertiary }]}>
          Your details are used for verification only and are never shown on your public profile.
        </Text>
      </KeyboardAwareScroll>
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

  heading: { gap: 6 },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  eyebrowText: {
    fontSize: 10.5,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 22, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  stepTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.display[700],
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  stepHint: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400], marginTop: -Spacing.two },

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
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    outlineStyle: 'none',
  } as never,
  textarea: { height: 80, paddingTop: Spacing.three },


  stateCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  stateIcon: {
    height: 60,
    width: 60,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statePillText: { fontSize: 11.5, fontFamily: Fonts.sans[700] },
  stateTitle: { fontSize: 19, fontFamily: Fonts.display[700], textAlign: 'center' },
  stateBody: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400], textAlign: 'center' },

  rejectedBox: {
    borderRadius: Radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.three,
  },
  rejectedText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  errorBox: {
    borderRadius: Radius.md,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.three,
  },
  errorText: { fontSize: 12, fontFamily: Fonts.sans[600], color: '#b91c1c' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
  footNote: { fontSize: 10.5, lineHeight: 15, textAlign: 'center', fontFamily: Fonts.sans[400] },
});
