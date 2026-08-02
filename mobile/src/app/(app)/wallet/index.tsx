import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function WalletRoute() {
  return (
    <PlaceholderScreen
      title="Wallet"
      description="Balance, escrow-locked funds, deposits and withdrawals."
      webRoute="/wallet"
      backLabel="Back"
    />
  );
}
