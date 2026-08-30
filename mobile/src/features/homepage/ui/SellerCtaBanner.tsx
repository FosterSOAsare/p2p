import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Merchant-verification CTA on the homepage.
 *
 * Styled off the seller screens rather than the web's emerald CTAs: the button
 * this leads to lands the user in `VendorKycScreen`, so it uses that screen's
 * `theme.primary` fill and white bold label. The label was `linkPrimary`
 * (#16a34a) on an emerald fill — green on green, and unreadable.
 */
export function SellerCtaBanner() {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <ThemedText type="subtitle" style={styles.heading}>
        Merchant protection made easy
      </ThemedText>
      <ThemedText type="default" style={[styles.body, { color: theme.textSecondary }]}>
        Apply for verified merchant status to list products, receive payout protection, and access
        senior dispute support.
      </ThemedText>
      <Link href="/marketplace" asChild>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Apply for merchant verification</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.six,
  },
  heading: {
    marginBottom: Spacing.two,
  },
  body: {
    marginBottom: Spacing.four,
  },
  // Same geometry as the seller screens' `primaryBtn`.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
  },
  buttonText: { fontSize: 13.5, fontFamily: Fonts.sans[700], color: '#ffffff' },
});
