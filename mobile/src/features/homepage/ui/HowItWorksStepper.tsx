import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Radius, Spacing } from '@/constants/theme';

const steps = [
  {
    number: '01',
    title: 'Agree & lock',
    description: 'Buyer places a marketplace order or creates a custom deal. Funds are pre-authorized & locked safely.',
    accent: '#0ea5e9',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
  },
  {
    number: '02',
    title: 'Fulfill & ship',
    description: 'Vendor ships physical goods with carrier tracking, or freelancer completes contract deliverables.',
    accent: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  },
  {
    number: '03',
    title: 'Inspect & chat',
    description: 'Inspect delivery upon arrival. Per-order chat automatically persists all messaging as audit evidence.',
    accent: '#16a34a',
    image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&auto=format&fit=crop&q=80',
  },
  {
    number: '04',
    title: 'Instant release',
    description: 'Buyer confirms receipt to release funds. Disputes are handled swiftly by senior platform admins.',
    accent: '#22c55e',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  },
];

export function HowItWorksStepper() {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        How escrow protection works
      </ThemedText>
      <View style={styles.list}>
        {steps.map((step) => (
          <ThemedView key={step.number} style={styles.stepCard}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: step.image }} style={styles.stepImage} resizeMode="cover" />
              <View style={[styles.stepNumberBadge, { backgroundColor: step.accent }]}> 
                <ThemedText type="smallBold" style={styles.badgeText}>
                  {step.number}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="smallBold" style={styles.stepTitle}>
              {step.title}
            </ThemedText>
            <ThemedText type="small" style={styles.stepText}>
              {step.description}
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
  stepCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Spacing.three,
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  stepNumberBadge: {
    position: 'absolute',
    left: Spacing.three,
    top: Spacing.three,
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
  },
  stepTitle: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.one,
  },
  stepText: {
    color: '#4b5563',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
});
