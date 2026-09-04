import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock } from '@/components/icons';

import { Fonts, FormWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { resetPasswordSchema, type ResetPasswordForm } from '../data/schemas';
import { useResetPassword } from '../data/authApi';
import { AuthField } from './AuthField';

/**
 * Set new password — the phone version of
 * `web/src/features/auth/ui/ResetPassword.tsx`.
 *
 * Same three states: "Invalid reset link" when the token is missing, the
 * two-field form, and the success panel that bounces to /login after a moment.
 * Copy and the 1.5s redirect are kept as the web has them.
 *
 * The token arrives as `?token=` on the deep link, same as the web's query
 * param. Nothing verifies it yet — see the TODO in `onSubmit`.
 */

type FieldName = 'newPassword' | 'confirmPassword';

export function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const confirmRef = useRef<TextInput>(null);

  const [focused, setFocused] = useState<FieldName | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const resetPassword = useResetPassword();
  const resetting = resetPassword.isPending;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // The web waits 1.5s on the success panel, then sends you to sign in.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.replace('/login'), 1500);
    return () => clearTimeout(timer);
  }, [done, router]);

  const onSubmit = handleSubmit(async (values) => {
    // The no-token case renders its own panel, so this only runs with one.
    if (!token) return;
    try {
      await resetPassword.mutateAsync({ token, newPassword: values.newPassword });
    } catch {
      // Expired, already-used or tampered token — shown below so the user
      // knows to request a fresh link rather than retyping the password.
      return;
    }
    setDone(true);
  });

  const focusProps = (name: FieldName, onBlur: () => void) => ({
    focused: focused === name,
    onFocus: () => setFocused(name),
    onBlur: () => {
      setFocused(null);
      onBlur();
    },
  });

  const eye = (shown: boolean, toggle: () => void) => (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityLabel={shown ? 'Hide password' : 'Show password'}
    >
      {shown ? (
        <EyeOff size={16} color={theme.textTertiary} />
      ) : (
        <Eye size={16} color={theme.textTertiary} />
      )}
    </Pressable>
  );

  return (
    <KeyboardAwareScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
    >
      <View style={[styles.column, { paddingTop: insets.top + Spacing.six }]}>
        {/* Heading */}
        <View style={styles.heading}>
          <Text style={[styles.title, { color: theme.text }]}>Set new password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your new password must be at least 8 characters long.
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {!token ? (
            <View style={styles.centerBlock}>
              <Text style={[styles.blockTitle, { color: theme.text }]}>Invalid reset link</Text>
              <Text style={[styles.blockBody, { color: theme.textSecondary }]}>
                This link is missing its reset token. Request a new one from the forgot-password
                page.
              </Text>
              <Link
                href="/forgot-password"
                style={[styles.blockLink, { color: theme.primary }]}
              >
                Request new reset link
              </Link>
            </View>
          ) : done ? (
            <View style={styles.centerBlock}>
              <View style={styles.doneIcon}>
                <CheckCircle2 size={24} color="#16a34a" />
              </View>
              <Text style={[styles.blockTitle, { color: theme.text }]}>
                Password reset successful!
              </Text>
              <Text style={[styles.blockBody, { color: theme.textSecondary }]}>
                Redirecting to login page...
              </Text>
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AuthField
                    label="New Password"
                    icon={Lock}
                    placeholder="••••••••••••"
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    error={errors.newPassword?.message}
                    rightSlot={eye(showNew, () => setShowNew((v) => !v))}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    {...focusProps('newPassword', onBlur)}
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AuthField
                    ref={confirmRef}
                    label="Confirm New Password"
                    icon={Lock}
                    placeholder="••••••••••••"
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    error={errors.confirmPassword?.message}
                    rightSlot={eye(showConfirm, () => setShowConfirm((v) => !v))}
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    {...focusProps('confirmPassword', onBlur)}
                  />
                )}
              />

              {/* A dead link fails here, not silently — the user needs to know
                  to request a fresh one. */}
              {resetPassword.isError ? (
                <View
                  style={[styles.apiError, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                >
                  <Text style={styles.apiErrorText}>{apiErrorMessage(resetPassword.error)}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={onSubmit}
                disabled={resetting}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: theme.primary,
                    opacity: resetting ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {resetting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Reset Password</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  column: {
    flex: 1,
    // Centred and capped rather than stretched — see `FormWidth`.
    alignSelf: 'center',
    width: '100%',
    maxWidth: FormWidth,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.five,
  },

  heading: { alignItems: 'center', gap: Spacing.two },
  // Heading uses the web's `font-display`.
  title: { fontSize: 22, fontFamily: Fonts.display[700], letterSpacing: -0.4, textAlign: 'center' },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.four },

  centerBlock: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  doneIcon: {
    height: 48,
    width: 48,
    borderRadius: Radius.full,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: { fontSize: 15, fontFamily: Fonts.display[700], textAlign: 'center' },
  blockBody: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.sans[400],
    textAlign: 'center',
  },
  blockLink: { fontSize: 12, fontFamily: Fonts.sans[700], marginTop: Spacing.one },

  /** Server-side rejection, distinct from the per-field validation messages. */
  apiError: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  apiErrorText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600], color: '#b91c1c' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.md,
  },
  buttonText: { fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
