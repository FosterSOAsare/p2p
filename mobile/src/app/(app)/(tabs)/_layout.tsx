import type { ComponentType } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Package, ShieldCheck, Store, User } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, TabBar } from '@/constants/theme';

/**
 * Bottom tab bar for the signed-in area.
 *
 * Five tabs, the same five for everyone, in this order:
 * Home · Marketplace · My Deals · My Listings · Profile.
 *
 * Labels and icons mirror the web app's primary nav (`web/src/features/shared/
 * ui/Layout.tsx`): Marketplace uses Store, deals use ShieldCheck.
 *
 * `headerShown` is off because every screen renders its own heading.
 *
 * **Each tab is a flat file — `home.tsx`, not `home/index.tsx`.** That is load
 * bearing: a folder route is named `home/index`, so `name="home"` matched
 * nothing and every option was silently dropped — labels showed the raw route
 * path, icons never rendered, and `href: null` failed to hide a tab. Flat files
 * make the route name exactly the tab name. Adding an `index.tsx` back under a
 * folder here would reintroduce that bug.
 *
 * Options are set through `screenOptions` rather than per-screen `options` so
 * the navigator applies them for whatever route it renders; the children below
 * carry only `name`, which is what fixes the order.
 *
 * Activity is not in this folder at all (it lives at `(app)/activity`) — with
 * `href: null` unreliable, keeping a screen off the bar means keeping it out of
 * this directory.
 */

interface TabMeta {
  title: string;
  Icon: ComponentType<{ color?: string; size?: number }>;
}

/** Keyed by route name — the folder name inside this directory. */
const TAB_META: Record<string, TabMeta> = {
  home: { title: 'Home', Icon: Home },
  marketplace: { title: 'Marketplace', Icon: Store },
  deals: { title: 'My Deals', Icon: ShieldCheck },
  listings: { title: 'My Listings', Icon: Package },
  profile: { title: 'Profile', Icon: User },
};

export default function TabsLayout() {
  const theme = useTheme();
  // The bar has to grow by the device's bottom inset, otherwise the icons sit
  // under the home indicator / gesture pill on phones that have one.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => {
        const meta = TAB_META[route.name];

        return {
          headerShown: false,
          title: meta?.title ?? route.name,
          // Size is fixed rather than taken from the navigator's `size`
          // argument, so an icon can never render at 0.
          tabBarIcon: ({ color }: { color: string }) =>
            meta ? <meta.Icon color={color} size={22} /> : null,
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
        };
      }}
    >
      {/* Order of these children is what orders the bar. Profile stays last —
          the web keeps its profile pill at the right-hand end of the nav too. */}
      <Tabs.Screen name="home" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="deals" />
      <Tabs.Screen name="listings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
