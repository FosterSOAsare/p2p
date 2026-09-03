/**
 * The scheme every screen renders against.
 *
 * This used to re-export React Native's `useColorScheme` directly, which reads
 * the OS setting and nothing else — so the app could not offer a theme toggle
 * at all. It now reads the app's own preference (`AppThemeProvider`), which
 * resolves to the system value when the user has chosen "System".
 *
 * Kept at this path and with this name deliberately: every consumer —
 * `use-theme`, the navigation theme, the status bar — already imports from
 * here, so the toggle reaches all of them without touching any of them.
 */
export { useResolvedScheme as useColorScheme } from '@/context/ThemeContext';
