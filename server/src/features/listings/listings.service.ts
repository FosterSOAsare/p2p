import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { Prisma } from "../../generated/prisma/client";

export interface ListQuery {
  search?: string;
  category?: string;
  condition?: string;
  maxPrice?: number;
  sort: "featured" | "newest" | "price_asc" | "price_desc";
  page: number;
  limit: number;
}

const cardInclude = {
  seller: { select: { username: true, kyc: { select: { status: true } } } },
  _count: { select: { reviews: true } },
} satisfies Prisma.ListingInclude;

type ListingWithSeller = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export async function list(params: ListQuery) {
  const where: Prisma.ListingWhereInput = {
    status: "active",
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

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    params.sort === "price_asc"
      ? { price: "asc" }
      : params.sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" }; // featured / newest

  const [total, rows] = await prisma.$transaction([
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
    listings: rows.map(toCard),
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function getById(id: string) {
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
    },
  });
  if (!listing) throw ApiError.notFound("Listing not found");

  // Best-effort view counter (not worth failing the request over)
  prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => undefined);

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
    createdAt: listing.createdAt.toISOString(),
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
  await assertOwnership(actor, listingId);
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
export async function mine(sellerId: string, params: { status?: "draft" | "active" | "out_of_stock"; page: number; limit: number }) {
  const where: Prisma.ListingWhereInput = { sellerId, ...(params.status && { status: params.status }) };
  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: cardInclude,
    }),
  ]);
  return {
    listings: rows.map((l) => ({ ...toCard(l), status: l.status, description: l.description })),
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

function toCard(l: ListingWithSeller) {
  return {
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
    reviewCount: l._count.reviews,
    createdAt: l.createdAt.toISOString(),
  };
}
