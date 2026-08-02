import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function MyListingsRoute() {
  return (
    <PlaceholderScreen
      title="My Listings"
      description="Your marketplace listings — drafts, active items, stock and views."
      webRoute="/listings"
      backLabel="Back"
    />
  );
}
