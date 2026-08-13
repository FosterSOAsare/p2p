import { usePersona } from '@/hooks/use-persona';
import { MyListingsScreen } from '@/features/listings/ui/MyListingsScreen';
import { VendorKycScreen } from '@/features/seller/ui/VendorKycScreen';

/**
 * The fourth tab, which means two different things depending on who you are —
 * exactly as the web's nav does:
 *
 *   isSeller ? { to: '/listings', label: 'My Listings' }
 *            : { to: '/sell',     label: 'Sell Goods'  }
 *
 * A buyer used to land on the seller screen behind a `RoleGuard`, so the tab
 * they were given led straight to a "Sellers only" wall with a button to the
 * very screen it could have shown them. Now it just shows it.
 *
 * No guard is needed any more: the buyer branch *is* the onboarding screen, and
 * `MyListingsScreen` is only reachable once the persona is already `seller`.
 */
export default function ListingsTabRoute() {
  const persona = usePersona();

  return persona === 'seller' ? <MyListingsScreen /> : <VendorKycScreen />;
}
