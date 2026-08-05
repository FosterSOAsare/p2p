// SDK 54's expo-router does not re-export the navigation theme primitives —
// that only lands in SDK 56+. They come from @react-navigation/native here.
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SavedProvider } from '@/context/SavedContext';
import { BlockedProvider } from '@/context/BlockedContext';
import { Colors } from '@/constants/theme';

/**
 * Root layout — wraps every screen in the app.
 *
 * Providers sit here (above all routes). Routing uses `Stack.Protected`: only
 * one of the two groups is reachable at a time, so a signed-out user always
 * starts in `(public)` (loading → login) and can't land in `(app)` by accident.
 * When auth state flips, the router moves groups on its own — no manual
 * navigation needed after login.
 */

const AppDarkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: Colors.dark.background },
};

const AppLightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.light.background },
};

/** Split out so it can read auth state — it must render inside AuthProvider. */
function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Manrope + Space Grotesk, the same pair the web loads from Google Fonts.
  // Every weight is its own family — see the note on `Fonts` in constants/theme.
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Hold the tree back for the one frame it takes to register the families, so
  // no screen paints in the system font and then reflows. The native splash is
  // still up at this point — `components/animated-icon` hides it later.
  // On a font error we render anyway rather than trapping the user on a blank
  // screen; the system font is a survivable fallback.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SavedProvider>
          <BlockedProvider>
            <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
              <RootNavigator />
            </ThemeProvider>
          </BlockedProvider>
        </SavedProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
