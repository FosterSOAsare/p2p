import { JoinDealScreen } from '@/features/escrow/ui/JoinDealScreen';

/**
 * Share-link / QR landing.
 *
 * Deliberately outside both `(app)` and `(public)`: those groups sit behind
 * opposite auth guards, so a route in either one is unreachable half the time.
 * An invite link has to open whether or not the recipient is signed in.
 */
export default function JoinDealRoute() {
  return <JoinDealScreen />;
}
