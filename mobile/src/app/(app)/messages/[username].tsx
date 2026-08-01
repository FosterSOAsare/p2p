import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function MessageThreadRoute() {
  const { username } = useLocalSearchParams<{ username: string }>();

  return (
    <PlaceholderScreen
      title="Messages"
      description={`Chat with @${username} — persists as dispute evidence.`}
      webRoute="/messages/:username"
      backLabel="Back"
    />
  );
}
