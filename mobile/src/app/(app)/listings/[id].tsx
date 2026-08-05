import { RoleGuard } from '@/features/shared/ui/RoleGuard';
import { ListingEditScreen } from '@/features/listings/ui/ListingEditScreen';

/** Seller-only, mirroring the web's `<Route element={<SellerGuard />}>` wrapper. */
export default function ListingDetailRoute() {
  return (
    <RoleGuard require="seller">
      <ListingEditScreen />
    </RoleGuard>
  );
}
