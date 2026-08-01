import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function SellerProfileRoute() {
  const { username } = useLocalSearchParams<{ username: string }>();

  return (
    <PlaceholderScreen
      title="Seller"
      description={`@${username} — store profile, rating and active listings.`}
      webRoute="/seller/:username"
      backLabel="Back"
    />
  );
}
