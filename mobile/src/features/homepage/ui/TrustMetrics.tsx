import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

const metrics = [
  {
    label: 'Protected Deals',
    value: '18.5K+',
    detail: 'Transactions processed with zero buyer capital loss.',
    tone: '#047857',
  },
  {
    label: 'Volume Locked',
    value: '$6.4M+',
    detail: 'Funds held securely across fiat and crypto rails.',
    tone: '#0ea5e9',
  },
  {
    label: 'Dispute Success',
    value: '99.6%',
    detail: 'Successful resolutions via senior admin review.',
    tone: '#f59e0b',
  },
  {
    label: 'KYC Vendors',
    value: '1,240+',
    detail: 'Verified merchants with level 2 identity approval.',
    tone: '#d97706',
  },
];

export function TrustMetrics() {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <ThemedView key={metric.label} style={styles.card}>
            <ThemedText type="title" style={[styles.value, { color: metric.tone }]}>
              {metric.value}
            </ThemedText>
            <ThemedText type="small" style={styles.label}>
              {metric.label}
            </ThemedText>
            <ThemedText type="small" style={styles.detail}>
              {metric.detail}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    minWidth: 160,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  value: {
    fontSize: 22,
    marginBottom: Spacing.two,
  },
  label: {
    marginBottom: Spacing.one,
  },
  detail: {
    color: '#4b5563',
  },
});
