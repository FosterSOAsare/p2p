import { forwardRef } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  type PressableProps as RNPressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * `Pressable`, but nothing is ever silent under a finger.
 *
 * Every tappable thing in this app must show it was tapped. That was being
 * hand-rolled per call site as `style={({ pressed }) => [..., { opacity:
 * pressed ? 0.85 : 1 }]}`, which meant it was only true where someone
 * remembered — a third of the app's Pressables had no pressed state at all, so
 * a tap on them read as the app ignoring you.
 *
 * Making it structural rather than a convention: import this instead of
 * React Native's and the feedback is the default, not the thing you add.
 *
 * The default is applied **before** the caller's own style, so a call site that
 * already tunes its own `pressed` opacity still wins — this is a floor, not an
 * override. `feedback` sets that floor per instance (`feedback={false}` opts a
 * genuinely non-interactive Pressable out, e.g. a backdrop that only catches
 * taps to dismiss).
 *
 * Disabled is included on purpose: a disabled control shouldn't flash, so the
 * floor is skipped and the call site's own disabled styling stands.
 */

/** Matches the opacity already used by hand across the app. */
const DEFAULT_PRESSED_OPACITY = 0.85;

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  /**
   * Opacity while held. `false` turns the default off for a Pressable that
   * isn't really a button.
   */
  feedback?: number | false;
}

export const Pressable = forwardRef<View, PressableProps>(function Pressable(
  { style, feedback = DEFAULT_PRESSED_OPACITY, disabled, ...rest },
  ref,
) {
  const theme = useTheme();

  return (
    <RNPressable
      ref={ref}
      disabled={disabled}
      style={(state) => {
        const own = typeof style === 'function' ? style(state) : style;
        if (!state.pressed || feedback === false || disabled) return own;

        /*
          Dimming only reads on something that has a colour to dim. On a
          transparent or outline button — "Keep it" beside Delete, Cancel
          beside Save Terms — an opacity change is invisible, so those taps
          looked like nothing happened. Flattening the caller's own style tells
          us which case we're in: fill it with a tint when there's no
          background of its own, dim it when there is.

          The caller's style still comes last, so anywhere that already tunes
          its own pressed appearance keeps winning.
        */
        const flat = StyleSheet.flatten(own) ?? {};
        const hasFill =
          flat.backgroundColor != null && flat.backgroundColor !== 'transparent';

        return [
          hasFill ? { opacity: feedback } : { backgroundColor: theme.backgroundSelected },
          own,
        ];
      }}
      {...rest}
    />
  );
});
