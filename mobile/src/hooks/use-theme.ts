/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Tones } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // ColorSchemeName is 'light' | 'dark' | null | undefined — selecting dark explicitly
  // and defaulting everything else to light covers every spelling across React Native versions.
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}

/**
 * The scheme's semantic surfaces — `tones.danger.surface`, `tones.warning.text`
 * and so on. Use for a notice or callout that carries its own meaning; use
 * `useTheme()` for ordinary chrome.
 */
export function useTones() {
  const scheme = useColorScheme();
  return Tones[scheme === 'dark' ? 'dark' : 'light'];
}
