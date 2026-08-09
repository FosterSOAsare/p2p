import { Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useLiveBadges } from '@/features/shared/data/useLiveBadges';

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
  const { isAuthenticated } = useAuth();

  /**
   * Mounted here rather than on the home screen: this layout wraps every
   * signed-in screen and stays mounted as you move between them, so the message
   * and notification badges keep counting wherever you are. On the home screen
   * it would only listen while the home screen was on top — which is exactly
   * when you don't need to be told.
   *
   * This was disabled for a while during a performance hunt, on the theory that
   * an always-open socket was what made screens slow to render. It wasn't: the
   * delay measured 1–6s per request against the database in us-east-2, on the
   * server itself, with no phone involved. The socket is bounded to six
   * reconnection attempts and fails quietly, so an unreachable host costs a
   * short burst of retries rather than an endless one.
   */
  useLiveBadges(isAuthenticated);

  return <Stack screenOptions={{ headerShown: false }} />;
}
