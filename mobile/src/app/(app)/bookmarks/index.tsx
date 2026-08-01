import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function BookmarksRoute() {
  return (
    <PlaceholderScreen
      title="Saved Listings"
      description="Listings you have bookmarked from the marketplace."
      webRoute="/bookmarks"
      backLabel="Back"
    />
  );
}
