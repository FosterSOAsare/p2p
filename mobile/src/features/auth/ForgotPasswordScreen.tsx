import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

export function ForgotPasswordScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Reset Password</ThemedText>
      <ThemedText type="default" style={styles.description}>
        Enter your email and we will send a reset link to regain access securely.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
  },
  description: {
    textAlign: 'center',
    maxWidth: 360,
  },
});
