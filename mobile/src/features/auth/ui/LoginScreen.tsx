import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, ShieldCheck } from '@/components/icons';

import { Fonts, Primary, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { loginSchema, type LoginForm } from '../data/schemas';
import { AuthField } from './AuthField';

/**
 * Login screen — the phone version of `web/src/features/auth/ui/Login.tsx`.
 *
 * The web layout is a two-column card whose left marketing panel is hidden
 * below the `lg` breakpoint, so the phone mirrors the right-hand form column:
 * same badge, same headings, same fields, same copy, same green CTA.
 *
 * Auth is still the mock in AuthContext — no server calls yet.
 */
export function LoginScreen() {
  const theme = useTheme();
  // Keeps the heading clear of the status bar / notch now that the form is
  // full-bleed rather than inset in a card.
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'identifier' | 'password' | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  // Lets the keyboard's "next" key jump from the identifier to the password.
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    // No navigation here on purpose: signing in flips `isAuthenticated`, and the
    // root layout's Stack.Protected guard swaps to the (app) group by itself.
    setLoginError(null);
    try {
      await login(values.identifier, values.password);
    } catch (err) {
      // Wrong credentials, unverified email, suspended account — the server's
      // own wording, rather than a generic failure.
      setLoginError(apiErrorMessage(err));
    }
  });

  /** Wires a field's focus tracking into AuthField without repeating handlers. */
  const focusProps = (name: 'identifier' | 'password', onBlur: () => void) => ({
    focused: focused === name,
    onFocus: () => setFocused(name),
    onBlur: () => {
      setFocused(null);
      onBlur();
    },
  });

  return (
    <KeyboardAwareScroll
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
    >
        {/* Form only — the web hides its marketing panel below the lg breakpoint,
            so a phone sees just this column, filling the screen. */}
        <View style={[styles.card, { paddingTop: insets.top + Spacing.five }]}>
          {/* Heading block */}
          <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
            <ShieldCheck size={14} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>Secure Login</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Sign in to account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your account credentials to access your buyer or vendor dashboard.
          </Text>

          {/* Email or username */}
          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label="Email or Username"
                icon={Mail}
                placeholder="kwame_tech or email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                error={errors.identifier?.message}
                // Keyboard shows "next" and moves down to the password field.
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                {...focusProps('identifier', onBlur)}
              />
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                ref={passwordRef}
                label="Password"
                icon={Lock}
                placeholder="••••••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                // Last field: keyboard shows "go" and submits the form.
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                headerRight={
                  <Link href="/forgot-password" style={[styles.linkSmall, { color: theme.primary }]}>
                    Forgot password?
                  </Link>
                }
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={theme.textTertiary} />
                    ) : (
                      <Eye size={16} color={theme.textTertiary} />
                    )}
                  </Pressable>
                }
                {...focusProps('password', onBlur)}
              />
            )}
          />

          {/* Remember this device */}
          <Controller
            control={control}
            name="rememberMe"
            render={({ field: { onChange, value } }) => (
              <Pressable style={styles.rememberRow} onPress={() => onChange(!value)} hitSlop={6}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: value ? theme.primary : theme.inputBorder,
                      backgroundColor: value ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  {value ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
                </View>
                <Text style={[styles.rememberText, { color: theme.textSecondary }]}>
                  Remember this device
                </Text>
              </Pressable>
            )}
          />

          {/* Why the server refused, in its own words. */}
          {loginError ? (
            <View style={[styles.apiError, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Text style={styles.apiErrorText}>{loginError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={onSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary, opacity: isLoading ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </Pressable>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/signup" style={[styles.footerLink, { color: theme.primary }]}>
              Sign up now
            </Link>
          </View>
        </View>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  // Full-bleed: the form fills the screen rather than sitting in a centred card.
  scroll: { flexGrow: 1 },
  card: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
    // Web keeps `space-y-4` between form rows.
    gap: Spacing.four,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Fonts.sans[600],
  },
  // Web `text-2xl` (24px) with the subtitle at `text-xs` (12px).
  // The heading is the web's `font-display` — Space Grotesk.
  title: {
    fontSize: 20,
    fontFamily: Fonts.display[700],
    letterSpacing: -0.4,
    marginBottom: -Spacing.three,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.sans[400],
  },
  linkSmall: {
    fontSize: 12,
    fontFamily: Fonts.sans[600],
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    height: 18,
    width: 18,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 13,
    fontFamily: Fonts.sans[400],
  },
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
    shadowColor: Primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: Fonts.sans[700],
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.four,
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.sans[400],
  },
  footerLink: {
    fontSize: 12,
    fontFamily: Fonts.sans[700],
  },
});
