/**
 * Design tokens for the P2P Marketplace mobile app.
 * Matches the web app's green primary palette and extends
 * with semantic/status colors for the escrow lifecycle.
 */

import '@/global.css';

import { Platform } from 'react-native';

/* ── Primary green palette (from web Tailwind config) ─────────── */
export const Primary = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
} as const;

/* ── Semantic / accent colors ─────────────────────────────────── */
export const Accent = {
  escrowGreen: '#22c55e',
  cryptoBlue: '#3b82f6',
  fiatAmber: '#f59e0b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

/* ── Status badge colors (background / text pairs) ────────────── */
export const StatusColors = {
  active:    { bg: '#dcfce7', text: '#166534' },
  pending:   { bg: '#fef9c3', text: '#854d0e' },
  verified:  { bg: '#dcfce7', text: '#166534' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
  disputed:  { bg: '#fee2e2', text: '#991b1b' },
  completed: { bg: '#dbeafe', text: '#1e40af' },
  released:  { bg: '#dcfce7', text: '#166534' },
  funded:    { bg: '#e0e7ff', text: '#3730a3' },
  shipped:   { bg: '#fef3c7', text: '#92400e' },
  draft:     { bg: '#f3f4f6', text: '#374151' },
  suspended: { bg: '#fce7f3', text: '#9d174d' },
} as const;

export type StatusKey = keyof typeof StatusColors;

/* ── Light / Dark theme colors ────────────────────────────────── */
export const Colors = {
  light: {
    text: '#111827',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    background: '#ffffff',
    backgroundElement: '#f3f4f6',
    backgroundSelected: '#e5e7eb',
    card: '#ffffff',
    cardBorder: '#e5e7eb',
    border: '#e5e7eb',
    inputBackground: '#f9fafb',
    inputBorder: '#d1d5db',
    inputFocusBorder: Primary[500],
    primary: Primary[600],
    primaryLight: Primary[100],
    primaryDark: Primary[800],
    tabBarBackground: '#ffffff',
    tabBarBorder: '#e5e7eb',
    tabBarActive: Primary[600],
    tabBarInactive: '#9ca3af',
    headerBackground: '#ffffff',
    headerBorder: '#e5e7eb',
    overlay: 'rgba(0,0,0,0.4)',
    skeleton: '#e5e7eb',
    error: Accent.error,
  },
  dark: {
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    background: '#0a0a0a',
    backgroundElement: '#1a1a1a',
    backgroundSelected: '#2a2a2a',
    card: '#141414',
    cardBorder: '#262626',
    border: '#262626',
    inputBackground: '#1a1a1a',
    inputBorder: '#333333',
    inputFocusBorder: Primary[400],
    primary: Primary[500],
    primaryLight: '#052e16',
    primaryDark: Primary[300],
    tabBarBackground: '#0a0a0a',
    tabBarBorder: '#1f1f1f',
    tabBarActive: Primary[400],
    tabBarInactive: '#6b7280',
    headerBackground: '#0a0a0a',
    headerBorder: '#1f1f1f',
    overlay: 'rgba(0,0,0,0.7)',
    skeleton: '#262626',
    error: Accent.error,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/* ── Fonts ────────────────────────────────────────────────────── */
/**
 * The same two families the web loads in `web/index.html`:
 * Manrope for body copy (the web's `--font-sans`) and Space Grotesk for
 * display headings and figures (`--font-display`).
 *
 * React Native resolves a font by family name alone — it will not synthesise a
 * heavier cut the way a browser does — so every weight is registered as its own
 * family. Set `fontFamily: Fonts.sans[600]` instead of `fontWeight: '600'`;
 * pairing the two makes Android fake-bold an already-bold face.
 *
 * The families here must stay in step with the ones loaded in `app/_layout.tsx`.
 */
export const Fonts = {
  sans: {
    400: 'Manrope_400Regular',
    500: 'Manrope_500Medium',
    600: 'Manrope_600SemiBold',
    700: 'Manrope_700Bold',
    800: 'Manrope_800ExtraBold',
  },
  display: {
    500: 'SpaceGrotesk_500Medium',
    600: 'SpaceGrotesk_600SemiBold',
    700: 'SpaceGrotesk_700Bold',
  },
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
} as const;

/* ── Spacing scale ────────────────────────────────────────────── */
export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 40,
  eight: 48,
  nine: 56,
  ten: 64,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

/* ── Border radius ────────────────────────────────────────────── */
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/* ── Shadow presets ───────────────────────────────────────────── */
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/* ── Bottom tab bar ───────────────────────────────────────────── */
/**
 * Geometry for the signed-in tab bar, shared by the bar itself
 * (`app/(app)/(tabs)/_layout.tsx`) and by every screen that has to keep its
 * last row clear of it — see `useTabBarHeight`.
 *
 * `lift` raises the icons and labels off the bottom edge so they don't sit on
 * top of the home indicator / gesture pill.
 */
export const TabBar = {
  /** Bar content height, before the device's bottom safe-area inset. */
  height: 58,
  /** Small lift above the bottom edge. */
  lift: 10,
} as const;
