import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { publicUser } from "../auth/auth.service";
import type { PublicUser } from "../auth/auth.model";
import type { NotificationPrefsInput, SavedListingCard, UpdateProfileInput } from "./users.model";
import { feeMathP, toPesewas, fromPesewas } from "../escrows/money";

// ---------- Counterparty search ----------

/** One suggestion for the escrow counterparty picker. */
export interface CounterpartyMatch {
  username: string;
  avatarUrl: string | null;
  storeName: string | null;
  /** KYC-verified — the badge the picker shows, same meaning as elsewhere. */
  verified: boolean;
}

/**
 * Usernames that may be invited to an escrow deal, for the counterparty picker.
 *
 * Deliberately narrow about who appears. Three exclusions, each for a different
 * reason:
 *
 * - **admins** — an admin rules on disputes; putting one on the other side of a
 *   deal makes them a party to a case they may later have to judge. They also
 *   bypass `requireSeller`, so an admin suggested here reads as an ordinary
 *   trader when they are not.
 * - **the caller** — `createStandalone` rejects self-dealing, so suggesting
 *   yourself only offers a choice that cannot be taken.
 * - **suspended accounts** — they cannot transact, so an invite would strand
 *   the deal on a side that can never fill.
 *
 * Matches on username or store name so a seller can be found by the name on
 * their shopfront rather than only by handle. Prefix matches rank first: typing
 * "kwa" should surface `kwame` before `akwasi`.
 */
export async function searchCounterparties(actorId: string, query: string): Promise<CounterpartyMatch[]> {
  const q = query.replace(/^@/, "").trim();
  // One character matches most of the table and helps nobody choose.
  if (q.length < 2) return [];

  const rows = await prisma.user.findMany({
    where: {
      id: { not: actorId },
      role: { not: "admin" },
      status: { not: "suspended" },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { kyc: { storeName: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      username: true,
      avatarUrl: true,
      kyc: { select: { status: true, storeName: true } },
    },
    // A stable secondary sort, so equal-ranked rows don't reshuffle between
    // keystrokes — the list jumping under a moving finger is its own bug.
    orderBy: { username: "asc" },
    take: 20,
  });

  const lower = q.toLowerCase();
  return rows
    .map((u) => ({
      username: u.username,
      avatarUrl: u.avatarUrl,
      storeName: u.kyc?.storeName ?? null,
      verified: u.kyc?.status === "verified",
    }))
    .sort((a, b) => {
      const aPrefix = a.username.toLowerCase().startsWith(lower) ? 0 : 1;
      const bPrefix = b.username.toLowerCase().startsWith(lower) ? 0 : 1;
      return aPrefix - bPrefix || a.username.localeCompare(b.username);
    })
    .slice(0, 8);
}

// ---------- Public seller profile ----------

/** Public view of a user — store identity, stats, and active listings. No email/legal name. */
export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { kyc: { select: { status: true, storeName: true, country: true } } },
  });
  if (!user || user.status === "suspended") throw ApiError.notFound("User not found");

  const verified = user.kyc?.status === "verified";
  // This is the *seller* storefront (`/seller/:username`). A plain buyer has no
  // store to show, so don't serve an empty one — 404 and let the client decide
  // not to link there in the first place.
  if (!verified) throw ApiError.notFound("Seller not found");
  const [listings, salesCompleted, ratingAgg] = await Promise.all([
    prisma.listing.findMany({
      // Same rule as the marketplace grid — the storefront is a shopfront too.
      where: { sellerId: user.id, status: "active", quantity: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.escrow.count({ where: { sellerId: user.id, status: "disbursed" } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true, where: { revieweeId: user.id } }),
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
      rating: ratingAgg._avg.rating ?? null,
      reviewCount: ratingAgg._count,
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

// ---------- Unified User & Seller Dashboard ----------

/**
 * The home screen for every persona, in **one** batch of queries.
 *
 * It used to be three round trips deep: the user row, then ten aggregates, then
 * the pending-clearance list — each waiting on the one before for no reason.
 * Nothing in the batch reads the user row (they all key off `userId`, which the
 * verified token supplies), and `isVerifiedSeller` only shapes the response at
 * the end. On a database ~230ms away, that ordering was two thirds of the wait
 * on the first screen anyone sees.
 *
 * The 24-hour clearance window is computed here rather than inside the query
 * builder below purely so the whole array can be constructed in one go.
 */
export async function getDashboard(userId: string) {
  // Admin-resolved disputes skip the 24h hold — those funds were released by
  // ruling and clear straight to available balance.
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    user,
    buyerActiveCount,
    buyerLockedSum,
    buyerSpentSum,
    savedItemsCount,
    recentOrders,
    sellerRatingAgg,
    sellerEarningsSum,
    sellerLockedSum,
    salesOrders,
    sellerListings,
    pendingClearanceDeals,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        kyc: { select: { status: true, storeName: true, country: true } },
        wallets: true,
      },
    }),
    prisma.escrow.count({
      where: { buyerId: userId, status: { in: ["created", "funded", "delivered", "disputed"] } },
    }),
    prisma.escrow.aggregate({
      _sum: { amount: true },
      where: { buyerId: userId, status: { in: ["created", "funded", "delivered", "disputed"] } },
    }),
    prisma.escrow.aggregate({
      _sum: { amount: true },
      where: { buyerId: userId, status: "disbursed" },
    }),
    prisma.savedListing.count({ where: { userId } }),
    prisma.escrow.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        seller: { select: { username: true } },
        listing: { select: { images: true, title: true } },
      },
    }),
    prisma.review.aggregate({
      _avg: { rating: true },
      _count: true,
      where: { revieweeId: userId },
    }),
    prisma.escrow.aggregate({
      _sum: { amount: true },
      where: { sellerId: userId, status: "disbursed" },
    }),
    prisma.escrow.aggregate({
      _sum: { amount: true },
      where: { sellerId: userId, status: { in: ["created", "funded", "delivered", "disputed"] } },
    }),
    prisma.escrow.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        buyer: { select: { username: true } },
        listing: { select: { images: true, title: true } },
      },
    }),
    prisma.listing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // No clearance hold is withheld from this any more (see wallet.service
  // getWallet) — a released payout is available at once, so the dashboard's
  // payout figure is just the GHS wallet. The field keeps its name because the
  // web and mobile dashboards both read it.
  const ghsWallet = user.wallets.find((w) => w.currency === "GHS");
  const availablePayoutBalance = ghsWallet ? Number(ghsWallet.balance) : 0;

  const profile = {
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
    joinedDate: user.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    isKycVerified: isVerifiedSeller,
    kycStatus: user.kyc?.status ?? "unverified",
  };

  const buyerData = {
    stats: {
      activeOrdersCount: buyerActiveCount,
      escrowLockedBalance: Number(buyerLockedSum._sum.amount ?? 0),
      totalSpent: Number(buyerSpentSum._sum.amount ?? 0),
      savedItemsCount,
    },
    recentOrders: recentOrders.map((ord) => ({
      id: ord.id,
      code: ord.code,
      status: ord.status,
      orderDate: ord.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      vendorName: ord.seller?.username ?? ord.invitedUsername ?? "Seller",
      title: ord.title,
      price: Number(ord.amount),
      currency: ord.currency,
      imageUrl: ord.listing?.images[0] ?? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
      productId: ord.listingId ?? undefined,
      trackingCode: ord.trackingNumber ?? undefined,
      shippingCarrier: ord.carrier ?? undefined,
    })),
  };

  const sellerData = {
    stats: {
      storeName: user.kyc?.storeName ?? `${user.username}'s Store`,
      storeHandle: user.username,
      rating: sellerRatingAgg._avg.rating ? Number(sellerRatingAgg._avg.rating.toFixed(1)) : 5.0,
      reviewCount: sellerRatingAgg._count,
      totalEarnings: Number(sellerEarningsSum._sum.amount ?? 0),
      escrowLockedBalance: Number(sellerLockedSum._sum.amount ?? 0),
      availablePayoutBalance,
      actionRequiredCount: salesOrders.filter((o) => o.status === "funded").length,
    },
    salesOrders: salesOrders.map((ord) => ({
      id: ord.id,
      code: ord.code,
      status:
        ord.status === "funded"
          ? "awaiting_shipment"
          : ord.status === "delivered"
          ? "shipped"
          : ord.status === "disbursed"
          ? "released"
          : ord.status,
      rawStatus: ord.status,
      buyerUsername: ord.buyer?.username ?? "Buyer",
      date: ord.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      title: ord.title,
      amount: Number(ord.amount),
      currency: ord.currency,
      carrier: ord.carrier ?? undefined,
      trackingNumber: ord.trackingNumber ?? undefined,
    })),
    listings: sellerListings.map((l) => ({
      id: l.id,
      title: l.title,
      price: Number(l.price),
      currency: l.currency,
      category: l.category,
      stock: l.quantity,
      views: l.views,
      imageUrl: l.images[0] ?? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
      status: l.status,
    })),
  };

  return {
    persona: isVerifiedSeller ? ("seller" as const) : ("buyer" as const),
    profile,
    buyer: buyerData,
    seller: sellerData,
  };
}

