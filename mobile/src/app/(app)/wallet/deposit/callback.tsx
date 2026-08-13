import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVerifyDeposit } from '@/features/wallet/data/paymentsApi';

/**
 * Return leg from the hosted payment page.
 *
 * Normally unreachable, and that's the point. `openAuthSessionAsync` captures
 * this redirect and hands control straight back to the screen that started the
 * payment, which then verifies and carries on — so the whole flow completes
 * without ever routing here.
 *
 * It exists for the cases where the deep link *does* land on the router
 * instead: the app was killed while the payment page was open, or the link was
 * opened from somewhere else entirely. Without this the buyer would arrive on
 * a dead screen having just been charged. Verifying is safe to repeat — the
 * server credits a reference only once.
 */
export default function PaymentCallbackRoute() {
  const theme = useTheme();
  const { reference, trxref } = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const verify = useVerifyDeposit();
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

    verify
      .mutateAsync(ref)
      .then((result) => {
        if (result.credited) router.replace('/wallet');
        else setMessage("That payment hasn't been confirmed yet. If you were charged it will appear in your wallet shortly.");
      })
      .catch(() =>
        setMessage("We couldn't confirm that payment. Check your wallet balance before retrying."),
      );
  }, [ref, verify]);

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
