/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // ColorSchemeName is 'light' | 'dark' | null | undefined — selecting dark explicitly
  // and defaulting everything else to light covers every spelling across React Native versions.
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
