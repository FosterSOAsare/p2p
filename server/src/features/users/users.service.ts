import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { publicUser } from "../auth/auth.service";
import type { PublicUser } from "../auth/auth.model";
import type { NotificationPrefsInput, SavedListingCard, UpdateProfileInput } from "./users.model";

// ---------- Profile ----------

export async function updateMe(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    },
  });
  return publicUser(user);
}

// ---------- Notification preferences (the two checkboxes in Settings) ----------

export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefsInput,
): Promise<NotificationPrefsInput> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailShipmentUpdates: prefs.emailShipmentUpdates,
      smsReleaseAlerts: prefs.smsReleaseAlerts,
    },
  });
  return {
    emailShipmentUpdates: user.emailShipmentUpdates,
    smsReleaseAlerts: user.smsReleaseAlerts,
  };
}

// ---------- Saved listings (marketplace bookmarks) ----------

export async function getSavedListings(userId: string): Promise<SavedListingCard[]> {
  const saved = await prisma.savedListing.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { seller: { select: { username: true } } },
      },
    },
  });

  return saved.map((s) => ({
    id: s.listing.id,
    title: s.listing.title,
    price: Number(s.listing.price),
    currency: s.listing.currency,
    category: s.listing.category,
    condition: s.listing.condition,
    status: s.listing.status,
    image: s.listing.images[0] ?? null,
    sellerUsername: s.listing.seller.username,
    savedAt: s.createdAt.toISOString(),
  }));
}

/** Idempotent — saving an already-saved listing is a no-op. */
export async function saveListing(userId: string, listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw ApiError.notFound("Listing not found");

  await prisma.savedListing.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });
}

/** Idempotent — unsaving something never saved is a no-op. */
export async function unsaveListing(userId: string, listingId: string): Promise<void> {
  await prisma.savedListing.deleteMany({ where: { userId, listingId } });
}
