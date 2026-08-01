import { StyleSheet, View, Image } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

const reviews = [
  {
    name: 'Kofi Mensah',
    role: 'Verified Buyer',
    comment: 'Buying high-value goods online is safer when payment is held in escrow until I confirm delivery.',
  },
  {
    name: 'Esi Ansah',
    role: 'Merchant',
    comment: 'Vendor verification and payout protection made selling online much easier for my store.',
  },
  {
    name: 'Daniel Osei',
    role: 'Standalone Escrow User',
    comment: 'I use escrow for freelance gigs and feel confident that funds release only after completion.',
  },
];

export function TestimonialsSection() {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        What our users say
      </ThemedText>
      <View style={styles.list}>
        {reviews.map((review) => (
          <ThemedView key={review.name} style={styles.card}>
            <View style={styles.header}>
              <View>
                <ThemedText type="smallBold">{review.name}</ThemedText>
                <ThemedText type="small" style={styles.role}>
                  {review.role}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.comment}>
              "{review.comment}"
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
  list: {
    width: '100%',
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  header: {
    marginBottom: Spacing.two,
  },
  role: {
    color: '#4b5563',
  },
  comment: {
    color: '#4b5563',
  },
});
