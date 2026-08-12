import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { AdminDashboard } from '@/features/dashboard/ui/AdminDashboard';

/**
 * Home tab of the admin console.
 *
 * The console's own landing screen, not a variant of the buyer/seller home —
 * admins are redirected here from `/home` so they never meet the marketplace
 * tab bar. Deal oversight lives on this screen (the figures and the by-status
 * card), which is why there's no Deals tab in the bar below.
 */
export default function AdminHomeRoute() {
  const theme = useTheme();
  const tabBarHeight = useTabBarHeight();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.four }]}
        showsVerticalScrollIndicator={false}
      >
        <AdminDashboard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
