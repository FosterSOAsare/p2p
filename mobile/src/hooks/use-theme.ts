/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // ColorSchemeName is 'light' | 'dark' | null | undefined here — there's no
  // 'unspecified' member — so anything that isn't explicitly dark gets light.
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
