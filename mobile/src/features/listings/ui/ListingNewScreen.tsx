import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, PlusCircle } from '@/components/icons';

import { Fonts, ReadingWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme, useTones } from '@/hooks/use-theme';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { apiErrorMessage } from '@/features/shared/data/api';
import { useCreateListing } from '../data/listingsApi';
import { ListingForm, type ListingFormValues } from './ListingForm';

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
  const tones = useTones();
  const router = useRouter();
  const createListing = useCreateListing();
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/listings');
  };

  const onSubmit = async (values: ListingFormValues) => {
    setError(null);
    try {
      await createListing.mutateAsync({
        title: values.title,
        description: values.description || null,
        price: Number(values.price),
        category: values.category,
        condition: values.condition,
        quantity: Number(values.quantity),
        location: values.location || null,
        // Create only accepts draft/active — `out_of_stock` is a state a
        // listing reaches later, not one you can publish into. The web falls
        // back to `active` here, so this does too; unreachable either way while
        // Status stays hidden on create.
        status: values.status === 'out_of_stock' ? 'active' : values.status,
        // Already uploaded by the form, so these are hosted URLs. The guard is
        // belt and braces: the server rejects anything that isn't http(s).
        images: values.images.filter(
          (i): i is string => typeof i === 'string' && /^https?:\/\//.test(i),
        ),
      });
      // The mutation invalidates the listings cache, so My Listings shows the
      // new row without this screen telling it anything.
      router.replace('/listings');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
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

        {/* Why the server refused — a missing field, a bad price, a photo it
            couldn't accept. Without this a rejected publish just does nothing. */}
        {error ? (
          <View
            style={[
              styles.apiError,
              { backgroundColor: tones.danger.surface, borderColor: tones.danger.border },
            ]}
          >
            <Text style={[styles.apiErrorText, { color: tones.danger.text }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <ListingForm
            submitLabel="Publish Listing"
            pendingLabel="Publishing..."
            isPending={createListing.isPending}
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
    maxWidth: ReadingWidth,
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
  apiError: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
  apiErrorText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.sans[600] },
});
