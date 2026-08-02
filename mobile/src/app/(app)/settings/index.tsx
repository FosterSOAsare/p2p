import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function SettingsRoute() {
  return (
    <PlaceholderScreen
      title="Account Settings"
      description="Profile, notification preferences and blocked vendors."
      webRoute="/settings"
      backLabel="Back"
    />
  );
}
