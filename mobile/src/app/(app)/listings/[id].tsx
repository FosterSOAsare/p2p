import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function ListingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Listing"
      description={`Edit listing ${id} — price, stock, photos and status.`}
      webRoute="/listings/:id"
      backLabel="Back to listings"
    />
  );
}
