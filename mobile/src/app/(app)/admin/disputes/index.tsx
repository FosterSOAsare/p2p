import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function AdminDisputesRoute() {
  return (
    <PlaceholderScreen
      title="Disputes"
      description="Open disputes awaiting an admin ruling."
      webRoute="/admin/disputes"
      backLabel="Back to admin"
    />
  );
}
