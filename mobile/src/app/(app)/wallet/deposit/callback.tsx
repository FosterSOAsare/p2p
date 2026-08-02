import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function PaymentCallbackRoute() {
  return (
    <PlaceholderScreen
      title="Confirming payment"
      description="Return leg from the hosted payment page — verifies the deposit."
      webRoute="/wallet/deposit/callback"
      backLabel="Back to wallet"
    />
  );
}
