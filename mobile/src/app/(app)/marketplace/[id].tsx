import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function ProductDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Listing"
      description={`Listing ${id} — photos, seller, price and the buy-with-escrow action.`}
      webRoute="/marketplace/:id"
      backLabel="Back to marketplace"
    />
  );
}
