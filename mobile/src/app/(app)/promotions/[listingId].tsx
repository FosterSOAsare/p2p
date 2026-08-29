import { RoleGuard } from '@/features/shared/ui/RoleGuard';
import { PromotionDetailScreen } from '@/features/seller/ui/PromotionDetailScreen';

/** Seller-only, mirroring the web's `<Route element={<SellerGuard />}>` wrapper. */
export default function PromotionDetailRoute() {
  return (
    <RoleGuard require="seller">
      <PromotionDetailScreen />
    </RoleGuard>
  );
}
