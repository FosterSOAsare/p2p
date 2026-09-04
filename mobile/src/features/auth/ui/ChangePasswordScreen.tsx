import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock } from '@/components/icons';

import { Fonts, FormWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useChangePassword } from '../data/authApi';
import { changePasswordSchema, type ChangePasswordForm } from '../data/schemas';
import { AuthField } from './AuthField';

/**
 * Change password — the phone version of
 * `web/src/features/auth/ui/ChangePassword.tsx`.
 *
 * Same three fields, same success banner ("Other devices have been signed
 * out"), and the form clears on success as the web's `reset()` does. Reached
 * from Profile → Security.
 */

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export function ChangePasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [focused, setFocused] = useState<FieldName | null>(null);
  const [shown, setShown] = useState<Record<FieldName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const changePassword = useChangePassword();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    setUpdating(true);
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setDone(true);
      reset();
    } catch (err) {
      // The common case is a wrong current password, and the server says so —
      // silently doing nothing would look like the button was broken.
      setApiError(apiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const focusProps = (name: FieldName, onBlur: () => void) => ({
    focused: focused === name,
    onFocus: () => setFocused(name),
    onBlur: () => {
      setFocused(null);
      onBlur();
    },
  });

  const eye = (name: FieldName) => (
    <Pressable
      onPress={() => setShown((s) => ({ ...s, [name]: !s[name] }))}
      hitSlop={10}
      accessibilityLabel={shown[name] ? 'Hide password' : 'Show password'}
    >
      {shown[name] ? (
        <EyeOff size={16} color={theme.textTertiary} />
      ) : (
        <Eye size={16} color={theme.textTertiary} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
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

        <View style={styles.heading}>
          <Text style={[styles.title, { color: theme.text }]}>Change Password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Update your account password for enhanced security.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {done ? (
            <View style={styles.successBox}>
              <CheckCircle2 size={16} color="#166534" />
              <Text style={styles.successText}>
                Password updated successfully! Other devices have been signed out.
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label="Current Password"
                icon={Lock}
                placeholder="••••••••••••"
                secureTextEntry={!shown.currentPassword}
                autoCapitalize="none"
                value={value}
                onChangeText={(v) => {
                  onChange(v);
                  setDone(false);
                }}
                error={errors.currentPassword?.message}
                rightSlot={eye('currentPassword')}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => newRef.current?.focus()}
                {...focusProps('currentPassword', onBlur)}
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                ref={newRef}
                label="New Password"
                icon={Lock}
                placeholder="••••••••••••"
                secureTextEntry={!shown.newPassword}
                autoCapitalize="none"
                value={value}
                onChangeText={(v) => {
                  onChange(v);
                  setDone(false);
                }}
                error={errors.newPassword?.message}
                rightSlot={eye('newPassword')}
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
                secureTextEntry={!shown.confirmPassword}
                autoCapitalize="none"
                value={value}
                onChangeText={(v) => {
                  onChange(v);
                  setDone(false);
                }}
                error={errors.confirmPassword?.message}
                rightSlot={eye('confirmPassword')}
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                {...focusProps('confirmPassword', onBlur)}
              />
            )}
          />

          {/* Server-side refusals — a wrong current password, or a new one the
              server's policy rejects. Field-level validation is handled by the
              resolver above; this is everything only the server can know. */}
          {apiError ? (
            <View style={[styles.apiError, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={updating}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: updating ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {updating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Update Password</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </Pressable>
        </View>
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
    maxWidth: FormWidth,
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

  heading: { gap: 4 },
  // Heading uses the web's `font-display`.
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.four },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  successText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: Fonts.sans[600], color: '#166534' },

  apiError: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
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
