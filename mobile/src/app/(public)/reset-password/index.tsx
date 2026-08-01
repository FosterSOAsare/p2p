import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function ResetPasswordRoute() {
  return (
    <PlaceholderScreen
      title="Set new password"
      description="Choose a new password using the link sent to your email."
      webRoute="/reset-password"
      backLabel="Back to login"
    />
  );
}
