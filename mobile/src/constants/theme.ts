/**
 * Design tokens for the VeriTrust mobile app.
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

/* ── Tonal surfaces (light / dark pairs) ──────────────────────── */
/**
 * Semantic surfaces for the full-width notices, callouts and error boxes that
 * carry a meaning of their own — a takedown panel, a KYC verdict, a failed
 * request.
 *
 * These invert with the scheme, and `StatusColors` above deliberately does not.
 * The distinction is size, not consistency: a status pill is a small mark on a
 * themed card and reads as a mark whatever sits behind it, but a panel *is* the
 * card, and a near-white one on the app's #0a0a0a background reads as a
 * rendering fault rather than a warning.
 *
 * The dark ramp is the web's, step for step — `dark:bg-{tone}-950` surfaces,
 * `dark:border-{tone}-800`, `dark:bg-{tone}-900` chips, `dark:text-{tone}-300`
 * copy and `dark:text-{tone}-400` icons, as used across VendorKyc, UserSettings
 * and the listing dispute panel. Surfaces are rgba so they composite over
 * whatever sits behind them, the way the web's `/30` alpha does.
 *
 * Light stays exactly as each mobile screen already had it, so nothing moves in
 * light mode.
 */
export const Tones = {
  light: {
    danger:  { surface: '#fef2f2', border: '#fecaca', chip: '#fee2e2', icon: '#e11d48', text: '#b91c1c', strong: '#7f1d1d' },
    warning: { surface: '#fffbeb', border: '#fde68a', chip: '#fef3c7', icon: '#f59e0b', text: '#92400e', strong: '#451a03' },
    success: { surface: '#f0fdf4', border: '#bbf7d0', chip: '#dcfce7', icon: '#059669', text: '#166534', strong: '#052e16' },
    neutral: { surface: '#f3f4f6', border: '#e5e7eb', chip: '#e5e7eb', icon: '#6b7280', text: '#374151', strong: '#111827' },
  },
  // rose / amber / emerald 950→200, matching the web's dark: variants.
  dark: {
    danger:  { surface: 'rgba(76, 5, 25, 0.35)',   border: '#9f1239', chip: '#881337', icon: '#fb7185', text: '#fda4af', strong: '#fecdd3' },
    warning: { surface: 'rgba(69, 26, 3, 0.40)',   border: '#92400e', chip: '#78350f', icon: '#fbbf24', text: '#fcd34d', strong: '#fde68a' },
    success: { surface: 'rgba(2, 44, 34, 0.45)',   border: '#065f46', chip: '#064e3b', icon: '#34d399', text: '#6ee7b7', strong: '#a7f3d0' },
    neutral: { surface: '#1a1a1a',                 border: '#262626', chip: '#2a2a2a', icon: '#9ca3af', text: '#d1d5db', strong: '#f9fafb' },
  },
} as const;

export type ToneKey = keyof typeof Tones.light;
export type ToneSet = (typeof Tones)['light'];

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
    /**
     * The web's second green. Most buttons there are `bg-primary-600`, but a
     * handful of CTAs are `bg-emerald-600 dark:bg-emerald-500` — the seller
     * CTA banner, the escrow calculator, Withdraw, View All Listings. Same
     * hexes as Tailwind's emerald, so those buttons match the web exactly
     * instead of being approximated with primary (or, as they were, teal).
     */
    accent: '#059669',
    /** Foreground on `accent` — the web's `text-white dark:text-slate-950`. */
    accentOn: '#ffffff',
    /** emerald-100 — tinted surface for accent pills (the KYC badge). */
    accentLight: '#d1fae5',
    /** emerald-800 — text and icons sitting on `accentLight`. */
    accentText: '#065f46',
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
    /** emerald-500, matching the web's `dark:bg-emerald-500`. */
    accent: '#10b981',
    /**
     * slate-950. The web deliberately flips to dark text in dark mode, because
     * emerald-500 is light enough that white on it fails contrast.
     */
    accentOn: '#020617',
    /** emerald-950 / emerald-300, the web's dark-mode pair for the pill. */
    accentLight: '#022c22',
    accentText: '#6ee7b7',
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

/**
 * Cap for lists, grids and dashboards — the screens where a wide row is fine.
 *
 * Was 800, which is narrower than a tablet in landscape (a Xiaomi Pad 6S Pro is
 * ~1016dp) and so drew a gutter down both sides of every list. Raised to a value
 * no phone or tablet reaches, so those screens simply fill the width; it still
 * exists as a backstop for a desktop-sized window, where a single list running
 * 2000dp wide would be absurd.
 *
 * No effect on phones. A Note 20 is ~412dp portrait and ~915dp landscape, both
 * already under the old 800 in the dimension that matters — this only changes
 * what happens above it.
 */
export const MaxContentWidth = 1400;

/**
 * Cap for forms and prose, where the constraint is the eye rather than the
 * screen. A text field or a paragraph running the full width of a tablet is
 * hard to read and hard to scan, so those screens keep the old 800 and use the
 * room a tablet gives them for more per row instead of wider rows.
 */
export const ReadingWidth = 800;

/**
 * Cap for a single credential form — sign in, sign up, password reset.
 *
 * Narrower than `ReadingWidth` on purpose. Those screens are one column of
 * short fields, and stretching them across a tablet leaves an input a foot wide
 * holding an eight-character password, with the label marooned at the far left.
 * Every app that does this well — and the project's own desktop web, whose form
 * column is about this wide — keeps it to a centred card instead.
 *
 * Applies on phones too, where it simply never binds: a Note 20 is ~412dp
 * portrait, so nothing changes there. It is landscape and tablets that were
 * stretched, and this is the dimension that fixes both.
 */
export const FormWidth = 440;

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
