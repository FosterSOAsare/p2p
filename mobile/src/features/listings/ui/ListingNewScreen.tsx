import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, PlusCircle } from 'lucide-react-native';

import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { ListingForm } from './ListingForm';

/**
 * Create a listing — the phone version of `web/src/pages/ListingNew.tsx`.
 *
 * A thin wrapper over the shared `ListingForm`, same as the web: the page owns
 * the heading and what happens on submit, the form owns the fields.
 *
 * Status is hidden on create (`showStatus={false}`), matching the web — a new
 * listing publishes as active.
 */
export function ListingNewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/listings');
  };

  const onSubmit = async () => {
    setPending(true);
    // TODO(api): POST /api/listings, then land on /listings as the web does.
    // Nothing is persisted yet, so the new listing won't appear in the list.
    await new Promise((r) => setTimeout(r, 600));
    setPending(false);
    router.replace('/listings');
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to My Listings"
          style={({ pressed }) => [
            styles.backRow,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <ArrowLeft size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back to My Listings</Text>
        </Pressable>

        <View style={styles.heading}>
          <View style={styles.eyebrowRow}>
            <PlusCircle size={13} color={theme.primary} />
            <Text style={[styles.eyebrow, { color: theme.primary }]}>New Listing</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Create a Listing</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Priced in GH₵ — buyers pay through escrow and funds release to your payout account on
            confirmed delivery.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ListingForm
            submitLabel="Publish Listing"
            pendingLabel="Publishing..."
            isPending={pending}
            showStatus={false}
            onSubmit={onSubmit}
          />
        </View>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans[700] },

  heading: { gap: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.sans[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Heading uses the web's `font-display`.
  title: { fontSize: 21, fontFamily: Fonts.display[700], letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, fontFamily: Fonts.sans[400] },

  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.four },
});
