import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { publicUser } from "../auth/auth.service";
import type { PublicUser } from "../auth/auth.model";
import type { NotificationPrefsInput, SavedListingCard, UpdateProfileInput } from "./users.model";

// ---------- Public seller profile ----------

/** Public view of a user — store identity, stats, and active listings. No email/legal name. */
export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { kyc: { select: { status: true, storeName: true, country: true } } },
  });
  if (!user || user.status === "suspended") throw ApiError.notFound("User not found");

  const verified = user.kyc?.status === "verified";
  const [listings, salesCompleted] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.escrow.count({ where: { sellerId: user.id, status: "disbursed" } }),
  ]);

  return {
    username: user.username,
    avatarUrl: user.avatarUrl,
    verified,
    storeName: verified ? (user.kyc?.storeName ?? null) : null,
    country: verified ? (user.kyc?.country ?? null) : null,
    joinedAt: user.createdAt.toISOString(),
    stats: {
      activeListings: listings.length,
      salesCompleted,
    },
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      short: l.description?.split("\n")[0] ?? "",
      price: Number(l.price),
      category: l.category,
      condition: l.condition,
      image: l.images[0] ?? null,
    })),
  };
}

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

// ---------- Vendor blocking ----------

export async function blockVendor(userId: string, username: string, reason: string) {
  const vendor = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!vendor) throw ApiError.notFound("User not found");
  if (vendor.id === userId) throw ApiError.badRequest("You can't block yourself");

  await prisma.vendorBlock.upsert({
    where: { userId_vendorId: { userId, vendorId: vendor.id } },
    create: { userId, vendorId: vendor.id, reason },
    update: { reason },
  });
}

export async function unblockVendor(userId: string, username: string) {
  const vendor = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!vendor) throw ApiError.notFound("User not found");
  await prisma.vendorBlock.deleteMany({ where: { userId, vendorId: vendor.id } });
}

export async function listBlockedVendors(userId: string) {
  const blocks = await prisma.vendorBlock.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { username: true, avatarUrl: true, kyc: { select: { storeName: true, status: true } } } },
    },
  });
  return blocks.map((b) => ({
    username: b.vendor.username,
    avatarUrl: b.vendor.avatarUrl,
    storeName: b.vendor.kyc?.status === "verified" ? b.vendor.kyc.storeName : null,
    reason: b.reason,
    blockedAt: b.createdAt.toISOString(),
  }));
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
