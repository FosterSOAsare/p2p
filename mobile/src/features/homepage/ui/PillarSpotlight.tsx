import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

const tabs = [
  {
    key: 'marketplace',
    label: 'Marketplace',
    description: 'Buy physical goods from verified vendors, with payments held in escrow until delivery is confirmed.',
  },
  {
    key: 'standalone',
    label: 'Standalone escrow',
    description: 'Open custom escrow deals for freelance work, services, or contract payments outside the marketplace.',
  },
];

export function PillarSpotlight() {
  const [active, setActive] = useState('marketplace');
  const activeTab = tabs.find((item) => item.key === active) ?? tabs[0];

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        Built for both marketplace buyers and standalone contracts
      </ThemedText>

      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setActive(item.key)}
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}>
            <ThemedView
              type={active === item.key ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.tabButtonInner}>
              <ThemedText
                type="smallBold"
                style={[styles.tabLabel, active === item.key && styles.activeTabLabel]}>
                {item.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>

      <ThemedView style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          {activeTab.label}
        </ThemedText>
        <ThemedText type="default" style={styles.cardDescription}>
          {activeTab.description}
        </ThemedText>

        <View style={styles.metaGrid}>
          <ThemedView type="backgroundElement" style={styles.metaItem}>
            <ThemedText type="smallBold">Verified sellers</ThemedText>
            <ThemedText type="small">All marketplace listings pass KYC checks.</ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.metaItem}>
            <ThemedText type="smallBold">Flexible contracts</ThemedText>
            <ThemedText type="small">Create one-off escrow deals with any counterparty.</ThemedText>
          </ThemedView>
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
  heading: {
    marginBottom: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.four,
  },
  tabButton: {
    flex: 1,
    minWidth: 140,
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
  },
  tabButtonPressed: {
    opacity: 0.85,
  },
  tabButtonInner: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    textAlign: 'center',
    color: '#4b5563',
  },
  activeTabLabel: {
    color: '#064e3b',
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  cardTitle: {
    marginBottom: Spacing.two,
  },
  cardDescription: {
    color: '#4b5563',
    marginBottom: Spacing.four,
  },
  metaGrid: {
    marginTop: Spacing.four,
  },
  metaItem: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  metaItem: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
});