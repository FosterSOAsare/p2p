import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function DashboardRoute() {
  return (
    <PlaceholderScreen
      title="Dashboard"
      description="Your role-aware overview — buyer orders, seller store or admin console."
      webRoute="/dashboard"
      backLabel="Back"
    />
  );
}
