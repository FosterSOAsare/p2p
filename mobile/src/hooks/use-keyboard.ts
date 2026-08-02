import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks whether the soft keyboard is open and how tall it is.
 *
 * Screens use this to give a scroll view enough bottom room that the focused
 * field can sit above the keyboard, and to stop vertically centring content
 * while the keyboard is up.
 *
 * iOS fires the `Will` events (so the UI moves with the keyboard animation);
 * Android only reliably fires the `Did` events.
 */
export function useKeyboard() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { keyboardHeight: height, keyboardVisible: height > 0 };
}
