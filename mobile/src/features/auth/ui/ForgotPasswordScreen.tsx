import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react-native';

import { Fonts, Primary, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../data/schemas';
import { AuthField } from './AuthField';

/**
 * Forgot password — the phone version of
 * `web/src/features/auth/ui/ForgotPassword.tsx`.
 *
 * Same three states in the same order: the key badge and heading, the email
 * form, and the "Reset link sent!" confirmation that replaces the form on
 * success. Copy is kept verbatim, including the prototype note about simulated
 * delivery.
 *
 * There's no forgot-password call in the mock AuthContext, so submitting just
 * flips to the sent state after a short delay — the web's own note already says
 * delivery is simulated.
 */
export function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSending(true);
    // TODO(api): POST /api/auth/forgot-password with the email.
    await new Promise((r) => setTimeout(r, 700));
    setSending(false);
    setSentTo(values.email);
  });

  return (
    <KeyboardAwareScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
    >
      <View style={[styles.column, { paddingTop: insets.top + Spacing.six }]}>
        {/* Heading */}
        <View style={styles.heading}>
          <View style={[styles.keyBadge, { backgroundColor: theme.primary }]}>
            <KeyRound size={24} color="#ffffff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Reset your password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your registered account email to receive a password reset link.
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {sentTo ? (
            <View style={styles.sentBlock}>
              <View style={styles.sentIcon}>
                <CheckCircle2 size={24} color="#16a34a" />
              </View>
              <Text style={[styles.sentTitle, { color: theme.text }]}>Reset link sent!</Text>
              <Text style={[styles.sentBody, { color: theme.textSecondary }]}>
                If an account associated with{' '}
                <Text style={[styles.sentEmail, { color: theme.text }]}>{sentTo}</Text> exists, you
                will receive password reset instructions shortly.
              </Text>
              <Text style={[styles.sentNote, { color: theme.textTertiary }]}>
                Prototype note: email delivery is simulated — the reset link is printed in the API
                server console.
              </Text>
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AuthField
                    label="Account Email"
                    icon={Mail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    focused={focused}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                      setFocused(false);
                      onBlur();
                    }}
                  />
                )}
              />

              <Pressable
                onPress={onSubmit}
                disabled={sending}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: theme.primary,
                    opacity: sending ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </>
                )}
              </Pressable>
            </>
          )}

          {/* Footer — a pill button rather than a small text link, so it stays
              visible and hittable next to the sent-confirmation copy. */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => router.replace('/login')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            >
              <ArrowLeft size={18} color={theme.text} />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Back to Sign In</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  column: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.five,
  },

  heading: { alignItems: 'center', gap: Spacing.two },
  keyBadge: {
    height: 48,
    width: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 22, fontFamily: Fonts.display[700], letterSpacing: -0.4, textAlign: 'center' },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.four },

  sentBlock: { alignItems: 'center', gap: Spacing.two },
  sentIcon: {
    height: 48,
    width: 48,
    borderRadius: Radius.full,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { fontSize: 15, fontFamily: Fonts.display[700] },
  sentBody: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },
  sentEmail: { fontFamily: Fonts.sans[700] },
  sentNote: {
    fontSize: 10.5,
    lineHeight: 15,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
    marginTop: Spacing.one,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
  },
  buttonText: { fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },

  footer: { borderTopWidth: 1, paddingTop: Spacing.three, alignItems: 'center' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 46,
    paddingHorizontal: Spacing.five,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  backBtnText: { fontSize: 13.5, fontFamily: Fonts.sans[700] },
});
