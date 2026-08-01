import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Construction } from 'lucide-react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Stand-in for a route that exists in the web app but hasn't been built for
 * phones yet.
 *
 * The route files mirror `web/src/App.tsx` one-for-one, so navigation and deep
 * links already resolve to the right place; swapping a real screen in later is
 * a one-line change in that route file. `webRoute` records which web page this
 * stands in for, so whoever builds it knows what to port.
 */

export interface PlaceholderScreenProps {
  /** Screen heading, e.g. "Wallet". */
  title: string;
  /** One line on what the screen will do. */
  description: string;
  /** The web path this mirrors, e.g. "/wallet" — shown as a build hint. */
  webRoute: string;
  /** Back label; defaults to a plain "Back". */
  backLabel?: string;
}

export function PlaceholderScreen({
  title,
  description,
  webRoute,
  backLabel = 'Back',
}: PlaceholderScreenProps) {
  const theme = useTheme();
  const router = useRouter();

  // Deep links can land here with nothing to pop, so fall back to the tabs.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={({ pressed }) => [
            styles.backRow,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <ArrowLeft size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{backLabel}</Text>
        </Pressable>

        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>

        <View
          style={[styles.note, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <Construction size={18} color={theme.textTertiary} />
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: theme.text }]}>Not built for mobile yet</Text>
            <Text style={[styles.noteText, { color: theme.textSecondary }]}>
              This route mirrors{' '}
              <Text style={[styles.noteRoute, { color: theme.text }]}>{webRoute}</Text> in the web
              app. The navigation works — the screen itself is still to come.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three },

  // A bordered pill rather than a text link — a 12px link was too easy to miss
  // and too small to hit comfortably. 44pt tall meets the touch-target minimum.
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
  backText: { fontSize: 14, fontFamily: Fonts.sans[700] },

  // Screen heading — the web's `font-display` (Space Grotesk).
  title: { fontSize: 24, fontFamily: Fonts.display[700], letterSpacing: -0.4, marginTop: Spacing.two },
  description: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans[400] },

  note: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  noteBody: { flex: 1, gap: 4 },
  noteTitle: { fontSize: 13, fontFamily: Fonts.sans[700] },
  noteText: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans[400] },
  noteRoute: { fontFamily: Fonts.sans[700] },
});
