import { Stack } from 'expo-router';

/**
 * Signed-in area layout.
 *
 * A Stack, so screens outside the tab bar (listings, profile, kyc, chat …) push
 * on top of the tabs and can be backed out of. Headers are off — each screen
 * draws its own, matching the web app's page-level headings.
 *
 * Note for later: this is where an auth guard belongs — redirect to /login when
 * there's no session, mirroring the web's SellerGuard / AdminGuard pattern.
 */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
