import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVerifyDeposit } from '@/features/wallet/data/paymentsApi';
import { pendingAction } from '@/features/wallet/data/pendingAction';
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
export default function PaymentCallbackRoute() {
  const theme = useTheme();
  const { reference, trxref } = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const verify = useVerifyDeposit();
  const checkout = useCheckout();
  const fundDeal = useFundDeal();
  const [message, setMessage] = useState<string | null>(null);

  // The provider sends `reference`, sometimes `trxref`; either identifies it.
  const ref = reference ?? trxref;
  /** Strict mode double-invokes effects; the wallet must not be asked twice. */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!ref) {
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
          setMessage(
            "That payment hasn't been confirmed yet. If you were charged it will appear in your wallet shortly.",
          );
          return;
        }

        // Nothing was pending — a plain top-up. The wallet is the right place.
        if (!intent) {
          router.replace('/wallet');
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
            router.replace(`/escrow/${deal.id}`);
          } else {
            await fundDeal.mutateAsync(intent.escrowId);
            router.replace(`/escrow/${intent.escrowId}`);
          }
        } catch {
          /*
            The charge landed but the purchase did not. The money is in the
            wallet, which is the safe end state — say so plainly rather than
            leaving them on a spinner wondering where it went.
          */
          setMessage(
            'Your payment was received and added to your wallet, but the purchase could not be completed. Nothing was lost — open the item and try again.',
          );
        }
      })
      .catch(() =>
        setMessage("We couldn't confirm that payment. Check your wallet balance before retrying."),
      );
    // Mutations are stable; re-running this effect would re-verify and re-buy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.centre}>
        {message ? (
          <Text style={[styles.text, { color: theme.textSecondary }]}>{message}</Text>
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
});
