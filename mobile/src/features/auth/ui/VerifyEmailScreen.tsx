import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { ArrowRight, CheckCircle2, MailCheck, RefreshCw } from '@/components/icons';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useResendVerification, useVerifyEmail } from '../data/authApi';

/**
 * Verify email — the phone version of `web/src/features/auth/ui/VerifyEmail.tsx`.
 *
 * Mirrors its states: verifying an emailed link (`?token=`), the verified
 * confirmation that bounces to sign-in after 1.5s, and the default
 * "Check your email" screen with resend. Copy is kept as the web has it,
 * including the prototype note about simulated delivery.
 *
 * Signup lands here right after creating an account, so the email it passes
 * through as `?email=` is what gets shown.
 */
export function VerifyEmailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();

  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerification();

  const verifying = verifyEmail.isPending;
  const resending = resendVerification.isPending;

  const displayEmail = user?.email ?? email;

  /**
   * A link with a token verifies on arrival, as the web's query does.
   *
   * `mutate` is called exactly once per token: the effect depends only on
   * `token`, and the mutation object is deliberately left out of the deps — it
   * changes identity on every state transition, which would re-fire the call
   * and fail on the second attempt, since the token is single-use.
   */
  useEffect(() => {
    if (!token) return;
    verifyEmail.mutate(token, {
      onSuccess: () => setVerified(true),
      onError: (err) => setVerifyError(apiErrorMessage(err)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Verified → straight to sign in after a beat, matching the web's 1.5s.
  useEffect(() => {
    if (!verified) return;
    const t = setTimeout(() => router.replace('/login'), 1500);
    return () => clearTimeout(t);
  }, [verified, router]);

  const resend = async () => {
    try {
      await resendVerification.mutateAsync();
      setResent(true);
    } catch {
      // Surfaced from `resendVerification.error`. Expect a 401 straight after
      // signup: the endpoint is behind `auth`, and a new account has no
      // session until it verifies — the link it was already sent is the way in.
    }
  };

  const page = (children: React.ReactNode) => (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.seven }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  /* ── 1. Verifying the emailed link ────────────────────────── */
  if (verifying) {
    return page(
      <>
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Verifying your email...</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Hold on a second while we confirm your verification link.
        </Text>
      </>,
    );
  }

  /* ── 1b. The link didn't work ─────────────────────────────── */
  // Expired, tampered with, or already used — tokens are single-use, so
  // re-opening a link that already worked lands here. Without this branch the
  // screen would fall through to "check your inbox" and look like nothing
  // happened.
  if (verifyError) {
    return page(
      <>
        <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
          <MailCheck size={32} color="#e11d48" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>This link didn&apos;t work</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{verifyError}</Text>
        <Text style={[styles.body, { color: theme.textTertiary }]}>
          Verification links are single-use and expire. Sign in to request a new one.
        </Text>
        <Pressable
          onPress={() => router.replace('/login')}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Back to Sign In</Text>
          <ArrowRight size={16} color="#ffffff" />
        </Pressable>
      </>,
    );
  }

  /* ── 2. Verified ──────────────────────────────────────────── */
  if (verified) {
    return page(
      <>
        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
          <CheckCircle2 size={32} color="#16a34a" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Email verified!</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Your email address has been confirmed. Redirecting you to sign in...
        </Text>
        <Pressable
          onPress={() => router.replace('/login')}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Continue to Sign In</Text>
          <ArrowRight size={15} color="#ffffff" />
        </Pressable>
      </>,
    );
  }

  /* ── 3. Waiting for the user to open the link ─────────────── */
  return page(
    <>
      <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
        <MailCheck size={32} color={theme.primary} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        We sent a verification link to{' '}
        {displayEmail ? (
          <Text style={[styles.strong, { color: theme.text }]}>{displayEmail}</Text>
        ) : (
          'your email address'
        )}
        . Click the link to activate your account, then sign in.
      </Text>

      {resent ? (
        <View style={styles.successNote}>
          <CheckCircle2 size={15} color="#166534" />
          <Text style={styles.successNoteText}>
            A fresh verification link has been sent to your inbox.
          </Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
          Email confirmation activates your account so you can sign in and receive order &amp;
          escrow release alerts.
        </Text>
        <Text style={[styles.cardNote, { color: theme.textTertiary }]}>
          Prototype note: email delivery is simulated — the verification link is printed in the API
          server console.
        </Text>

        <Pressable
          onPress={resend}
          disabled={resending}
          style={({ pressed }) => [
            styles.resendBtn,
            {
              borderColor: theme.border,
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              opacity: resending ? 0.6 : 1,
            },
          ]}
        >
          <RefreshCw size={15} color={theme.text} />
          <Text style={[styles.resendText, { color: theme.text }]}>
            {resending ? 'Sending...' : 'Resend Verification Link'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/login')}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Back to Sign In</Text>
          <ArrowRight size={15} color="#ffffff" />
        </Pressable>
      </View>
    </>,
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
    alignItems: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  badge: {
    height: 64,
    width: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4, textAlign: 'center' },
  body: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400], textAlign: 'center' },
  strong: { fontFamily: Fonts.sans[700] },

  successNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  successNoteText: { flex: 1, fontSize: 11.5, fontFamily: Fonts.sans[600], color: '#166534' },

  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  cardBody: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[400] },
  cardNote: { fontSize: 10.5, lineHeight: 15, fontFamily: Fonts.sans[400] },

  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  resendText: { fontSize: 12.5, fontFamily: Fonts.sans[700] },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
