import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setApiError(null);
      await login(data.identifier, data.password);
      router.replace('/(app)/tabs'); // Redirect to main app
    } catch (err: any) {
      setApiError(err.message || 'Failed to login');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Welcome Back</ThemedText>
            <ThemedText type="default" style={styles.description}>
              Sign in to your account and continue using the P2P escrow marketplace.
            </ThemedText>
          </View>

          <View style={styles.form}>
            {apiError && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.apiErrorText}>{apiError}</ThemedText>
              </View>
            )}

            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email or Username"
                  placeholder="Enter your email or username"
                  leftIcon={Mail}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.identifier?.message}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  leftIcon={Lock}
                  rightIcon={showPassword ? EyeOff : Eye}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Button
              title="Log In"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              containerStyle={styles.button}
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08121f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.six,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.eight,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  description: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: Spacing.four,
  },
  button: {
    marginTop: Spacing.four,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.three,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: Spacing.two,
  },
  apiErrorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 13,
  },
});
