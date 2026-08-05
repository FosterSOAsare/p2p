import { usePersona } from '@/hooks/use-persona';
import { AdminDealsScreen } from './AdminDealsScreen';
import { DealsListScreen } from './DealsListScreen';

/**
 * The My Deals tab — the phone version of the web's `pages/Deals.tsx`.
 *
 * Role decides what you see, with no separate route:
 *   admin        → every deal on the platform (oversight, read-only)
 *   buyer/seller → their own deals
 *
 * The buyer/seller split is NOT two components — the web keeps them on one
 * list and varies each row by the viewer's side of that deal ("Buying from" vs
 * "Selling to"), which `DealsListScreen` mirrors. Only admin is a different
 * screen, because it shows different data entirely.
 *
 * Like the web, role is enforced server-side too: the admin list's endpoint is
 * admin-only, so this choice is convenience rather than the security boundary.
 */
export function DealsScreen() {
  const persona = usePersona();

  if (persona === 'admin') return <AdminDealsScreen />;
  return <DealsListScreen />;
}
