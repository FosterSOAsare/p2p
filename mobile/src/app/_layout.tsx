import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SavedProvider } from '@/context/SavedContext';
import { BlockedProvider } from '@/context/BlockedContext';
import { queryClient } from '@/features/shared/data/queryClient';
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

/**
 * Keep the native splash up until we have decided what to render.
 *
 * Without this the splash hides as soon as the first frame is ready, which is
 * before the stored session has been checked — so the login screen paints and
 * is then replaced. Held here, the check happens behind the splash instead.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or no splash on this platform — nothing to hold.
});

/** Split out so it can read auth state — it must render inside AuthProvider. */
function RootNavigator() {
  const { isAuthenticated, isBooting } = useAuth();

  /*
    Hide the splash only once the session is known, and from an effect so it
    happens after the first real frame has been committed — hiding while the
    tree is still empty would show a blank screen between the two.
  */
  useEffect(() => {
    if (!isBooting) SplashScreen.hideAsync().catch(() => {});
  }, [isBooting]);

  /*
    Render nothing while the stored session is being checked. `isAuthenticated`
    is false during that window whether or not a session exists, so the guards
    below would route a returning user to the login screen and then bounce them
    off it. The splash covers this.
  */
  if (isBooting) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>

      {/* Outside both guards: an invite link has to open either way, and the
          deal's terms are meant to be readable before signing in. */}
      <Stack.Screen name="join/[code]" />
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
  // still up at this point — it is pinned above and stays until `RootNavigator`
  // knows whether there is a session to restore, so this returns into the
  // splash rather than into a blank screen.
  // On a font error we render anyway rather than trapping the user on a blank
  // screen; the system font is a survivable fallback.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      {/* Above AuthProvider: signing in/out invalidates cached server data. */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SavedProvider>
            <BlockedProvider>
              <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
                <RootNavigator />
              </ThemeProvider>
            </BlockedProvider>
          </SavedProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
