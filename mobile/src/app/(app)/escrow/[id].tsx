import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function EscrowDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Deal"
      description={`Deal ${id} — timeline, funding, delivery, release and disputes.`}
      webRoute="/escrow/:id"
      backLabel="Back to My Deals"
    />
  );
}
