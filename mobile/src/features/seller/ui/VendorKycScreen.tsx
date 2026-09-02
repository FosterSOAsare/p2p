import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ShieldCheck, Store } from '@/components/icons';

import { Fonts, ReadingWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll, useEnsureVisible } from '@/features/shared/ui/KeyboardAwareScroll';
import { SelectField } from '@/features/shared/ui/SelectField';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useMyKyc, useSubmitKyc, type KycSubmission } from '../data/kycApi';

/**
 * Vendor KYC — the phone version of `web/src/pages/VendorKyc.tsx`, serving both
 * `/sell` and `/vendor/kyc` as the web does.
 *
 * Three states, driven by the account's KYC status: verified (congratulations),
 * pending (under review), and the application form for unverified or rejected.
 * The web has a fourth — a signed-out prompt — which can't be reached here,
 * since the route sits inside the authenticated `(app)` group.
 *
 * The form asks for the web's three groups — store and legal details,
 * government identity, escrow payout accounts — with the same fields, rules and
 * options. Its `<select>`s become `SelectField` sheets, which is the native
 * equivalent.
 *
 * Where it deliberately departs from the web: those groups are paged rather
 * than stacked. The web can afford one long form on a desktop screen; on a
 * phone the same markup was a single scroll deep enough to bury the submit
 * button, with no sense of how much was left. So an intro names the three steps
 * before the seller commits to any of them, then each is its own screen behind
 * a progress bar, and Next refuses to leave a step whose fields aren't valid —
 * errors surface where the field is rather than after a scroll to the bottom.
 *
 * A rejected application prefills from the answers already on file, so
 * resubmitting is a correction rather than a retype — see the adopt effect. Its
 * rejection reason gets the intro screen, where there is room for the
 * reviewer's actual words.
 */

const COUNTRIES = ['Ghana', 'Nigeria', 'Kenya', 'United States', 'United Kingdom'];

/** `kyc.validation.ts`'s own patterns, so the phone refuses exactly what the server would. */
const MOMO_PATTERN = /^\+?[0-9\s-]{9,15}$/;
const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/**
 * The app's date style (`en-GB`, "23 Jul 2026"), shared with My Listings,
 * Promotions and the deal screens. The web renders `en-US` here; the phone is
 * internally consistent instead, since a lone US date on this one panel would
 * read as a bug next to every other date in the app.
 */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ID_TYPES = [
  { value: 'Passport', label: 'International Passport' },
  { value: 'National ID', label: 'National ID Card (Ghana Card)' },
  { value: 'Drivers License', label: "Driver's License" },
];

/** 0 is the intro; 1–3 are the form steps, in order. */
type Step = 0 | 1 | 2 | 3;

const STEP_TITLES: Record<Exclude<Step, 0>, string> = {
  1: 'Store & Legal Info',
  2: 'Government Identity',
  3: 'Escrow Payout Accounts',
};

const LAST_STEP = 3;

export function VendorKycScreen() {
  const theme = useTheme();
  const tones = useTones();
  const router = useRouter();
  const { user } = useAuth();
  const ensureVisible = useEnsureVisible();
  const fieldRefs = useRef<Record<string, View | null>>({});

  const [legalName, setLegalName] = useState(user?.fullName ?? '');
  const [storeName, setStoreName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('Passport');
  const [idNumber, setIdNumber] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  /*
    Which page of the application is on screen. The form was one long scroll of
    all three groups; on a phone that buried the submit button under a column of
    inputs with no sense of how much was left.

    Local state rather than three routes: every step writes into the same set of
    fields and only the last one submits, so routing would mean lifting all of
    it somewhere shared for no gain the back gesture doesn't already give.
  */
  const [step, setStep] = useState<Step>(0);

  const myKyc = useMyKyc();
  const submitKyc = useSubmitKyc();

  /**
   * `/api/kyc/me` is the authority — it knows about a submission made from any
   * device, which the session's own `kycStatus` only learns on the next
   * `/api/auth/me`. Fall back to the session while that query is in flight so
   * the screen doesn't flash the blank form at an already-verified seller.
   */
  const status = myKyc.data?.status ?? user?.kycStatus ?? 'unverified';

  /**
   * Prefill from the answers already on file — the web's `values` prop on
   * `useForm`, which is what makes rejection a correction rather than a retype.
   *
   * Adopted once, keyed off the ref: a refetch (or a screen focus) must not
   * overwrite edits the seller has since made to the very fields they were
   * asked to fix.
   */
  const submission = myKyc.data?.submission;
  const adoptedRef = useRef(false);
  useEffect(() => {
    if (!submission || adoptedRef.current) return;
    adoptedRef.current = true;
    setLegalName(submission.legalName);
    setStoreName(submission.storeName);
    setTaxId(submission.taxId ?? '');
    setCountry(submission.country);
    setAddress(submission.address);
    setIdType(submission.idType);
    setIdNumber(submission.idNumber);
    setMomoNumber(submission.momoNumber ?? '');
    setTrxAddress(submission.trxAddress ?? '');
  }, [submission]);

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
        Upgrade your buyer account to start listing physical goods on VeriTrust. Identity
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
    extra?: {
      hint?: string;
      multiline?: boolean;
      keyboardType?: 'phone-pad';
      maxLength?: number;
    },
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
        maxLength={extra?.maxLength}
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

  /**
   * The web's `kycSchema`, message for message — and the Joi behind it in
   * `kyc.validation.ts`, which is where these rules actually come from.
   *
   * Split by step rather than checked in one pass, so Next can refuse to leave
   * a step the seller has not finished. Same rules and same wording as before,
   * only asked about a step at a time; sweeping all three in order reproduces
   * the original single check exactly, which is what submit still does.
   *
   * Reported one at a time, in field order, because this screen has a single
   * banner rather than the web's per-field errors. The patterns matter most:
   * a mistyped TRX address used to cost a round trip to be told the same
   * thing the server already knew.
   */
  const problemInStep = (s: Step): string | null => {
    if (s === 1) {
      if (legalName.trim().length < 2) return 'Enter your legal name';
      if (storeName.trim().length < 2) return 'Enter your store name';
      if (country.trim().length < 2) return 'Select your country';
      if (address.trim().length < 5) return 'Enter your business address';
      return null;
    }
    if (s === 2) {
      if (idNumber.trim().length < 4) return 'Enter your document number';
      return null;
    }
    if (momoNumber.trim() && !MOMO_PATTERN.test(momoNumber.trim())) {
      return 'Enter a valid mobile money number';
    }
    if (trxAddress.trim() && !TRON_ADDRESS_PATTERN.test(trxAddress.trim())) {
      return 'Enter a valid TRX address (starts with T)';
    }
    if (!momoNumber.trim() && !trxAddress.trim()) {
      return 'Provide at least one payout account (mobile money or TRX address)';
    }
    return null;
  };

  /** Advance, but only once this step's own fields are good. */
  const goNext = () => {
    if (step === 0) {
      setError(null);
      setStep(1);
      return;
    }
    const problem = problemInStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((step + 1) as Step);
  };

  const goPrevious = () => {
    setError(null);
    setStep((step - 1) as Step);
  };

  const onSubmit = async () => {
    /*
      Re-check every step, not just the last one.

      Stepping through can only have validated what was on screen at the time,
      and a seller can walk back and empty a field they had already passed. On a
      failure this returns them to the step that owns it — reporting a problem
      the seller cannot see is worse than not reporting it.
    */
    for (const s of [1, 2, 3] as const) {
      const problem = problemInStep(s);
      if (problem) {
        setError(problem);
        setStep(s);
        return;
      }
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

          <View
            style={[
              styles.stateCard,
              { backgroundColor: tones.success.surface, borderColor: tones.success.border },
            ]}
          >
            {/* Tick in the tile, shield in the pill — the web's pairing. */}
            <View style={[styles.stateIcon, { backgroundColor: theme.primary }]}>
              <CheckCircle2 size={30} color="#ffffff" />
            </View>
            <View style={[styles.statePill, { backgroundColor: tones.success.chip }]}>
              <ShieldCheck size={13} color={tones.success.text} />
              <Text style={[styles.statePillText, { color: tones.success.text }]}>
                Verified Seller
              </Text>
            </View>
            {/* The store the seller applied under, so the confirmation names
                the thing that was actually approved. */}
            <Text style={[styles.stateTitle, { color: tones.success.strong }]}>
              Congratulations{submission?.storeName ? `, ${submission.storeName}` : ''}!
            </Text>
            <Text style={[styles.stateBody, { color: tones.success.text }]}>
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

            {/* The web's second CTA. Its /dashboard is the home tab here. */}
            <Pressable
              onPress={() => router.replace('/home')}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.card,
                  borderColor: tones.success.border,
                },
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: tones.success.strong }]}>
                Go to Seller Dashboard
              </Text>
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

          <View
            style={[
              styles.stateCard,
              { backgroundColor: tones.warning.surface, borderColor: tones.warning.border },
            ]}
          >
            <View style={[styles.stateIcon, { backgroundColor: '#f59e0b' }]}>
              <Clock size={30} color="#ffffff" />
            </View>
            <View style={[styles.statePill, { backgroundColor: tones.warning.chip }]}>
              <Clock size={13} color={tones.warning.text} />
              <Text style={[styles.statePillText, { color: tones.warning.text }]}>
                Application Under Review
              </Text>
            </View>
            <Text style={[styles.stateTitle, { color: tones.warning.strong }]}>
              We&apos;re reviewing your application
            </Text>
            <Text style={[styles.stateBody, { color: tones.warning.text }]}>
              Your KYC submission
              {myKyc.data?.submittedAt ? ` from ${formatDate(myKyc.data.submittedAt)}` : ''} is with
              our review team. You&apos;ll be able to list on the marketplace once it&apos;s
              approved. You can keep buying and using escrow deals in the meantime.
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

  /* ── Intro (unverified / rejected) ────────────────────────── */
  if (step === 0) {
    const rejected = status === 'rejected';
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
        <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
          {backButton}
          {header}

          {rejected ? (
            <View
              style={[
                styles.rejectedBox,
                { backgroundColor: tones.danger.chip, borderColor: tones.danger.border },
              ]}
            >
              <Text style={[styles.rejectedText, { color: tones.danger.text }]}>
                Your previous application was rejected
              </Text>
              {/* The reviewer's own words. Without this the seller is told to
                  correct the details but not which ones were wrong. */}
              <Text style={[styles.rejectedReason, { color: tones.danger.text }]}>
                {myKyc.data?.rejectionReason ||
                  'No reason was provided. Please review your details and submit again.'}
              </Text>
              <Text style={[styles.rejectedHint, { color: tones.danger.text }]}>
                Your previous answers are prefilled — correct them and resubmit.
              </Text>
            </View>
          ) : null}

          <View
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={[styles.introIcon, { backgroundColor: theme.primaryLight }]}>
              <ShieldCheck size={26} color={theme.primary} />
            </View>
            <Text style={[styles.introTitle, { color: theme.text }]}>
              {rejected ? 'Fix your application' : 'Verify to start selling'}
            </Text>
            <Text style={[styles.introBody, { color: theme.textSecondary }]}>
              {rejected
                ? 'Three short steps, already filled in with your previous answers.'
                : 'Three short steps. Have your ID document and a payout account to hand — it takes a couple of minutes.'}
            </Text>

            {/* Naming the steps up front is the point of this screen: the
                seller can see what is being asked before committing to it. */}
            <View style={styles.introSteps}>
              {([1, 2, 3] as const).map((n) => (
                <View key={n} style={styles.introStepRow}>
                  <View style={[styles.introStepNum, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.introStepNumText, { color: theme.textSecondary }]}>{n}</Text>
                  </View>
                  <Text style={[styles.introStepLabel, { color: theme.textSecondary }]}>
                    {STEP_TITLES[n]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ShieldCheck size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>
              {rejected ? 'Fix and resubmit' : 'Verify to start selling'}
            </Text>
            <ArrowRight size={16} color="#ffffff" />
          </Pressable>

          <Text style={[styles.footNote, { color: theme.textTertiary }]}>
            Your details are used for verification only and are never shown on your public profile.
          </Text>
        </KeyboardAwareScroll>
      </SafeAreaView>
    );
  }

  /* ── Application form, one step at a time ─────────────────── */
  const current = step as Exclude<Step, 0>;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        {/* Back walks the wizard, not the navigator — leaving the screen
            entirely from step 2 would throw away the steps already done. */}
        <Pressable
          onPress={goPrevious}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={current === 1 ? 'Back to start' : 'Back to previous step'}
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

        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <Text style={[styles.progressCount, { color: theme.primary }]}>
              Step {current} of {LAST_STEP}
            </Text>
            <Text style={[styles.progressTitle, { color: theme.text }]}>
              {STEP_TITLES[current]}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            {([1, 2, 3] as const).map((n) => (
              <View
                key={n}
                style={[
                  styles.progressSegment,
                  { backgroundColor: n <= current ? theme.primary : theme.border },
                ]}
              />
            ))}
          </View>
        </View>

        {error ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: tones.danger.chip, borderColor: tones.danger.border },
            ]}
          >
            <Text style={[styles.errorText, { color: tones.danger.text }]}>{error}</Text>
          </View>
        ) : null}

        {current === 1 ? (
          <View
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            {field('legalName', 'Legal Full Name', legalName, setLegalName, 'Kwame Asante', {
            maxLength: 100,
          })}
          {field(
            'storeName',
            'Public Store / Brand Name',
            storeName,
            setStoreName,
            'Kwame Tech Hub',
            { maxLength: 100 },
          )}
          {field('taxId', 'Tax ID / Business Reg Number', taxId, setTaxId, 'CS1234567890', {
            hint: '(optional)',
            maxLength: 50,
          })}

          <SelectField
            label="Operating Country"
            value={country}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            onSelect={setCountry}
            sheetTitle="Select operating country"
          />

            {field(
              'address',
              'Business Street Address',
              address,
              setAddress,
              '12 Oxford Street, Osu, Accra',
              { multiline: true, maxLength: 200 },
            )}
          </View>
        ) : null}

        {current === 2 ? (
          <View
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <SelectField
              label="Document Type"
              value={idType}
              options={ID_TYPES}
              onSelect={setIdType}
              sheetTitle="Select document type"
            />

            {field('idNumber', 'Document Number', idNumber, setIdNumber, 'GHA-000000000-0', {
              maxLength: 50,
            })}
          </View>
        ) : null}

        {current === 3 ? (
          <View
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.stepHint, { color: theme.textTertiary }]}>
              Provide at least one. GH₵ deals pay out to your mobile money; TRX deals pay out to
              your TRX address.
            </Text>

            {field('momo', 'Mobile Money Number', momoNumber, setMomoNumber, '+233 24 000 0000', {
              hint: '(GH₵ · simulated)',
              keyboardType: 'phone-pad',
            })}
            {field('trx', 'TRX Address', trxAddress, setTrxAddress, 'T...', {
              hint: '(TRON Shasta testnet)',
            })}
          </View>
        ) : null}

        {current < LAST_STEP ? (
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
            <ArrowRight size={16} color="#ffffff" />
          </Pressable>
        ) : (
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
              {submitKyc.isPending
                ? 'Submitting KYC Application...'
                : status === 'rejected'
                  ? 'Resubmit Vendor KYC Application'
                  : 'Submit Vendor KYC Application'}
            </Text>
          </Pressable>
        )}

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
  stepHint: { fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans[400] },

  // Intro
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { fontSize: 18, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  introBody: { fontSize: 12.5, lineHeight: 19, fontFamily: Fonts.sans[400] },
  introSteps: { gap: Spacing.two },
  introStepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  introStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introStepNumText: { fontSize: 11, fontFamily: Fonts.sans[700] },
  introStepLabel: { fontSize: 12.5, fontFamily: Fonts.sans[600] },

  // Progress
  progress: { gap: Spacing.two },
  progressHead: { gap: 2 },
  progressCount: {
    fontSize: 10,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressTitle: { fontSize: 17, fontFamily: Fonts.display[700], letterSpacing: -0.3 },
  progressTrack: { flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },

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
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rejectedText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[700] },
  rejectedReason: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  rejectedHint: { fontSize: 10.5, lineHeight: 15, fontFamily: Fonts.sans[400], opacity: 0.8 },

  errorBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  errorText: { fontSize: 12, fontFamily: Fonts.sans[600] },

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
  // The web's outlined companion to the primary CTA on the verified panel.
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: Spacing.five,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  secondaryBtnText: { fontSize: 13, fontFamily: Fonts.sans[700] },
  footNote: { fontSize: 10.5, lineHeight: 15, textAlign: 'center', fontFamily: Fonts.sans[400] },
});
