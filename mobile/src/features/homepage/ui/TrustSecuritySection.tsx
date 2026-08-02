import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

const features = [
  {
    title: 'Third-party vendor KYC',
    description: 'Vendors are verified before listings can publish, reducing fraud and protecting buyers.',
  },
  {
    title: 'Append-only escrow ledger',
    description: 'All holds, releases, and disputes are recorded in a permanent transaction trail.',
  },
  {
    title: 'Admin dispute support',
    description: 'Senior staff can review disputed deals and resolve refunds or payouts fairly.',
  },
];

export function TrustSecuritySection() {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        Engineered for maximum safety
      </ThemedText>
      <View style={styles.grid}>
        {features.map((feature) => (
          <ThemedView key={feature.title} style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              {feature.title}
            </ThemedText>
            <ThemedText type="small" style={styles.cardText}>
              {feature.description}
            </ThemedText>
          </ThemedView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.six,
  },
  heading: {
    marginBottom: Spacing.three,
  },
  grid: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  cardTitle: {
    marginBottom: Spacing.one,
  },
  cardText: {
    color: '#4b5563',
  },
});
