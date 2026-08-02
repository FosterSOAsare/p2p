import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

export function EscrowTabScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Escrow</ThemedText>
      <ThemedText type="default" style={styles.description}>
        Track your escrow deals and manage payment holds in one place.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  description: {
    textAlign: 'center',
    maxWidth: 360,
  },
});
