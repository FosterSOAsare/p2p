import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function AdminKycRoute() {
  return (
    <PlaceholderScreen
      title="KYC Queue"
      description="Review and rule on pending vendor verifications."
      webRoute="/admin/kyc"
      backLabel="Back to admin"
    />
  );
}
