import type { ComponentType } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardCheck, Home, PackageSearch, Scale, Users } from '@/components/icons';

import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, TabBar } from '@/constants/theme';

/**
 * Bottom tab bar for the admin console.
 *
 * The console used to sit inside the buyer/seller bar — Marketplace, My Deals,
 * My Listings, Profile — which are the wrong four destinations for someone
 * whose job is moderation. This bar mirrors the web admin's own nav
 * (`web/src/features/admin/ui/AdminSectionNav.tsx`) instead: Home, then the
 * four review queues.
 *
 * Living at `(app)/admin/` rather than in a second route group is deliberate.
 * Every section keeps the `/admin/*` URL it already had, so the home screen's
 * shortcuts and this bar point at exactly the same routes — a group would have
 * put the tabs at `/kyc`, `/listings` … and `/listings` already belongs to the
 * buyer-facing screen.
 *
 * **Each section is a folder with its own `_layout.tsx` Stack.** That is load
 * bearing twice over. It keeps `kyc/[id]` and friends *inside* their section
 * instead of surfacing as extra tabs, and it makes the route name the bare
 * folder name — expo-router 6 (SDK 54) names a bare nested index route by its
 * full path (`kyc/index`), so without the nested layout `name="kyc"` would
 * match nothing and every option here would be silently dropped.
 *
 * Profile is deliberately absent: it moved to the app bar at the top of the
 * console, alongside messages and notifications, matching the buyer/seller
 * screens.
 */

interface TabMeta {
  title: string;
  Icon: ComponentType<{ color?: string; size?: number }>;
}

/** Keyed by route name — the folder name inside this directory. */
const TAB_META: Record<string, TabMeta> = {
  index: { title: 'Home', Icon: Home },
  kyc: { title: 'KYC', Icon: ClipboardCheck },
  disputes: { title: 'Disputes', Icon: Scale },
  listings: { title: 'Listings', Icon: PackageSearch },
  users: { title: 'Users', Icon: Users },
};

export default function AdminTabsLayout() {
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
      {/* Order of these children is what orders the bar. */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kyc" />
      <Tabs.Screen name="disputes" />
      <Tabs.Screen name="listings" />
      <Tabs.Screen name="users" />

      {/*
        Deal oversight is reachable from the home screen's figures, not from the
        bar — the admin's four jobs are the queues above, and a fifth "Deals"
        tab would push the console back towards the buyer/seller shape this bar
        exists to get away from.
      */}
      <Tabs.Screen name="deals" options={{ href: null }} />

      {/*
        Reports likewise. The web gives it its own nav entry, but that nav is a
        sidebar with room to spare; a sixth item here would crowd six labels
        into a phone's width. It is reached from the console home's open-reports
        tile and from the Listings screen, which is where an admin is already
        looking when a flagged listing matters.
      */}
      <Tabs.Screen name="reports" options={{ href: null }} />

      {/*
        Payout review, same reasoning again — the bar stays at five. It is
        reached from the console home's Withdrawals tile, which carries the
        pending count, so a queue with work in it is visible from the landing
        screen without spending a bar slot on it.
      */}
      <Tabs.Screen name="withdrawals" options={{ href: null }} />
    </Tabs>
  );
}
