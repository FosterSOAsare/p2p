import { Stack } from 'expo-router';

/**
 * Stack for the listings section of the console.
 *
 * Exists so the section is one route to the tab bar above: without it the tab
 * navigator would list every file here separately (`listings/index`, `listings/[id]`),
 * turning detail screens into tabs. Detail screens push on top instead, and
 * backing out returns to the list with its filters intact.
 */
export default function ListingsSectionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
