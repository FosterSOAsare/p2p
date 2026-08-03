import type { ListingRemovalReason } from "../../generated/prisma/client";

/**
 * Human wording for a takedown reason — one source of truth for the seller's
 * in-app notification and the email, so the two can never drift.
 */
export const REMOVAL_REASON_LABELS: Record<ListingRemovalReason, string> = {
  prohibited_item: "Prohibited or restricted item",
  duplicate: "Duplicate listing",
  misleading: "Misleading or inaccurate information",
  spam: "Spam or low-quality content",
  guidelines: "Violates community guidelines",
  fraud: "Fraudulent or suspicious activity",
  other: "Other",
};

export const REMOVAL_REASONS = Object.keys(REMOVAL_REASON_LABELS) as ListingRemovalReason[];

/** The note replaces the label for `other`, which is a placeholder on its own. */
export function removalReasonText(reason: ListingRemovalReason, note?: string | null): string {
  if (reason === "other") return note?.trim() || REMOVAL_REASON_LABELS.other;
  return REMOVAL_REASON_LABELS[reason];
}
