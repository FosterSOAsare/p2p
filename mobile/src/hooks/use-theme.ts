/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // "No preference" is spelled differently across React Native versions —
  // `null`/`undefined` on RN 0.81 (SDK 54), `'unspecified'` on newer ones.
  // Selecting dark explicitly and defaulting everything else to light covers
  // every spelling without depending on the version.
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
