import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function AdminKycDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="KYC Review"
      description={`Submission ${id} — documents, store details, approve or reject.`}
      webRoute="/admin/kyc/:id"
      backLabel="Back to KYC queue"
    />
  );
}
