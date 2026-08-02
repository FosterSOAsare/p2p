import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function AdminRoute() {
  return (
    <PlaceholderScreen
      title="Admin Console"
      description="Platform stats and moderation entry point."
      webRoute="/admin"
      backLabel="Back"
    />
  );
}
