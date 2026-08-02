import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar } from '@/constants/theme';

/**
 * Total space the bottom tab bar occupies on this device.
 *
 * Screens inside the tab navigator add this to their bottom padding so the
 * last card clears the bar instead of hiding behind it. It's derived from the
 * device's own safe-area inset, so it adapts to a notchless phone, a home
 * indicator and a gesture pill alike rather than assuming one fixed height.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TabBar.height + TabBar.lift + insets.bottom;
}
