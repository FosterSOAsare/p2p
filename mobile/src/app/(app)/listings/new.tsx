import { RoleGuard } from '@/features/shared/ui/RoleGuard';
import { ListingNewScreen } from '@/features/listings/ui/ListingNewScreen';

/** Seller-only, mirroring the web's `<Route element={<SellerGuard />}>` wrapper. */
export default function ListingNewRoute() {
  return (
    <RoleGuard require="seller">
      <ListingNewScreen />
    </RoleGuard>
  );
}
