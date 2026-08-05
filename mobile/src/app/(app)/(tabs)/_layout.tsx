import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Home, Package, ShieldCheck, Store, User } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { usePersona } from '@/hooks/use-persona';
import { Fonts, Spacing, TabBar } from '@/constants/theme';

/**
 * Bottom tab bar for the signed-in area.
 *
 * Each `name` matches a folder in this directory — `home` → `home/index.tsx`.
 * Labels and icons mirror the web app's primary nav (`web/src/features/shared/
 * ui/Layout.tsx`): Marketplace uses Store, deals use ShieldCheck.
 *
 * `headerShown` is off because every screen renders its own heading.
 *
 * The fourth slot is persona-dependent: buyers get Activity, sellers get My
 * Listings in its place, since managing inventory is the thing a seller opens
 * the app for. Only one of the two is ever mounted in the bar — the other is
 * hidden with `href: null`, which drops the button but keeps the route
 * reachable, so `/listings` still resolves when pushed from elsewhere.
 */
export default function TabsLayout() {
  const theme = useTheme();
  // Admins count as sellers here, matching `RoleGuard`'s seller gate.
  const persona = usePersona();
  const isSeller = persona === 'seller' || persona === 'admin';
  // The bar has to grow by the device's bottom inset, otherwise the icons sit
  // under the home indicator / gesture pill on phones that have one.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.tabBarBorder,
          height: TabBar.height + TabBar.lift + insets.bottom,
          paddingTop: Spacing.two,
          // Lifts the icons and labels clear of the bottom edge.
          paddingBottom: TabBar.lift + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: Fonts.sans[600] },
        tabBarIconStyle: { marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'My Deals',
          tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
        }}
      />
      {/* Fourth slot — Activity for buyers, My Listings for sellers. */}
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          href: isSeller ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'My Listings',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
          href: isSeller ? undefined : null,
        }}
      />
      {/* Last entry, so it sits at the far right of the bar — the web keeps its
          profile pill at the right-hand end of the nav too. */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
