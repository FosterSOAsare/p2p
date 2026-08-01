import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroSection } from '@/features/homepage/ui/HeroSection';
import { TrustMetrics } from '@/features/homepage/ui/TrustMetrics';
import { PillarSpotlight } from '@/features/homepage/ui/PillarSpotlight';
import { HowItWorksStepper } from '@/features/homepage/ui/HowItWorksStepper';
import { FeaturedListings } from '@/features/homepage/ui/FeaturedListings';
import { TrustSecuritySection } from '@/features/homepage/ui/TrustSecuritySection';
import { EscrowCalculator } from '@/features/homepage/ui/EscrowCalculator';
import { SellerCtaBanner } from '@/features/homepage/ui/SellerCtaBanner';
import { TestimonialsSection } from '@/features/homepage/ui/TestimonialsSection';
import { ThemedView } from '@/components/ui/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag">
        <SafeAreaView style={styles.safeArea}>
          <HeroSection />
          <TrustMetrics />
          <PillarSpotlight />
          <HowItWorksStepper />
          <FeaturedListings />
          <TrustSecuritySection />
          <EscrowCalculator />
          <SellerCtaBanner />
          <TestimonialsSection />
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    width: '100%',
  },
  content: {
    width: '100%',
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.six,
    paddingTop: Spacing.four,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
  },
});
