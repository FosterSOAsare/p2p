import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { AlertTriangle, CheckCircle2 } from '@/components/icons';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVerifyDeposit } from '@/features/wallet/data/paymentsApi';
import { pendingAction } from '@/features/wallet/data/pendingAction';
import { landOn } from '@/features/shared/libs/landOn';
import { useCheckout, useFundDeal } from '@/features/escrow/data/dealsApi';

/**
 * Return leg from the hosted payment page.
 *
 * Normally unreachable, and that's the point. `openAuthSessionAsync` captures
 * this redirect and hands control straight back to the screen that started the
 * payment, which then verifies and carries on — so the whole flow completes
 * without ever routing here.
 *
 * In practice on Android it IS reached: the `veritrust://` redirect arrives as
 * an intent, and expo-router matches this route, so the screen that started the
 * payment never resumes.
 *
 * That is why this does more than verify. Crediting the wallet and stopping
 * there is what produced the worst version of this bug — the money arrived, the
 * item was never bought, and the buyer was left on the wallet screen with no
 * explanation. So it also completes whatever the payment was *for*, from the
 * intent recorded before the browser opened (see `pendingAction`), and lands on
 * the deal rather than the wallet.
 *
 * Verifying is safe to repeat — the server credits a reference only once — and
 * the intent is taken rather than read, so a purchase can never run twice.
 */
/** How long the confirmation stays up before moving on. Matches the crypto callback. */
const CONFIRMED_PAUSE_MS = 1400;

export default function PaymentCallbackRoute() {
  const theme = useTheme();
  const { reference, trxref } = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const verify = useVerifyDeposit();
  const checkout = useCheckout();
  const fundDeal = useFundDeal();
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'confirming' | 'done' | 'failed'>('confirming');
  /** What the payment actually achieved, in the buyer's terms. */
  const [outcome, setOutcome] = useState<string | null>(null);

  /*
    A confirmed payment is held on screen briefly before moving on.

    It used to navigate the instant the server answered, so the buyer went from
    a spinner reading "Confirming your payment…" straight to another screen and
    was never told the payment had actually gone through. The same beat the
    crypto callback already uses.
  */
  const finish = (to: string, said: string) => {
    setPhase('done');
    setOutcome(said);
    setTimeout(() => {
      /*
        Clear the screens the buyer walked through to get here before landing
        on the result.

        Replacing only this screen left the checkout underneath it, so Back
        after a successful purchase returned to the payment sheet — and that
        sheet, having seen the browser dismissed, was showing "Payment
        cancelled". Back out of a purchase that worked and the app told you it
        had failed, which invites paying twice.

        Popping to the root first means Back from the result goes home, which
        is where someone who has just finished paying expects to end up.
      */
      landOn(to);
    }, CONFIRMED_PAUSE_MS);
  };

  // The provider sends `reference`, sometimes `trxref`; either identifies it.
  const ref = reference ?? trxref;
  /** Strict mode double-invokes effects; the wallet must not be asked twice. */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!ref) {
      setPhase('failed');
      setMessage('No payment reference was returned. Check your wallet balance before retrying.');
      return;
    }

    /*
      Taken, not read: whichever side gets control back consumes the intent, so
      the purchase cannot be made twice if both run.
    */
    const intent = pendingAction.take();

    verify
      .mutateAsync(ref)
      .then(async (result) => {
        if (!result.credited) {
          setPhase('failed');
          setMessage(
            "That payment hasn't been confirmed yet. If you were charged it will appear in your wallet shortly.",
          );
          return;
        }

        // Nothing was pending — a plain top-up. The wallet is the right place.
        if (!intent) {
          finish('/wallet', 'Your wallet has been topped up.');
          return;
        }

        setMessage(null);
        try {
          if (intent.kind === 'checkout') {
            const { deal } = await checkout.mutateAsync({
              listingId: intent.listingId,
              quantity: intent.quantity,
              paymentMethod: intent.paymentMethod,
            });
            finish(`/escrow/${deal.id}`, 'Payment received and your order is now funded in escrow.');
          } else {
            await fundDeal.mutateAsync(intent.escrowId);
            finish(`/escrow/${intent.escrowId}`, 'Payment received and the deal is now funded in escrow.');
          }
        } catch {
          /*
            The charge landed but the purchase did not. The money is in the
            wallet, which is the safe end state — say so plainly rather than
            leaving them on a spinner wondering where it went.
          */
          setPhase('failed');
          setMessage(
            'Your payment was received and added to your wallet, but the purchase could not be completed. Nothing was lost — open the item and try again.',
          );
        }
      })
      .catch(() => {
        setPhase('failed');
        setMessage("We couldn't confirm that payment. Check your wallet balance before retrying.");
      });
    // Mutations are stable; re-running this effect would re-verify and re-buy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.centre}>
        {phase === 'done' ? (
          <>
            <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
              <CheckCircle2 size={26} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Payment confirmed</Text>
            {outcome ? (
              <Text style={[styles.text, { color: theme.textSecondary }]}>{outcome}</Text>
            ) : null}
          </>
        ) : phase === 'failed' ? (
          <>
            <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
              <AlertTriangle size={26} color="#e11d48" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Payment not confirmed</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{message}</Text>
            <Pressable
              onPress={() => landOn('/wallet')}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>Go to wallet</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.text, { color: theme.textSecondary }]}>Confirming your payment…</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.six },
  text: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', fontFamily: Fonts.sans[500] },
  title: { fontSize: 18, textAlign: 'center', fontFamily: Fonts.display[700] },
  badge: { width: 56, height: 56, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  buttonText: { color: '#ffffff', fontSize: 13, fontFamily: Fonts.sans[700] },
});
