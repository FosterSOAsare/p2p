import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

export function MarketplaceTabScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Marketplace</ThemedText>
      <ThemedText type="default" style={styles.description}>
        Browse listings, filter offers, and discover verified vendors on mobile.
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
