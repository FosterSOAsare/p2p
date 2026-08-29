import { Link } from 'expo-router';
import { ImageBackground, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Radius, Spacing } from '@/constants/theme';

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&auto=format&fit=crop&q=80',
};

export function HeroSection() {
  return (
    <View style={styles.container}>
      <ImageBackground source={heroImage} style={styles.heroBackground} imageStyle={styles.heroBackgroundImage}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroCopy}>
          <ThemedText type="subtitle" style={[styles.eyebrow, styles.heroText]}>
            Dual fiat + crypto protection
          </ThemedText>
          <ThemedText type="title" style={[styles.title, styles.heroText]}>
            The trust-first mobile marketplace & escrow engine.
          </ThemedText>
          <ThemedText type="default" style={[styles.body, styles.heroText]}>
            Buy physical goods safely with held-in-escrow payments from KYC-verified sellers, or open standalone escrow contracts for any off-platform transaction.
          </ThemedText>

          <View style={styles.actions}>
            <Link href="/marketplace" style={styles.primaryButton}>
              <ThemedText type="linkPrimary">Browse marketplace</ThemedText>
            </Link>
            <Link href="/marketplace" style={styles.secondaryButton}>
              <ThemedText type="link">Start escrow</ThemedText>
            </Link>
          </View>

          <View style={styles.indicatorRow}>
            <ThemedView type="backgroundElement" style={styles.indicatorBadge}>
              <ThemedText type="smallBold">100% KYC vendors</ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.indicatorBadge}>
              <ThemedText type="smallBold">Rail-agnostic ledger</ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.indicatorBadge}>
              <ThemedText type="smallBold">Admin dispute support</ThemedText>
            </ThemedView>
          </View>
        </View>
      </ImageBackground>

      <ThemedView type="backgroundElement" style={styles.heroCard}>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">Live Escrow Simulator</ThemedText>
          <ThemedText type="small" style={styles.cardStatus}>
            Escrow Protected
          </ThemedText>
        </View>

        <View style={styles.cardBody}>
          <ThemedText type="smallBold" style={styles.cardTitle}>
            MacBook Pro 16&quot; M3
          </ThemedText>
          <ThemedText type="small" style={styles.cardDescription}>
            Order #84920 · Seller @kwame_tech · KYC Verified
          </ThemedText>
        </View>

        <View style={styles.cardFooter}>
          <ThemedView type="backgroundSelected" style={styles.dealTag}>
            <ThemedText type="smallBold">Fiat rail</ThemedText>
          </ThemedView>
          <ThemedText type="smallBold" style={styles.releasedText}>
            Payment held until delivery confirmation
          </ThemedText>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.six,
  },
  heroBackground: {
    width: '100%',
    minHeight: 320,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBackgroundImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
  },
  heroCopy: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heroText: {
    color: '#ffffff',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    lineHeight: 28,
  },
  body: {
    color: '#d1d5db',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  primaryButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  indicatorBadge: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginTop: -Spacing.six,
    marginHorizontal: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  cardStatus: {
    color: '#16a34a',
  },
  cardBody: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  cardTitle: {
    marginBottom: Spacing.one,
  },
  cardDescription: {
    color: '#4b5563',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  dealTag: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  releasedText: {
    flex: 1,
    color: '#4b5563',
  },
});
