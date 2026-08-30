import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useKeyboard } from '@/hooks/use-keyboard';

/**
 * A scroll view that lifts the focused input clear of the keyboard by itself.
 *
 * Expo's recommended library for this (react-native-keyboard-controller) needs
 * a development build and doesn't run in Expo Go, so this does the same job
 * with built-in APIs only:
 *
 *   1. a field calls `ensureVisible(node)` when it gains focus
 *   2. we wait for the keyboard's open animation to finish
 *   3. we measure where the field sits on screen and where the keyboard's top
 *      edge is, and if the field is behind it (or too close), we scroll by
 *      exactly the difference
 *
 * The result: whatever you tap sits above the keyboard with no manual scrolling.
 */

type EnsureVisible = (node: View | null) => void;

const KeyboardScrollContext = createContext<EnsureVisible>(() => {});

/** Fields call this on focus; a no-op when used outside the provider. */
export function useEnsureVisible(): EnsureVisible {
  return useContext(KeyboardScrollContext);
}

/** Breathing room kept between the field and the top of the keyboard. */
const GAP = 24;

export interface KeyboardAwareScrollProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Layout used only while the keyboard is closed (e.g. vertical centring). */
  restingContentStyle?: StyleProp<ViewStyle>;
  /** Pull-to-refresh, for screens that own a refreshable list. */
  refreshControl?: ReactElement<RefreshControlProps>;
  showsVerticalScrollIndicator?: boolean;
}

export function KeyboardAwareScroll({
  children,
  style,
  contentContainerStyle,
  restingContentStyle,
  refreshControl,
  showsVerticalScrollIndicator = false,
}: KeyboardAwareScrollProps) {
  const scrollRef = useRef<ScrollView>(null);
  const offset = useRef(0);
  const { keyboardHeight, keyboardVisible } = useKeyboard();

  // Read inside the delayed callback, so it sees the height the keyboard
  // settled at rather than whatever it was when focus happened.
  const heightRef = useRef(0);
  heightRef.current = keyboardHeight;

  /*
    The only consumer of this is `ensureVisible`, which runs once on focus and
    reads whatever the last value was. At `scrollEventThrottle={16}` this fired
    a JS callback on every frame of every scroll — 60 a second, on every screen
    this wraps, to keep a number that is read at most once per keyboard open.
    That is a real cost now the admin console, the seller home and the deal
    screen all scroll through here.

    200ms is plenty: the offset only needs to be roughly right when a field is
    tapped, and a tap can't follow a fling closely enough for the difference to
    show. `useCallback` because this is a prop on a scrolling list.
  */
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  const ensureVisible = useCallback<EnsureVisible>((node) => {
    if (!node) return;

    // Wait out the keyboard animation — measuring sooner reads stale numbers.
    // iOS animates faster than Android, which also fires its event later.
    const delay = Platform.OS === 'ios' ? 120 : 320;

    setTimeout(() => {
      const kb = heightRef.current;
      if (!kb) return; // keyboard closed again in the meantime

      node.measureInWindow((_x, y, _w, h) => {
        const keyboardTop = Dimensions.get('window').height - kb;
        const fieldBottom = y + h + GAP;
        const overlap = fieldBottom - keyboardTop;

        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: offset.current + overlap, animated: true });
        }
      });
    }, delay);
  }, []);

  return (
    <KeyboardScrollContext.Provider value={ensureVisible}>
      <KeyboardAvoidingView
        style={[{ flex: 1 }, style]}
        // Per Expo's guide: padding on iOS, nothing on Android (the window
        // already resizes there).
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={200}
          contentContainerStyle={[
            contentContainerStyle,
            // Centring is only right when the keyboard is down; with it up we
            // want the content free to move, plus room to scroll into.
            keyboardVisible ? { paddingBottom: keyboardHeight + GAP } : restingContentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardScrollContext.Provider>
  );
}
