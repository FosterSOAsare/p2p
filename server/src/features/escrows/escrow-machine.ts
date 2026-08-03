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
    // No RELEASE here — the buyer can only confirm receipt once the seller has marked it delivered.
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
