import { RoleGuard } from '@/features/shared/ui/RoleGuard';
import { MyListingsScreen } from '@/features/listings/ui/MyListingsScreen';

/**
 * The seller's fourth tab, sitting where buyers get Activity.
 *
 * Still guarded: hiding a tab (`href: null` in `../_layout.tsx`) only removes
 * the button, it doesn't stop the route being reached directly.
 */
export default function ListingsTabRoute() {
  return (
    <RoleGuard require="seller">
      <MyListingsScreen />
    </RoleGuard>
  );
}
