import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { Prisma, Promotion, PromotionPlan, PromotionStatus } from "../../generated/prisma/client";
import { fromPesewas, toPesewas } from "../escrows/money";
import * as walletService from "../wallet/wallet.service";
import { notify } from "../notifications/notifications.service";
import {
  MAX_PRIORITY,
  endDate,
  planFromId,
  planMs,
  planSpec,
  priceList,
  priceP,
} from "./promotion-pricing";

/**
 * Paid listing spotlights.
 *
 * Same rail as escrow funding: the charge is always a guarded wallet debit
 * inside the transaction that writes the promotion, so a short balance rolls the
 * whole thing back and the seller tops up (Paystack) before retrying. Nothing
 * here ever takes a price from the client — see promotion-pricing.ts.
 */

type Tx = Prisma.TransactionClient;

/**
 * Flip any run whose clock ran out. Lazy rather than a cron: the `status,endsAt`
 * index makes it cheap, and it runs before every read so nobody ever sees a
 * promotion that is `active` on paper and finished in fact.
 */
async function sweepExpired() {
  await prisma.promotion.updateMany({
    where: { status: "active", endsAt: { lte: new Date() } },
    data: { status: "expired", remainingSeconds: 0 },
  });
}

function serialize(p: Promotion & { listing?: { title: string; images: string[]; category: string } | null }) {
  const spec = planSpec(p.plan);
  return {
    id: p.id,
    listingId: p.listingId,
    listingTitle: p.listing?.title ?? "",
    listingImage: p.listing?.images[0] ?? null,
    category: p.listing?.category ?? "",
    status: p.status,
    planId: spec.id,
    planLabel: spec.label,
    priority: p.priority,
    amount: Number(p.amount),
    currency: "GHS" as const,
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type SerializedPromotion = ReturnType<typeof serialize>;

const withListing = { listing: { select: { title: true, images: true, category: true } } };

/**
 * The seller's own promotions, newest first. `status` narrows the page, and
 * "live" is the active-or-paused pair the studio manages — the hub asks for it
 * because a seller with a long history of finished runs would otherwise push
 * their own running campaigns off the first page and out of the managed list.
 */
export async function listMine(userId: string, page: number, limit: number, status?: string) {
  await sweepExpired();
  const where: Prisma.PromotionWhereInput = {
    sellerId: userId,
    ...(status === "live"
      ? { status: { in: ["active", "paused"] } }
      : status
        ? { status: status as PromotionStatus }
        : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.promotion.count({ where }),
    prisma.promotion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: withListing,
    }),
  ]);
  return {
    promotions: rows.map(serialize),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** What an amendment does to the term, and what it costs. */
export type ChangeMode =
  /** No live run — buying a term outright. */
  | "new"
  /** Same plan, different rank — pay the price difference, term untouched. */
  | "priority"
  /** Different plan — buy that term and stack it on the time already paid for. */
  | "extend";

interface PlanChange {
  mode: ChangeMode;
  /** Price of the chosen plan at the chosen rank. */
  totalP: number;
  /** What the wallet is debited now. */
  chargeP: number;
  startsAt: Date;
  endsAt: Date;
  /** Days this adds to the run — 0 for a priority-only change. */
  addedDays: number;
}

/** Time left on a run, in ms: banked while paused, clock-derived while active. */
function remainingMsOf(existing: Promotion, now: Date): number {
  if (existing.status === "paused") return Math.max(0, existing.remainingSeconds ?? 0) * 1000;
  return Math.max(0, (existing.endsAt?.getTime() ?? now.getTime()) - now.getTime());
}

/**
 * The amendment rule, in one place because `quote` and `launch` must agree to
 * the pesewa.
 *
 * The invariant is that a change can never take away time the seller already
 * paid for. Recomputing the end date from the original start — the obvious
 * implementation — silently deletes it: shortening a 30-day run that's 12 days
 * old lands `endsAt` in the past and the campaign dies on the next sweep.
 *
 * So a plan change buys a *new* term and stacks it on whatever is left, at that
 * plan's full price. Changing only the rank is the cheap case: the term is
 * untouched and the seller pays the difference in price, nothing more.
 */
function planChange(
  existing: Promotion | null,
  plan: PromotionPlan,
  priority: number,
  now: Date,
): PlanChange {
  const totalP = priceP(plan, priority);

  if (!existing) {
    return { mode: "new", totalP, chargeP: totalP, startsAt: now, endsAt: endDate(plan, now), addedDays: planSpec(plan).days };
  }

  const remainingMs = remainingMsOf(existing, now);

  if (existing.plan === plan) {
    return {
      mode: "priority",
      totalP,
      // Never negative: dropping the rank costs nothing and refunds nothing.
      chargeP: Math.max(0, totalP - priceP(existing.plan, existing.priority)),
      startsAt: existing.startsAt,
      endsAt: new Date(now.getTime() + remainingMs),
      addedDays: 0,
    };
  }

  return {
    mode: "extend",
    totalP,
    chargeP: totalP,
    startsAt: existing.startsAt,
    endsAt: new Date(now.getTime() + planMs(plan) + remainingMs),
    addedDays: planSpec(plan).days,
  };
}

async function ownedPromotion(id: string, userId: string) {
  const promotion = await prisma.promotion.findUnique({ where: { id }, include: withListing });
  if (!promotion || promotion.sellerId !== userId) throw ApiError.notFound("Promotion not found");
  return promotion;
}

/**
 * What launching (or amending) would cost right now, without charging. The
 * studio calls this so the quoted total and the debit are computed by the same
 * code — a preview that can disagree with the charge is worse than no preview.
 */
export async function quote(userId: string, listingId: string, planId: string, priority: number) {
  const plan = requirePlan(planId);
  requirePriority(priority);
  // Deliberately lenient about the listing's status: the studio reads the live
  // run out of this response, so refusing to quote a listing that has gone
  // out_of_stock would leave the seller's running campaign with no pause or
  // cancel controls on the very page that manages it. `launch` still insists.
  const listing = await requireOwnListing(listingId, userId, { mustBeActive: false });
  const now = new Date();
  // The studio needs the live run's id and status to draw its pause/resume/cancel
  // controls, and it needs the price for the same slider position — one request
  // for both keeps the two from disagreeing mid-render.
  //
  // No `sweepExpired()` here, unlike everywhere else: the slider re-quotes on
  // every move, and a read that writes would turn a drag into a burst of
  // UPDATEs. Filtering on the clock gives the same answer without the write —
  // an active row past its `endsAt` is finished whether or not the flag caught
  // up, and the next launch/pause/list sweeps it for real.
  const existing = await prisma.promotion.findFirst({
    where: {
      listingId: listing.id,
      OR: [{ status: "active", endsAt: { gt: now } }, { status: "paused" }],
    },
    orderBy: { createdAt: "desc" },
    include: withListing,
  });
  const change = planChange(existing, plan, priority, now);
  // No wallet balance here on purpose — /api/wallet owns that number, and
  // serving a second copy alongside the price invites the two to disagree.
  return {
    planId: planSpec(plan).id,
    priority,
    /** What this change does to the term: new / priority / extend. */
    mode: change.mode,
    /** Full price of the chosen plan at this rank. */
    total: fromPesewas(change.totalP),
    /** What the wallet will actually be debited. */
    charge: fromPesewas(change.chargeP),
    /** Days this adds to the run — 0 when only the rank changed. */
    addedDays: change.addedDays,
    endsAt: change.endsAt.toISOString(),
    isAmendment: Boolean(existing),
    /** The live run this would amend, or null for a fresh launch. */
    current: existing ? serialize(existing) : null,
  };
}

function requirePlan(planId: string): PromotionPlan {
  const plan = planFromId(planId);
  if (!plan) throw ApiError.badRequest(`Unknown promotion plan "${planId}"`);
  return plan;
}

function requirePriority(priority: number) {
  if (!Number.isInteger(priority) || priority < 0 || priority > MAX_PRIORITY) {
    throw ApiError.badRequest(`Priority must be a whole number between 0 and ${MAX_PRIORITY}`);
  }
}

async function requireOwnListing(listingId: string, userId: string, opts?: { mustBeActive?: boolean }) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, status: true, title: true },
  });
  if (!listing) throw ApiError.notFound("Listing not found");
  // Owner-only on purpose, admins included: the charge lands on the caller's
  // wallet, so buying a spotlight for someone else's shop would bill the wrong
  // person.
  if (listing.sellerId !== userId) throw ApiError.forbidden("You can only promote your own listings");
  // Only spending money needs a live listing — reading a quote doesn't.
  if (opts?.mustBeActive !== false && listing.status !== "active") {
    throw ApiError.badRequest("Only an active listing can be promoted — publish it first");
  }
  return listing;
}

/**
 * Buy or amend a spotlight. A fresh run is charged in full; amending a run
 * that's already paid for charges only the increase (and never refunds a
 * downgrade — the term was already bought).
 */
export async function launch(userId: string, listingId: string, planId: string, priority: number) {
  await sweepExpired();
  const plan = requirePlan(planId);
  requirePriority(priority);
  const listing = await requireOwnListing(listingId, userId);

  const { promotion, chargeP } = await prisma.$transaction(async (tx) => {
    // Serialize launches for this listing. Re-reading inside the transaction is
    // not enough on its own: Postgres runs READ COMMITTED, so two studio tabs
    // hitting Launch together would both see "no existing run", both charge full
    // price, and leave two live runs on one listing. Locking the listing row
    // makes the second one wait and then find the first one's promotion, so it
    // amends it and pays only the difference.
    await tx.$queryRaw`SELECT id FROM listings WHERE id = ${listing.id} FOR UPDATE`;

    const existing = await tx.promotion.findFirst({
      where: { listingId: listing.id, status: { in: ["active", "paused"] } },
      orderBy: { createdAt: "desc" },
    });

    const change = planChange(existing, plan, priority, new Date());
    const chargeP = change.chargeP;

    if (chargeP > 0) {
      await walletService.debitGuarded(
        tx,
        userId,
        fromPesewas(chargeP),
        "promotion",
        change.mode === "new"
          ? `Spotlight purchased (${planSpec(plan).label}) — ${listing.title}`
          : change.mode === "extend"
            ? `Spotlight extended (${planSpec(plan).label}) — ${listing.title}`
            : `Spotlight rank raised to ${priority} — ${listing.title}`,
      );
    }

    const data = {
      status: "active" as const,
      plan,
      priority,
      // Cumulative spend on this run, which is what the studio and the metrics
      // report. Not a credit balance — the term itself is tracked by endsAt.
      amount: fromPesewas(toPesewas(Number(existing?.amount ?? 0)) + chargeP),
      startsAt: change.startsAt,
      endsAt: change.endsAt,
      remainingSeconds: null,
    };

    const promotion = existing
      ? await tx.promotion.update({ where: { id: existing.id }, data, include: withListing })
      : await tx.promotion.create({
          data: { ...data, listingId: listing.id, sellerId: userId },
          include: withListing,
        });

    return { promotion, chargeP };
  });

  // What moved out of the wallet just now — not the run's running total, which
  // is what `promotion.amount` holds.
  const charged = fromPesewas(chargeP);
  await notify({
    userId,
    category: "promotion",
    title: "Spotlight active",
    body: `${listing.title} is promoted until ${promotion.endsAt?.toDateString() ?? "further notice"}.`,
    link: `/promotions/${listing.id}`,
  });

  return { promotion: serialize(promotion), charged };
}

/** Stop the clock and bank whatever time is left. */
export async function pause(userId: string, promotionId: string) {
  await sweepExpired();
  const promotion = await ownedPromotion(promotionId, userId);
  if (promotion.status !== "active") {
    throw ApiError.badRequest(`Only an active promotion can be paused — this one is ${promotion.status}`);
  }
  const remainingMs = Math.max(0, (promotion.endsAt?.getTime() ?? Date.now()) - Date.now());
  const updated = await prisma.promotion.update({
    where: { id: promotion.id },
    // Rounded up, so banking the time never shaves a second off the term.
    data: { status: "paused", remainingSeconds: Math.ceil(remainingMs / 1000), endsAt: null },
    include: withListing,
  });
  return serialize(updated);
}

/** Restart on the banked time — not a fresh term. */
export async function resume(userId: string, promotionId: string) {
  await sweepExpired();
  const promotion = await ownedPromotion(promotionId, userId);
  if (promotion.status !== "paused") {
    throw ApiError.badRequest(`Only a paused promotion can be resumed — this one is ${promotion.status}`);
  }
  const remainingMs = (promotion.remainingSeconds ?? 0) * 1000;
  if (remainingMs <= 0) {
    const expired = await prisma.promotion.update({
      where: { id: promotion.id },
      data: { status: "expired", remainingSeconds: 0 },
      include: withListing,
    });
    return serialize(expired);
  }
  const updated = await prisma.promotion.update({
    where: { id: promotion.id },
    data: { status: "active", endsAt: new Date(Date.now() + remainingMs), remainingSeconds: null },
    include: withListing,
  });
  return serialize(updated);
}

/** Ends the run for good. No refund — the term was bought up front. */
export async function cancel(userId: string, promotionId: string) {
  await sweepExpired();
  const promotion = await ownedPromotion(promotionId, userId);
  if (promotion.status === "cancelled") return serialize(promotion);
  const updated = await prisma.promotion.update({
    where: { id: promotion.id },
    data: { status: "cancelled", endsAt: null, remainingSeconds: null },
    include: withListing,
  });
  return serialize(updated);
}

/**
 * Studio header numbers. Seller-scoped — the earlier version reported a
 * marketplace-wide count on a page that reads as "your promotions".
 */
export async function getPromotionMetrics(userId: string) {
  await sweepExpired();
  const [grouped, activeAgg, spend] = await Promise.all([
    prisma.promotion.groupBy({
      by: ["status"],
      where: { sellerId: userId },
      _count: { _all: true },
    }),
    prisma.promotion.aggregate({
      where: { sellerId: userId, status: "active" },
      _avg: { priority: true },
    }),
    prisma.promotion.aggregate({
      where: { sellerId: userId },
      _sum: { amount: true },
    }),
  ]);

  const countFor = (status: string) => grouped.find((g) => g.status === status)?._count._all ?? 0;

  return {
    activePromotionCount: countFor("active"),
    pausedPromotionCount: countFor("paused"),
    expiredPromotionCount: countFor("expired"),
    cancelledPromotionCount: countFor("cancelled"),
    averagePriority: Math.round((activeAgg._avg.priority ?? 0) * 10) / 10,
    totalSpend: Number(spend._sum.amount ?? 0),
    plans: priceList(),
    maxPriority: MAX_PRIORITY,
  };
}
