import { Stack } from 'expo-router';

/**
 * Signed-out area layout.
 *
 * A Stack over the public screens. Its initial route is `index.tsx`, which
 * redirects to /splash — so the app always opens on the loading screen, then
 * hands off to login. Headers are off; each screen draws its own.
 */
export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
