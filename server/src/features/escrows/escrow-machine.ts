import type { EscrowStatus } from "../../generated/prisma/client";

/**
 * State machine — ported from TaaS escrow-machine.ts, collapsed to the
 * proposal's lifecycle: created → funded → delivered → disbursed | disputed,
 * plus `cancelled` for a funded order the seller pulls out of (its own status
 * rather than a flag on `disbursed`, so cancelled deals stay filterable).
 *
 * escrowsService.transition() is the ONLY code allowed to mutate escrow.status,
 * and it consults this table. Note `disputed` has no auto-release/EXPIRE row —
 * that absence IS the dispute freeze: a stale auto-release firing against a
 * disputed deal finds no legal transition and no-ops.
 */

export type EscrowEvent =
  | "FUND"
  | "DELIVER"
  | "RELEASE"
  | "CANCEL"
  | "DISPUTE"
  | "RESOLVE_RELEASE"
  | "RESOLVE_REFUND"
  | "RESOLVE_PARTIAL";

export type ActorRole = "buyer" | "seller" | "system";

interface TransitionDef {
  to: EscrowStatus;
  allow: ActorRole[];
}

export const TRANSITIONS: Partial<Record<EscrowStatus, Partial<Record<EscrowEvent, TransitionDef>>>> = {
  created: {
    FUND: { to: "funded", allow: ["buyer", "system"] }, // system = crypto watcher confirming a TRX deposit
    // Nothing has been debited yet, so either party can walk away — same rule as
    // updateDeal, which already lets any party rewrite terms while `created`.
    // Clears a stale invite the counterparty never accepted.
    CANCEL: { to: "cancelled", allow: ["buyer", "seller"] },
  },
  funded: {
    DELIVER: { to: "delivered", allow: ["seller"] },
    /*
      The buyer may confirm receipt without the seller having marked delivery.

      This used to be absent, on the reasoning that receipt can only follow
      dispatch. In practice the seller's status update is bookkeeping the buyer
      does not control: sellers forget it, skip it, or hand the item over in
      person and never touch the app. The buyer holding the goods is the fact
      that matters, and refusing to let them say so leaves the money stuck with
      nothing wrong except an unticked box.

      Deliberately `buyer` only, NOT `system`. The auto-release timer exists so
      an unresponsive buyer cannot strand a seller's money *after* dispatch, and
      `sweepAutoRelease` filters on `status: "delivered"` for exactly that
      reason. Letting the timer fire here would release funds for something no
      one ever claimed to have sent.
    */
    RELEASE: { to: "disbursed", allow: ["buyer"] },
    // The seller can back out while nothing has shipped: full refund, no fee, stock restored.
    // Not offered on `delivered` — once it's out the door, it's release-or-dispute.
    CANCEL: { to: "cancelled", allow: ["seller"] },
    DISPUTE: { to: "disputed", allow: ["buyer", "seller"] },
  },
  delivered: {
    RELEASE: { to: "disbursed", allow: ["buyer", "system"] }, // system = auto-release timer
    DISPUTE: { to: "disputed", allow: ["buyer", "seller"] },
  },
  disputed: {
    // Admin rulings, executed as the system after a Dispute is decided.
    RESOLVE_RELEASE: { to: "disbursed", allow: ["system"] },
    RESOLVE_REFUND: { to: "disbursed", allow: ["system"] },
    RESOLVE_PARTIAL: { to: "disbursed", allow: ["system"] },
  },
};

export function lookupTransition(from: EscrowStatus, event: EscrowEvent): TransitionDef | undefined {
  return TRANSITIONS[from]?.[event];
}
