import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff, User, UserCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupScreen() {
  const { signup, isLoading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setApiError(null);
      // Ensure backend matches the frontend signature, current mock expects { username, email, password }
      // but backend expects fullName as well. We'll pass them all.
      await signup(data as any); 
      router.replace('/(app)/tabs');
    } catch (err: any) {
      setApiError(err.message || 'Failed to create account');
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
            <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
            <ThemedText type="default" style={styles.description}>
              Sign up to list items, open escrow deals, and access secure payments.
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
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon={User}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.fullName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Username"
                  placeholder="johndoe123"
                  leftIcon={UserCircle}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text.toLowerCase())}
                  value={value}
                  error={errors.username?.message}
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="john@example.com"
                  leftIcon={Mail}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
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
                  placeholder="Create a strong password"
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
              title="Create Account"
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
    paddingVertical: Spacing.eight,
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
