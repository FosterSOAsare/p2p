import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserCheck,
} from '@/components/icons';

import { Fonts, FormWidth, Primary, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { cancelAutofill, commitAutofill } from '@/modules/autofill-commit';
import { signupSchema, type SignupForm } from '../data/schemas';
import { useSignup, useUsernameAvailable, USERNAME_RE } from '../data/authApi';
import { AuthField } from './AuthField';

type FieldName = 'fullName' | 'username' | 'email' | 'password' | 'confirmPassword';

/**
 * Signup screen — the phone version of `web/src/features/auth/ui/Signup.tsx`.
 *
 * Mirrors the web form column: same five fields in the same order, same copy,
 * same terms checkbox, same "Create Account & Verify" CTA, then on to
 * /verify-email exactly as the web does.
 *
 * Validation is shared with the web via ../data/schemas, and the username field
 * shows live "@name is available / taken" from
 * `GET /api/auth/username-available`, as the web's does.
 */
export function SignupScreen() {
  const theme = useTheme();
  // Keeps the heading clear of the status bar / notch now that the form is
  // full-bleed rather than inset in a card.
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Signup no longer goes through AuthContext (it creates an account rather
  // than a session), so the button follows the mutation's own pending flag.
  const { isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<FieldName | null>(null);

  // One ref per field after the first, so the keyboard's "next" key walks down
  // the form instead of dismissing itself.
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  /** Shared props for every field that should advance to the next one. */
  const nextKey = (target: React.RefObject<TextInput | null>) => ({
    returnKeyType: 'next' as const,
    submitBehavior: 'submit' as const,
    onSubmitEditing: () => target.current?.focus(),
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreed: false,
    },
  });

  const signupMutation = useSignup();
  const busy = isLoading || signupMutation.isPending;

  /**
   * Live username availability.
   *
   * `watch` rather than the field's own value so the query key follows what is
   * typed; the hook itself is gated on the username regex, so nothing is sent
   * for a half-typed handle. Collapsed to one of four states here so the JSX
   * below doesn't have to juggle `isFetching` against `data` against `enabled`.
   */
  const watchedUsername = watch('username');
  const usernameQuery = useUsernameAvailable(watchedUsername);
  const usernameStatus: 'checking' | 'available' | 'taken' | null = !USERNAME_RE.test(
    watchedUsername,
  )
    ? null
    : usernameQuery.isFetching
      ? 'checking'
      : usernameQuery.data === true
        ? 'available'
        : usernameQuery.data === false
          ? 'taken'
          : null;

  const onSubmit = handleSubmit(async (values) => {
    // Creates the account for real. It does NOT sign anyone in: the server
    // returns the user without tokens, because the address has to be verified
    // first. So we stay in the (public) group and hand off to /verify-email,
    // exactly as the web does.
    try {
      await signupMutation.mutateAsync({
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        password: values.password,
      });
      /*
        Tell Android the form was submitted, so it can offer to save the new
        password. Synchronous and before navigating to /verify-email: the fields
        have to still be mounted for the session to mean anything.
      */
      commitAutofill();
    } catch {
      // Drop the session — nothing was created, so there is nothing to save.
      cancelAutofill();
      // Rendered from `signupMutation.error` below — rethrowing here would
      // only surface as an unhandled rejection.
      return;
    }

    // The email rides along so the verify screen can name the inbox to check,
    // the same way the web passes it through navigation state.
    router.replace(`/verify-email?email=${encodeURIComponent(values.email)}`);
  });

  /** Wires a field's focus tracking into AuthField without repeating handlers. */
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
        {/* Form only — the web hides its marketing panel below the lg breakpoint,
            so a phone sees just this column, filling the screen. */}
        <View style={[styles.card, { paddingTop: insets.top + Spacing.five }]}>
          {/* Heading block */}
          <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
            <ShieldCheck size={14} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>Free Registration</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Get started in seconds. No credit card required.
          </Text>

          {/* 1. Full name */}
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label="Full Name"
                icon={UserCheck}
                placeholder="Kofi Mensah"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                importantForAutofill="yes"
                value={value}
                onChangeText={onChange}
                error={errors.fullName?.message}
                {...nextKey(usernameRef)}
                {...focusProps('fullName', onBlur)}
              />
            )}
          />

          {/* 2. Username */}
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <AuthField
                  ref={usernameRef}
                  label="Username"
                  icon={User}
                  placeholder="kwame_tech"
                  autoCapitalize="none"
                  autoComplete="username-new"
                  textContentType="username"
                  importantForAutofill="yes"
                  autoCorrect={false}
                  value={value}
                  onChangeText={onChange}
                  error={errors.username?.message}
                  {...nextKey(emailRef)}
                  {...focusProps('username', onBlur)}
                />

                {/**
                 * Live availability, as the web shows it.
                 *
                 * Only once the field has no format error of its own — two
                 * messages under one input contradicting each other ("at least 3
                 * characters" and "@ab is available") is worse than one.
                 */}
                {!errors.username && usernameStatus ? (
                  <Text
                    style={[
                      styles.availability,
                      {
                        color:
                          usernameStatus === 'taken'
                            ? '#b91c1c'
                            : usernameStatus === 'available'
                              ? '#047857'
                              : theme.textTertiary,
                      },
                    ]}
                  >
                    {usernameStatus === 'checking'
                      ? 'Checking availability…'
                      : usernameStatus === 'available'
                        ? `@${watchedUsername} is available`
                        : `@${watchedUsername} is already taken`}
                  </Text>
                ) : null}
              </View>
            )}
          />

          {/* 3. Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                ref={emailRef}
                label="Email Address"
                icon={Mail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                importantForAutofill="yes"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                {...nextKey(passwordRef)}
                {...focusProps('email', onBlur)}
              />
            )}
          />

          {/* 4. Password */}
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
                /*
                  `new-password` is what makes Android offer to generate one
                  and, on submit, prompt to save the pair. Tagging it as a
                  current password instead would offer an existing login on a
                  form whose whole purpose is creating a new one.
                */
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="yes"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                rightSlot={eye(showPassword, () => setShowPassword((v) => !v))}
                {...nextKey(confirmRef)}
                {...focusProps('password', onBlur)}
              />
            )}
          />

          {/* 5. Confirm password */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                ref={confirmRef}
                label="Confirm Password"
                icon={Lock}
                placeholder="••••••••••••"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="yes"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
                rightSlot={eye(showConfirm, () => setShowConfirm((v) => !v))}
                // Last field: keyboard shows "go" and submits the form.
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                {...focusProps('confirmPassword', onBlur)}
              />
            )}
          />

          {/* Terms */}
          <Controller
            control={control}
            name="agreed"
            render={({ field: { onChange, value } }) => (
              <View>
                <Pressable style={styles.termsRow} onPress={() => onChange(!value)} hitSlop={6}>
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
                  <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                    I agree to the{' '}
                    <Text style={[styles.termsStrong, { color: theme.text }]}>Terms of Service</Text>
                    {' & '}
                    <Text style={[styles.termsStrong, { color: theme.text }]}>Escrow Rules</Text>.
                  </Text>
                </Pressable>
                {errors.agreed ? <Text style={styles.error}>{errors.agreed.message}</Text> : null}
              </View>
            )}
          />

          {/* Whatever the server rejected the account for — a taken username,
              an address already registered — in its own words. */}
          {signupMutation.isError ? (
            <View style={[styles.apiError, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Text style={styles.apiErrorText}>{apiErrorMessage(signupMutation.error)}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary, opacity: busy ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Create Account &amp; Verify</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </Pressable>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/login" style={[styles.footerLink, { color: theme.primary }]}>
              Log in
            </Link>
          </View>
        </View>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  // Full-bleed: the form fills the screen rather than sitting in a centred card.
  // Signup packs its five fields tighter than login (`space-y-3.5` vs `-4`).
  scroll: { flexGrow: 1 },
  card: {
    flex: 1,
    // Centred and capped rather than stretched — see `FormWidth`.
    alignSelf: 'center',
    width: '100%',
    maxWidth: FormWidth,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
    gap: 14,
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
  badgeText: { fontSize: 12, fontFamily: Fonts.sans[600] },
  // Web `text-2xl` (24px) with the subtitle at `text-xs` (12px).
  // The heading is the web's `font-display` — Space Grotesk.
  title: {
    fontSize: 20,
    fontFamily: Fonts.display[700],
    letterSpacing: -0.4,
    marginBottom: -Spacing.three,
  },
  subtitle: { fontSize: 12, lineHeight: 17, marginBottom: -Spacing.one, fontFamily: Fonts.sans[400] },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  checkbox: {
    height: 18,
    width: 18,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans[400] },
  termsStrong: { fontFamily: Fonts.sans[700] },
  error: {
    fontSize: 11,
    fontFamily: Fonts.sans[600],
    color: '#e11d48',
    marginTop: 4,
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
    marginTop: Spacing.one,
    shadowColor: Primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: { fontSize: 13, fontFamily: Fonts.sans[700], color: '#ffffff' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  footerText: { fontSize: 12, fontFamily: Fonts.sans[400] },
  footerLink: { fontSize: 12, fontFamily: Fonts.sans[700] },
  // Sits directly under the username field, where its error would appear.
  availability: { marginTop: 4, fontSize: 11.5, fontFamily: Fonts.sans[600] },
});
