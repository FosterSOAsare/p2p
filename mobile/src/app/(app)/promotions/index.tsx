import { RoleGuard } from '@/features/shared/ui/RoleGuard';
import { PromotionsScreen } from '@/features/seller/ui/PromotionsScreen';

/** Seller-only, mirroring the web's `<Route element={<SellerGuard />}>` wrapper. */
export default function PromotionsRoute() {
  return (
    <RoleGuard require="seller">
      <PromotionsScreen />
    </RoleGuard>
  );
}
