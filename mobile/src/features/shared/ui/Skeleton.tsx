import { useEffect } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Loading placeholders shaped like the content that's coming.
 *
 * A lone spinner on an otherwise empty screen is indistinguishable from a page
 * that failed — you get no sense of what is arriving or how much. These draw the
 * real layout in grey, so the screen looks like itself from the first frame and
 * the content lands into a shape that's already there instead of shoving a
 * spinner aside.
 *
 * Animated, not Reanimated: a single looping opacity value on the JS driver's
 * `useNativeDriver` path costs nothing and avoids pulling a worklet into a
 * screen that is, by definition, already busy fetching.
 */

/**
 * One pulse value for every block on screen, created once at module level.
 *
 * Each block used to own its own `Animated.Value` and its own `Animated.loop`,
 * so a loading list ran sixteen-plus concurrent animations to draw one effect.
 * Sharing a single driver makes it one animation no matter how many blocks are
 * mounted — and they pulse in step, which reads as deliberate rather than as
 * shimmering noise.
 */
const pulse = new Animated.Value(0.4);
let running = 0;

function usePulse() {
  useEffect(() => {
    // Reference-counted: the first block on screen starts it, the last one off
    // stops it, so nothing keeps animating behind a loaded screen.
    running += 1;
    if (running === 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ]),
      ).start();
    }
    return () => {
      running -= 1;
      if (running === 0) pulse.stopAnimation();
    };
  }, []);
}

/** One grey block. Give it a width/height like any other view. */
export function SkeletonBlock({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const theme = useTheme();
  usePulse();

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.backgroundElement, borderRadius: Radius.sm, opacity: pulse },
        style,
      ]}
    />
  );
}

/** A card with a thumbnail, two text lines and a footer — the deals/listings row. */
export function SkeletonRow() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.row}>
        <SkeletonBlock style={styles.thumb} />
        <View style={styles.lines}>
          <SkeletonBlock style={styles.pill} />
          <SkeletonBlock style={styles.lineWide} />
          <SkeletonBlock style={styles.lineNarrow} />
        </View>
      </View>
      <SkeletonBlock style={styles.footer} />
    </View>
  );
}

/** A marketplace grid tile — image on top, title and price below. */
export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <SkeletonBlock style={styles.tileImage} />
      <SkeletonBlock style={styles.lineWide} />
      <SkeletonBlock style={styles.lineNarrow} />
    </View>
  );
}

/** `n` rows — what a list screen renders instead of a spinner. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  thumb: { height: 52, width: 52, borderRadius: Radius.md },
  lines: { flex: 1, gap: 6 },
  pill: { height: 14, width: 76, borderRadius: Radius.full },
  lineWide: { height: 12, width: '80%' },
  lineNarrow: { height: 10, width: '55%' },
  footer: { height: 12, width: '40%' },

  tile: { flex: 1, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.two, gap: 8 },
  tileImage: { height: 120, width: '100%', borderRadius: Radius.md },
});
