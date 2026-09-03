import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Light/dark preference, owned by the app rather than the OS.
 *
 * The app had no control at all — every screen read React Native's
 * `useColorScheme()`, so the only way to change it was to change the phone's
 * system setting. The web has had a header toggle throughout
 * (`web/src/features/shared/libs/theme.ts`); this is its counterpart.
 *
 * Three states, not two. "System" is the default and is a real choice, not the
 * absence of one: it keeps the app in step with the phone's own light/dark
 * schedule, which is what most people actually want. Explicit light or dark
 * pins it regardless.
 *
 * Stored in expo-secure-store. That is a keychain, and a theme is not a secret
 * — but it is the only key/value store this app already ships, and adding a
 * native module to hold one short string is not worth it: the last native
 * dependency added here (`@expo/ui`) crashed every standalone build before any
 * JS ran. One small string in the keychain is the cheaper trade.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'p2p_theme_preference';

interface ThemeContextValue {
  /** What the user chose — including "follow the system". */
  preference: ThemePreference;
  /** What that actually resolves to right now. This is what screens render. */
  scheme: ResolvedScheme;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  /*
    Load the saved choice on mount.

    Starting from 'system' means the first frames follow the phone, which is the
    right guess and never wrong-looking. If the saved preference differs it
    lands a moment later — behind the splash, which `RootNavigator` holds up
    until the session check finishes. A keychain read beats a network round
    trip comfortably, so in practice the theme is settled before anything is
    visible.
  */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
      if (!cancelled && isPreference(saved)) setPreferenceState(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    // Applied immediately; the write is fire-and-forget so the toggle never
    // waits on storage. A failed write costs the preference at next launch,
    // not the change the user just made.
    setPreferenceState(next);
    void SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const scheme: ResolvedScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The resolved scheme. Falls back to the system value when no provider is
 * mounted, so a screen rendered outside the tree (a test, a storybook-style
 * preview) still gets a sensible theme instead of throwing.
 */
export function useResolvedScheme(): ResolvedScheme {
  const ctx = useContext(ThemeContext);
  const system = useSystemColorScheme();
  if (ctx) return ctx.scheme;
  return system === 'dark' ? 'dark' : 'light';
}

/** The preference and its setter — for the settings toggle. */
export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used inside AppThemeProvider');
  return ctx;
}
