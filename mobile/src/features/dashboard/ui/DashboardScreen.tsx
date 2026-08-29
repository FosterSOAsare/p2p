import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { usePersona } from '@/hooks/use-persona';
import { useAuth } from '@/context/AuthContext';
import { SkeletonList } from '@/features/shared/ui/Skeleton';
import { KeyboardAwareScroll } from '@/features/shared/ui/KeyboardAwareScroll';
import { BuyerDashboard } from './BuyerDashboard';
import { SellerDashboard } from './SellerDashboard';
import { AdminDashboard } from './AdminDashboard';

/**
 * Home tab — the phone version of `web/src/pages/Dashboard.tsx`.
 *
 * One screen, three faces, picked from the signed-in role exactly as the web
 * does: admin → console, KYC-verified seller → merchant portal, everyone else
 * → buyer overview. The web redirects admins to /admin; on a phone the home
 * tab renders the console inline, since there's no address bar to redirect.
 */

export function DashboardScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  // Single source of truth for which face of the app this account sees.
  const persona = usePersona();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Keyboard-aware: the seller's dispatch form expands inline on a sales
          card partway down this list, so a focused field has to be lifted clear
          of the keyboard rather than sat under it. */}
      <KeyboardAwareScroll
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.four }]}
      >
        {persona === 'admin' ? (
          <AdminDashboard />
        ) : persona === 'seller' && user ? (
          <SellerDashboard user={user} />
        ) : user ? (
          <BuyerDashboard user={user} />
        ) : (
          /* The route guard means a signed-out account never reaches this
             screen, so this branch is defensive — but "defensive" used to mean
             rendering nothing at all, and a blank home screen is the one thing
             this app should never show. Placeholders instead. */
          <SkeletonList count={3} />
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    // Keeps the column readable on tablets and large phones instead of
    // stretching cards edge to edge.
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
