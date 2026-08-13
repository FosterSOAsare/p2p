import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { ListingRemovalReason, Prisma } from "../../generated/prisma/client";
import { removalReasonText } from "./removal-reasons";
import { notifyAdmins } from "../notifications/notifications.service";
import { mailer } from "../../shared/mail/mail.service";

export interface ListQuery {
  search?: string;
  category?: string;
  condition?: string;
  maxPrice?: number;
  sort: "featured" | "newest" | "price_asc" | "price_desc" | "rating";
  page: number;
  limit: number;
}

const cardInclude = {
  seller: { select: { username: true, kyc: { select: { status: true } } } },
  reviews: { select: { rating: true } },
} satisfies Prisma.ListingInclude;

type ListingWithSeller = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export async function list(params: ListQuery) {
  const where: Prisma.ListingWhereInput = {
    status: "active",
    // Belt and braces alongside the status flip: checkout marks a listing
    // `out_of_stock` the moment its last unit goes, but a seller can set the
    // status back to active without restocking. Nothing unbuyable reaches the
    // shopfront either way.
    quantity: { gt: 0 },
    ...(params.category && { category: params.category }),
    ...(params.condition && { condition: params.condition }),
    ...(params.maxPrice && { price: { lte: params.maxPrice } }),
    ...(params.search && {
      OR: [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { seller: { username: { contains: params.search.replace(/^@/, ""), mode: "insensitive" } } },
      ],
    }),
  };

  // Rating sort: Prisma can't order by a related aggregate (avg rating), so rank
  // the matching set in memory then paginate. Fine at marketplace scale.
  if (params.sort === "rating") {
    const rows = await prisma.listing.findMany({ where, include: cardInclude });
    const cards = rows
      .map((l) => toCard(l))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount);
    const start = (params.page - 1) * params.limit;
    return {
      listings: cards.slice(start, start + params.limit),
      total: cards.length,
      page: params.page,
      pages: Math.max(1, Math.ceil(cards.length / params.limit)),
    };
  }

  // Featured = what sellers pay for. Live spotlights are pinned above the
  // organic feed, ranked by the priority they bought; everything else falls
  // through to newest-first. Only `featured` is for sale — an explicit
  // price/newest/rating sort is the shopper's instruction and isn't overridden.
  if (params.sort === "featured") {
    return listFeatured(where, params);
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    params.sort === "price_asc"
      ? { price: "asc" }
      : params.sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" }; // newest

  // Concurrent, not transactional. Wrapping the pair in a transaction would buy
  // a consistent count-and-rows snapshot — except Postgres defaults to READ
  // COMMITTED, where each statement takes its own snapshot anyway, so it never
  // delivered that. What it did cost is four sequential round trips (BEGIN, the
  // two queries, COMMIT) against a database ~600ms away: ~1.6s versus ~0.4s
  // here, and P2028 timeouts the moment two shoppers browsed at once.
  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: cardInclude,
    }),
  ]);

  return {
    listings: rows.map((l) => toCard(l)),
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

/**
 * The featured feed: paid spotlights first (highest priority wins, oldest run
 * breaking a tie), then the organic newest-first feed with those same listings
 * removed so nothing appears twice.
 *
 * Paginating across two ordered blocks means slicing the promoted ids by hand
 * and offsetting the organic query by whatever is left over.
 */
async function listFeatured(where: Prisma.ListingWhereInput, params: ListQuery) {
  const live = await prisma.promotion.findMany({
    where: { status: "active", endsAt: { gt: new Date() }, listing: where },
    orderBy: [{ priority: "desc" }, { startsAt: "asc" }],
    select: { listingId: true },
  });
  // One listing can only hold one live run, but dedupe anyway so a stray
  // duplicate can't shorten a page.
  const promotedIds = [...new Set(live.map((p) => p.listingId))];
  const promotedSet = new Set(promotedIds);

  const skip = (params.page - 1) * params.limit;
  const promotedPage = promotedIds.slice(skip, skip + params.limit);
  const organicTake = params.limit - promotedPage.length;
  const organicSkip = Math.max(0, skip - promotedIds.length);

  const [total, promotedRows, organicRows] = await Promise.all([
    prisma.listing.count({ where }),
    promotedPage.length
      ? prisma.listing.findMany({ where: { ...where, id: { in: promotedPage } }, include: cardInclude })
      : Promise.resolve([]),
    organicTake > 0
      ? prisma.listing.findMany({
          where: { ...where, id: { notIn: promotedIds } },
          orderBy: { createdAt: "desc" },
          skip: organicSkip,
          take: organicTake,
          include: cardInclude,
        })
      : Promise.resolve([]),
  ]);

  // `in` doesn't preserve order — restore the priority ranking.
  const byId = new Map(promotedRows.map((l) => [l.id, l]));
  const ordered = promotedPage.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });

  return {
    listings: [...ordered, ...organicRows].map((l) => toCard(l, promotedSet.has(l.id))),
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function getById(id: string, viewer?: { id: string; role: "user" | "admin" }) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          username: true,
          avatarUrl: true,
          createdAt: true,
          kyc: { select: { status: true, storeName: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { username: true } } },
      },
      disputes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!listing) throw ApiError.notFound("Listing not found");
  // A removed listing is gone as far as the marketplace is concerned; the row
  // only survives so deals that reference it keep their history. The owner (and
  // admins) still see it — that's how a seller corrects it to appeal.
  const isOwnerOrAdmin = viewer && (viewer.role === "admin" || viewer.id === listing.sellerId);
  if (listing.status === "removed" && !isOwnerOrAdmin) throw ApiError.notFound("Listing not found");

  // Best-effort view counter — awaited so it doesn't race another query on the
  // same pg connection (fire-and-forget triggers pg's concurrent-query warning).
  await prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => undefined);

  // Whether *this* viewer already flagged it. Server-side so the button's state
  // survives a reload — it used to be component state, which forgot on refresh.
  const reported = viewer
    ? (await prisma.listingReport.findUnique({
        where: { listingId_reporterId: { listingId: id, reporterId: viewer.id } },
        select: { id: true },
      })) !== null
    : false;

  const ratings = listing.reviews.map((r) => r.rating);
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    currency: listing.currency,
    category: listing.category,
    condition: listing.condition,
    quantity: listing.quantity,
    images: listing.images,
    location: listing.location,
    status: listing.status,
    views: listing.views,
    reported,
    createdAt: listing.createdAt.toISOString(),
    // Takedown context — only meaningful to the owner/admin viewing a removed listing.
    removal:
      listing.status === "removed" && listing.removalReason
        ? {
            reasonText: removalReasonText(listing.removalReason, listing.removalNote),
            disputeAllowed: listing.disputeAllowed,
            dispute: listing.disputes[0]
              ? {
                  id: listing.disputes[0].id,
                  status: listing.disputes[0].status,
                  explanation: listing.disputes[0].explanation,
                  reviewNote: listing.disputes[0].reviewNote,
                  createdAt: listing.disputes[0].createdAt.toISOString(),
                }
              : null,
          }
        : null,
    seller: {
      username: listing.seller.username,
      avatarUrl: listing.seller.avatarUrl,
      storeName: listing.seller.kyc?.storeName ?? null,
      verified: listing.seller.kyc?.status === "verified",
      joinedAt: listing.seller.createdAt.toISOString(),
    },
    rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    reviewCount: listing.reviews.length,
    reviews: listing.reviews.map((r) => ({
      id: r.id,
      reviewer: r.reviewer.username,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

// ---------- Seller CRUD (requireSeller-gated; owner-or-admin on mutations) ----------

export interface ListingInput {
  title?: string;
  description?: string | null;
  price?: number;
  category?: string;
  condition?: string | null;
  quantity?: number;
  images?: string[];
  location?: string | null;
  status?: "draft" | "active" | "out_of_stock";
}

type Actor = { id: string; role: "user" | "admin" };

/** Sellers manage only their own listings; admins can manage any. */
async function assertOwnership(actor: Actor, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw ApiError.notFound("Listing not found");
  if (actor.role !== "admin" && listing.sellerId !== actor.id) {
    throw ApiError.forbidden("You can only manage your own listings");
  }
  return listing;
}

export async function create(sellerId: string, input: ListingInput) {
  const listing = await prisma.listing.create({
    data: {
      sellerId,
      title: input.title!,
      description: input.description || null,
      price: input.price!,
      currency: "GHS", // marketplace is fiat-only
      category: input.category!,
      condition: input.condition || null,
      quantity: input.quantity ?? 1,
      images: input.images ?? [],
      location: input.location || null,
      status: input.status === "draft" ? "draft" : "active",
    },
    include: cardInclude,
  });
  return toCard(listing);
}

export async function update(actor: Actor, listingId: string, input: ListingInput) {
  const existing = await assertOwnership(actor, listingId);

  // A removed listing is frozen. The seller can still read it and, where the
  // takedown allows, appeal it — but not change it. Editing under moderation
  // would mean an admin rules on content that has since moved, and it's what
  // let a seller quietly un-remove themselves.
  if (existing.status === "removed" && actor.role !== "admin") {
    throw ApiError.forbidden("This listing was removed and can't be edited");
  }

  // Activating a sold-out listing without restocking would produce a row the
  // marketplace filters out anyway, leaving the seller staring at a listing
  // they think is live. Fail loudly instead of hiding it.
  const nextQuantity = input.quantity ?? existing.quantity;
  if (input.status === "active" && nextQuantity < 1) {
    throw ApiError.badRequest("Add stock before setting this listing active");
  }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.condition !== undefined && { condition: input.condition || null }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.images !== undefined && { images: input.images }),
      ...(input.location !== undefined && { location: input.location || null }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: cardInclude,
  });
  return toCard(listing);
}

export async function remove(actor: Actor, listingId: string) {
  await assertOwnership(actor, listingId);
  await prisma.listing.delete({ where: { id: listingId } }).catch((err: unknown) => {
    // FK restraint: listings referenced by escrow deals can't be hard-deleted
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2003") {
      throw ApiError.conflict("This listing has escrow deals attached — mark it out of stock instead");
    }
    throw err;
  });
}

/** The seller's own listings (any status) for the management page — paginated. */
export async function mine(
  sellerId: string,
  params: { status?: "draft" | "active" | "out_of_stock" | "removed"; page: number; limit: number },
) {
  const where: Prisma.ListingWhereInput = { sellerId, ...(params.status && { status: params.status }) };
  // Concurrent, not transactional — see the note in list().
  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { ...cardInclude, disputes: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);
  return {
    listings: rows.map((l) => ({
      ...toCard(l),
      status: l.status,
      description: l.description,
      // Present only on admin-removed listings, so the seller sees why.
      removalReason: l.removedAt && l.removalReason ? removalReasonText(l.removalReason, l.removalNote) : null,
      disputeAllowed: l.disputeAllowed,
      disputeStatus: l.disputes[0]?.status ?? null,
    })),
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { position: "asc" },
    select: { id: true, name: true, slug: true, icon: true },
  });
}

function toCard(l: ListingWithSeller, promoted = false) {
  return {
    promoted,
    id: l.id,
    title: l.title,
    short: l.description?.split("\n")[0] ?? "",
    price: Number(l.price),
    currency: l.currency,
    category: l.category,
    condition: l.condition,
    quantity: l.quantity,
    image: l.images[0] ?? null,
    location: l.location,
    views: l.views,
    sellerUsername: l.seller.username,
    sellerVerified: l.seller.kyc?.status === "verified",
    rating: (() => {
      const ratings = l.reviews.map((r) => r.rating);
      return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    })(),
    reviewCount: l.reviews.length,
    createdAt: l.createdAt.toISOString(),
  };
}

// ---------- Seller appeals against a takedown ----------

/**
 * Open a dispute on a removed listing. Only the owner, only when the admin
 * allowed appeals, and only one open dispute at a time.
 *
 * It's an argument, not a resubmission: the listing is frozen at removal, so
 * the admin rules on exactly what they took down. A seller who wants to sell a
 * corrected version creates a new listing.
 */
export async function submitDispute(
  sellerId: string,
  listingId: string,
  input: { explanation: string },
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, status: true, sellerId: true, disputeAllowed: true, removedById: true },
  });
  if (!listing) throw ApiError.notFound("Listing not found");
  if (listing.sellerId !== sellerId) throw ApiError.forbidden("This isn't your listing");
  if (listing.status !== "removed") throw ApiError.badRequest("Only removed listings can be disputed");
  if (!listing.disputeAllowed) throw ApiError.forbidden("This removal can't be disputed");

  const existing = await prisma.listingDispute.findFirst({
    where: { listingId, status: "open" },
    select: { id: true },
  });
  if (existing) throw ApiError.conflict("A dispute for this listing is already under review");

  const dispute = await prisma.listingDispute.create({
    data: {
      listingId,
      sellerId,
      explanation: input.explanation.trim(),
    },
  });

  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { username: true } });
  const sellerName = seller?.username ?? "A seller";

  // Every admin, not just the one who removed it: the review queue can't stall
  // because that person is away — and a listing removed before removedById was
  // set would otherwise reach nobody at all.
  void notifyAdmins({
    category: "listing",
    title: "New listing appeal",
    body: `@${sellerName} is disputing the removal of "${listing.title}".`,
    link: "/admin/listings",
  });

  // Email still goes to the admin who removed it — they hold the context.
  if (listing.removedById) {
    prisma.user
      .findUnique({ where: { id: listing.removedById }, select: { email: true, fullName: true } })
      .then(
        (admin) =>
          admin &&
          mailer.listingDisputeSubmitted(
            admin.email,
            admin.fullName,
            listing.title,
            seller?.username ?? "a seller",
            input.explanation.trim(),
          ),
      )
      .catch(() => undefined);
  }

  return {
    id: dispute.id,
    status: dispute.status,
    explanation: dispute.explanation,
    createdAt: dispute.createdAt.toISOString(),
  };
}

// ---------- Buyer reports against a live listing ----------

/**
 * Flag a listing for moderation. Any signed-in user, once per listing.
 *
 * The cap is the unique index rather than a rate limiter: a second report from
 * the same person adds no information an admin can act on, and "one voice per
 * user" is what makes the per-listing tally on the admin queue mean something.
 */
export async function submitReport(
  reporterId: string,
  listingId: string,
  input: { reason: ListingRemovalReason; note?: string | null },
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, status: true, sellerId: true },
  });
  if (!listing) throw ApiError.notFound("Listing not found");
  if (listing.sellerId === reporterId) throw ApiError.badRequest("You can't report your own listing");
  if (listing.status === "removed") throw ApiError.conflict("This listing has already been removed");

  const note = input.note?.trim() || null;

  // Let the unique index be the check — a pre-read would still race two
  // concurrent submissions, and P2002 says exactly what happened.
  const report = await prisma.listingReport
    .create({ data: { listingId, reporterId, reason: input.reason, note } })
    .catch((err: unknown) => {
      if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
        throw ApiError.conflict("You've already reported this listing");
      }
      throw err;
    });

  const reporter = await prisma.user.findUnique({ where: { id: reporterId }, select: { username: true } });

  // Every admin: the queue is worked by whoever is on, and there's no acting
  // admin here to own it the way a takedown has one. No email either — a report
  // is a signal, not a decision anyone has to answer within the hour.
  void notifyAdmins({
    category: "listing",
    title: "Listing reported",
    body: `@${reporter?.username ?? "someone"} reported "${listing.title}" — ${removalReasonText(input.reason, note)}`,
    link: "/admin/reports",
  });

  return {
    id: report.id,
    reason: report.reason,
    note: report.note,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}
