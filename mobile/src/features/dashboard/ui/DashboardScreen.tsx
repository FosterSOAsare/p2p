import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useAuth } from '@/context/AuthContext';
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

  // The guard in app/_layout only lets this render when signed in, so a null
  // user means the mock session was cleared mid-render — fall back to buyer.
  const role = user?.role ?? 'buyer';
  const isSeller = role === 'seller' || user?.kycStatus === 'verified';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.four }]}
        showsVerticalScrollIndicator={false}
      >
        {role === 'admin' ? (
          <AdminDashboard />
        ) : isSeller && user ? (
          <SellerDashboard user={user} />
        ) : user ? (
          <BuyerDashboard user={user} />
        ) : null}
      </ScrollView>
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
