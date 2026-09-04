/**
 * What the buyer was in the middle of when the hosted payment page took over.
 *
 * The deposit callback deep link (`veritrust://wallet/deposit/callback`) is a
 * real expo-router route, so when Paystack redirects back, Android opens the
 * app on that route — the screen that started the payment is no longer driving.
 * Without a record of the intent, the callback could only credit the wallet and
 * send the buyer to `/wallet`: the money arrived, the purchase never happened,
 * and nothing on screen explained why.
 *
 * So the intent is written down before the browser opens and completed by
 * whichever side gets control back. The web has always done this
 * (`web/src/features/escrow/data/paymentsApi.ts`); this is its counterpart.
 *
 * Held in memory rather than storage. It only has to survive the app being
 * backgrounded while the payment page is open, which does not clear module
 * state. If the process is killed outright the intent is lost — but the money
 * is not: the charge is credited by reference, so the buyer keeps the balance
 * and can buy again. Losing an intent costs a retry; a stale one written to
 * disk could buy something the buyer had given up on.
 */

export type PendingAction =
  | {
      kind: 'checkout';
      listingId: string;
      quantity: number;
      /** How the wallet was filled — recorded on the deal's funding event. */
      paymentMethod: 'momo' | 'card';
    }
  | { kind: 'fund'; escrowId: string };

let pending: PendingAction | null = null;

export const pendingAction = {
  save(action: PendingAction) {
    pending = action;
  },
  /** Reads and clears in one step — an intent must never be acted on twice. */
  take(): PendingAction | null {
    const held = pending;
    pending = null;
    return held;
  },
  peek(): PendingAction | null {
    return pending;
  },
  clear() {
    pending = null;
  },
};
