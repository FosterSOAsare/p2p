import { Redirect } from 'expo-router';

import { usePersona } from '@/hooks/use-persona';
import { DashboardScreen } from '@/features/dashboard/ui/DashboardScreen';

/**
 * Home tab for buyers and sellers.
 *
 * Admins are sent to their own console at `/admin`, which carries a different
 * bottom bar — the four review queues instead of Marketplace / My Deals / My
 * Listings. Redirecting here rather than at the layout keeps the rule in one
 * obvious place, and it also catches an admin arriving from a `/home` deep
 * link or a "back to home" button, not just a fresh sign-in.
 */
export default function HomeTab() {
  const persona = usePersona();

  if (persona === 'admin') return <Redirect href="/admin" />;

  return <DashboardScreen />;
}
