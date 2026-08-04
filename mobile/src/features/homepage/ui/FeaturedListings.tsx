import { Link } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Radius, Spacing } from '@/constants/theme';

const listings = [
  {
    title: 'MacBook Pro 16" M3',
    price: '$2,450',
    vendor: '@kwame_tech',
    location: 'Accra, GH',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'Vintage Camera Bundle',
    price: '$480',
    vendor: '@esi_crafts',
    location: 'Kumasi, GH',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
  },
  {
    title: 'Gaming Desk Setup',
    price: '$1,100',
    vendor: '@daniel_offers',
    location: 'Tamale, GH',
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
  },
];

export function FeaturedListings() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <ThemedText type="subtitle" style={styles.heading}>
            Featured marketplace listings
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Explore physical goods available with escrow protection.
          </ThemedText>
        </View>

        <Link href="/marketplace" style={styles.linkButton}>
          <ThemedText type="linkPrimary">View all</ThemedText>
        </Link>
      </View>

      <View style={styles.grid}>
        {listings.map((listing) => (
          <ThemedView key={listing.title} style={styles.card}>
            <Image source={{ uri: listing.image }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardContent}>
              <ThemedText type="smallBold" style={styles.cardTitle}>
                {listing.title}
              </ThemedText>
              <ThemedText type="small" style={styles.cardDetail}>
                {listing.vendor} · {listing.location}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.cardPrice}>
                {listing.price}
              </ThemedText>
            </View>
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
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.three,
    width: '100%',
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  heading: {
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#4b5563',
  },
  linkButton: {
    paddingVertical: Spacing.one,
  },
  grid: {
    width: '100%',
  },
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Spacing.three,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: Spacing.four,
  },
  cardTitle: {
    marginBottom: Spacing.one,
  },
  cardDetail: {
    color: '#4b5563',
    marginBottom: Spacing.two,
  },
  cardPrice: {
    color: '#16a34a',
  },
});
