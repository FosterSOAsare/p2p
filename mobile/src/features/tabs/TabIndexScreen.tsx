import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

export function TabIndexScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Tabs</ThemedText>
      <ThemedText type="default" style={styles.description}>
        Choose a tab to navigate the mobile app sections.
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
