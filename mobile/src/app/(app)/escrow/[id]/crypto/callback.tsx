import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { AlertTriangle, CheckCircle2, Coins } from '@/components/icons';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { landOn } from '@/features/shared/libs/landOn';
import { apiErrorMessage } from '@/features/shared/data/api';
import {
  payStatusLabel,
  useCheckCryptoDeposit,
  type CryptoDeposit,
} from '@/features/escrow/data/cryptoApi';

/**
 * Return leg from the NOWPayments invoice — the phone version of
 * `web/src/pages/CryptoCallback.tsx`.
 *
 * Like the wallet's payment callback, this is the path the app normally does
 * *not* take. The deal screen passes this route as the invoice's `returnUrl` and
 * `openAuthSessionAsync` captures the redirect, handing control straight back
 * there — so the usual flow completes without ever routing here. This exists for
 * when the deep link does land on the router instead: the app was killed while
 * the invoice was open, or the link was opened from somewhere else. Without it a
 * buyer would arrive on a dead screen having just paid.
 *
 * It settles nothing itself either way: the deposit is confirmed by the chain,
 * not by the buyer arriving here. All it does is ask the provider on our
 * behalf, which is what makes the flow work on a server the IPN cannot reach.
 * `NP_id` on the query string is the payment id, and the only way to identify
 * the payment before an IPN has ever landed.
 */

type Phase = 'checking' | 'pending' | 'done' | 'failed';

/** How long to keep asking before handing the buyer back to the deal page. */
const POLL_MS = 5000;
/** How long the confirmation stays up before moving on. Same beat the fiat
 *  callback uses, so both rails confirm identically. */
const CONFIRMED_PAUSE_MS = 1400;
const MAX_ATTEMPTS = 24; // ~2 minutes

export default function CryptoCallbackRoute() {
  const theme = useTheme();
  const { id = '', NP_id } = useLocalSearchParams<{ id: string; NP_id?: string }>();
  const check = useCheckCryptoDeposit();

  const [phase, setPhase] = useState<Phase>('checking');
  const [deposit, setDeposit] = useState<CryptoDeposit | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
    The mutation object is stable but not referentially frozen, so it stays out
    of the dep array — re-running on it would restart the poll from zero every
    render. Cancellation lives in the closure rather than a ref guard, matching
    the web: a ref guard trips on Strict Mode's second invoke while the first
    run has already been cancelled by its own cleanup, leaving no live poll at
    all. Checking a deposit is idempotent, so a redundant request is the cheaper
    of the two failures.
  */
  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    if (!id) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = async () => {
      attempts += 1;
      try {
        const result = await checkRef.current.mutateAsync({ escrowId: id, paymentId: NP_id });
        if (cancelled) return;
        setDeposit(result);

        if (result.funded) {
          setPhase('done');
          // Let the confirmation land before moving on.
          timer = setTimeout(() => landOn(`/escrow/${id}`), CONFIRMED_PAUSE_MS);
          return;
        }
        if (result.dead) {
          setPhase('failed');
          setError('That invoice is no longer payable. Open the deal to start a new one.');
          return;
        }
        if (attempts >= MAX_ATTEMPTS) {
          // Still in flight. Not a failure — TRX confirmations simply take
          // longer than a buyer should stare at a spinner for.
          setPhase('pending');
          return;
        }
        setPhase('checking');
        timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(apiErrorMessage(err));
        setPhase('failed');
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, NP_id]);

  const openDeal = () => landOn(`/escrow/${id}`);

  if (phase === 'failed') {
    return (
      <Shell>
        <View style={[styles.icon, { backgroundColor: '#fee2e2' }]}>
          <AlertTriangle size={22} color="#991b1b" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Deposit not confirmed</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{error}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => landOn('/deals')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>All deals</Text>
          </Pressable>
          <Pressable
            onPress={openDeal}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Open deal</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  if (phase === 'pending') {
    const { label } = payStatusLabel(deposit?.payStatus ?? null);
    return (
      <Shell>
        <View style={[styles.icon, { backgroundColor: '#fef9c3' }]}>
          <Coins size={22} color="#854d0e" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Still confirming</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {label}. Tron usually settles within a minute or two — the deal page tracks it live, so you
          don&apos;t need to wait here.
        </Text>
        <Pressable
          onPress={openDeal}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Open deal</Text>
        </Pressable>
      </Shell>
    );
  }

  return (
    <Shell>
      {phase === 'done' ? (
        <View style={[styles.icon, { backgroundColor: '#dcfce7' }]}>
          <CheckCircle2 size={22} color="#166534" />
        </View>
      ) : (
        <ActivityIndicator size="large" color={theme.primary} />
      )}
      <Text style={[styles.title, { color: theme.text }]}>
        {phase === 'done' ? 'Escrow funded' : 'Confirming your deposit…'}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {phase === 'done'
          ? 'Your deposit was confirmed on-chain. The seller has been notified.'
          : "Checking the Tron network — this can take a minute. Please don't close this screen."}
      </Text>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.centre}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.six,
  },
  icon: {
    height: 48,
    width: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, textAlign: 'center', fontFamily: Fonts.display[700] },
  body: { fontSize: 12.5, lineHeight: 19, textAlign: 'center', fontFamily: Fonts.sans[400] },
  actions: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.one },
  primaryBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  primaryBtnText: { fontSize: 12.5, color: '#ffffff', fontFamily: Fonts.sans[700] },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  secondaryBtnText: { fontSize: 12.5, fontFamily: Fonts.sans[600] },
});
