import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function ListingNewRoute() {
  return (
    <PlaceholderScreen
      title="New Listing"
      description="Create a marketplace listing with photos, price and stock."
      webRoute="/listings/new"
      backLabel="Back to listings"
    />
  );
}
