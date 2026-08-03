/** DTOs for the users feature (profile & settings). */

import type { ListingStatus } from "../../generated/prisma/client";

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface NotificationPrefsInput {
  emailShipmentUpdates: boolean;
  smsReleaseAlerts: boolean;
}

/** Card shape for the saved-listings list (matches what the marketplace grid renders). */
export interface SavedListingCard {
  id: string;
  title: string;
  price: number;
  currency: "GHS" | "TRX";
  category: string;
  condition: string | null;
  status: ListingStatus;
  image: string | null;
  sellerUsername: string;
  savedAt: string;
}
