import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

export function SellerCtaBanner() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        Merchant protection made easy
      </ThemedText>
      <ThemedText type="default" style={styles.body}>
        Apply for verified merchant status to list products, receive payout protection, and access senior dispute support.
      </ThemedText>
      <Link href="/marketplace" style={styles.button}>
        <ThemedText type="linkPrimary">Apply for merchant verification</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Spacing.five,
    padding: Spacing.four,
    marginBottom: Spacing.six,
  },
  heading: {
    marginBottom: Spacing.two,
  },
  body: {
    color: '#4b5563',
    marginBottom: Spacing.four,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: '#0f766e',
    alignItems: 'center',
  },
});
