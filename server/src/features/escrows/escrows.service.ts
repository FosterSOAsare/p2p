import { randomBytes } from "node:crypto";
import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { env } from "../../shared/config/env";
import type { DisputeReason, Escrow, EscrowStatus, Prisma } from "../../generated/prisma/client";
import { lookupTransition, type ActorRole, type EscrowEvent } from "./escrow-machine";
import { CRYPTO_FEE, FIAT_FEE, breakdown, computeFeeP, feeMathP, fromPesewas, toPesewas } from "./money";
import * as walletService from "../wallet/wallet.service";
import { postDealMessage } from "../messages/messages.service";

type Tx = Prisma.TransactionClient;
type Actor = { id: string } | "system";

// Auto-release/auto-resolve are DISABLED for now (everything manual). The sweep
// below and this constant stay for when timers are switched back on.
const AUTO_RELEASE_HOURS = Number(process.env.AUTO_RELEASE_HOURS ?? 72);
void AUTO_RELEASE_HOURS;

// ---------- Share codes (ported from TaaS: no 0/O/1/I alphabet, 5-retry uniqueness) ----------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateShareCode(tx: Tx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = randomBytes(8);
    const code = Array.from(bytes, (b) => CODE_ALPHABET[b % 32]).join("");
    const exists = await tx.escrow.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw ApiError.conflict("Could not allocate a share code, please retry");
}

// ---------- Checkout: order → payment → escrow born funded → seller notified ----------

export interface CheckoutInput {
  listingId: string;
  quantity: number;
  paymentMethod: string; // simulated method (momo/card) — recorded only, not charged
}

/**
 * The /checkout flow. Nothing persists while the buyer reviews the order —
 * this call IS the "payment" moment. Payment is SIMULATED (as though the buyer
 * has paid): no buyer wallet, no balance, no deposit. In one transaction we
 * decrement stock and create the escrow already `funded`. The seller learns of
 * the order via the pair's in-app conversation thread.
 *
 * TODO(payments): integrate a real payment step (buyer pays for the order)
 *   before marking it funded.
 * TODO(notifications): email/push to the seller on new order (in-app message
 *   is posted below; external channels are not wired yet).
 */
export async function checkoutFromListing(buyerId: string, input: CheckoutInput) {
  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: input.listingId },
      include: { seller: { select: { id: true, username: true } } },
    });
    if (!listing || listing.status !== "active") throw ApiError.notFound("Listing is not available");
    if (listing.seller.id === buyerId) throw ApiError.badRequest("You can't buy your own listing");
    if (listing.quantity < input.quantity) {
      throw ApiError.badRequest(`Only ${listing.quantity} unit(s) left in stock`);
    }

    // Money math — integer pesewas, fee stored once (marketplace = fiat rail)
    const amountP = toPesewas(Number(listing.price)) * input.quantity;
    const feeP = computeFeeP(amountP, FIAT_FEE);
    const amount = fromPesewas(amountP);

    // Guarded stock decrement (the TaaS SOLD-flip, adapted to quantities)
    const stocked = await tx.listing.updateMany({
      where: { id: listing.id, status: "active", quantity: { gte: input.quantity } },
      data: { quantity: { decrement: input.quantity } },
    });
    if (stocked.count === 0) throw ApiError.conflict("Listing was just bought out — please retry");
    await tx.listing.updateMany({
      where: { id: listing.id, quantity: { lte: 0 } },
      data: { status: "out_of_stock" },
    });

    const code = await generateShareCode(tx);
    const escrow = await tx.escrow.create({
      data: {
        code,
        title: input.quantity > 1 ? `${listing.title} × ${input.quantity}` : listing.title,
        description: listing.description?.split("\n")[0] ?? null,
        listingId: listing.id,
        quantity: input.quantity,
        creatorId: buyerId,
        creatorRole: "buyer",
        buyerId,
        sellerId: listing.seller.id,
        amount,
        feeAmount: fromPesewas(feeP),
        currency: "GHS",
        rail: "fiat",
        status: "funded", // simulated payment = funded on the fly
        fundedAt: new Date(),
      },
    });

    await tx.escrowEvent.createMany({
      data: [
        { escrowId: escrow.id, actorId: buyerId, actorRole: "buyer", event: "created" },
        { escrowId: escrow.id, actorId: buyerId, actorRole: "buyer", event: "funded", detail: { paymentMethod: input.paymentMethod, simulated: true } },
      ],
    });

    return escrow;
  });

  // After commit: the seller learns about the order in the pair's one thread
  await postDealMessage(
    buyerId,
    result.sellerId!,
    `📦 New order: "${result.title}" — GH₵ ${Number(result.amount).toFixed(2)} is locked in escrow (${result.code}). Deliver to release your payout.`,
    result.id,
  ).catch(() => undefined);

  return getDetail({ id: buyerId }, result.id);
}

// ---------- Standalone deals ----------

export interface CreateStandaloneInput {
  title: string;
  description?: string | null;
  counterpartyUsername?: string;
  role: "buyer" | "seller";
  amount: number;
  currency: "GHS" | "TRX";
}

export async function createStandalone(creatorId: string, input: CreateStandaloneInput) {
  const rail = input.currency === "TRX" ? "crypto" : "fiat";
  const amountP = toPesewas(input.amount);
  const feeP = computeFeeP(amountP, rail === "crypto" ? CRYPTO_FEE : FIAT_FEE);

  // Optional invite — unresolved usernames are fine, the deal stays joinable by code
  let invitedUserId: string | null = null;
  if (input.counterpartyUsername) {
    const invited = await prisma.user.findUnique({ where: { username: input.counterpartyUsername } });
    if (invited?.id === creatorId) throw ApiError.badRequest("You can't deal with yourself");
    invitedUserId = invited?.id ?? null;
  }

  const escrow = await prisma.$transaction(async (tx) => {
    const code = await generateShareCode(tx);
    return tx.escrow.create({
      data: {
        code,
        title: input.title,
        description: input.description || null,
        creatorId,
        creatorRole: input.role,
        buyerId: input.role === "buyer" ? creatorId : invitedUserId,
        sellerId: input.role === "seller" ? creatorId : invitedUserId,
        invitedUsername: input.counterpartyUsername ?? null,
        amount: fromPesewas(amountP),
        feeAmount: fromPesewas(feeP),
        currency: input.currency,
        rail,
        status: "created",
      },
    });
  });

  await prisma.escrowEvent.create({
    data: { escrowId: escrow.id, actorId: creatorId, actorRole: input.role, event: "created" },
  });

  if (invitedUserId) {
    await postDealMessage(
      creatorId,
      invitedUserId,
      `🤝 Escrow deal invite: "${escrow.title}" — ${escrow.currency === "TRX" ? `${Number(escrow.amount)} TRX` : `GH₵ ${Number(escrow.amount).toFixed(2)}`} (code ${escrow.code}). Open your deals to accept.`,
      escrow.id,
    ).catch(() => undefined);
  }

  return getDetail({ id: creatorId }, escrow.id);
}

/** Public share-link preview — no auth, no party details beyond usernames. */
export async function getPublicByCode(code: string) {
  const escrow = await prisma.escrow.findUnique({
    where: { code },
    include: {
      creator: { select: { username: true, avatarUrl: true } },
    },
  });
  if (!escrow) throw ApiError.notFound("No deal with this code");
  return {
    code: escrow.code,
    title: escrow.title,
    description: escrow.description,
    amount: Number(escrow.amount),
    currency: escrow.currency,
    rail: escrow.rail,
    status: escrow.status,
    creator: escrow.creator,
    creatorIsBuyer: escrow.creatorRole === "buyer",
    joinable: escrow.status === "created" && (!escrow.buyerId || !escrow.sellerId),
    createdAt: escrow.createdAt.toISOString(),
  };
}

/** Join a deal by share code — the joiner fills whichever side is empty (TaaS opposite-slot rule). */
export async function acceptByCode(userId: string, code: string) {
  const escrow = await prisma.$transaction(async (tx) => {
    const found = await tx.escrow.findUnique({ where: { code } });
    if (!found) throw ApiError.notFound("No deal with this code");
    if (found.status !== "created") throw ApiError.conflict(`This deal is already ${found.status}`);
    if (found.creatorId === userId) throw ApiError.badRequest("You created this deal");
    if (found.buyerId === userId || found.sellerId === userId) return found; // already joined — idempotent
    if (found.buyerId && found.sellerId) throw ApiError.conflict("This deal already has both parties");

    const data = found.buyerId ? { sellerId: userId } : { buyerId: userId };
    const claimed = await tx.escrow.updateMany({
      where: { id: found.id, status: "created", ...(found.buyerId ? { sellerId: null } : { buyerId: null }) },
      data,
    });
    if (claimed.count === 0) throw ApiError.conflict("Someone else just joined this deal");

    await tx.escrowEvent.create({
      data: {
        escrowId: found.id,
        actorId: userId,
        actorRole: found.buyerId ? "seller" : "buyer",
        event: "joined",
      },
    });
    return tx.escrow.findUniqueOrThrow({ where: { id: found.id } });
  });

  await postDealMessage(
    userId,
    escrow.creatorId,
    `✅ Joined your escrow deal "${escrow.title}" (${escrow.code}).`,
    escrow.id,
  ).catch(() => undefined);

  return getDetail({ id: userId }, escrow.id);
}

// ---------- The transition gateway (the TaaS load-bearing pattern) ----------

/**
 * The ONLY code that mutates escrow.status. Consults the machine table for
 * legality + actor role, applies money effects inside the same transaction,
 * and claims the row with a status-guarded update (stale calls no-op as 409).
 */
export async function transition(
  escrowId: string,
  event: EscrowEvent,
  actor: Actor,
  payload?: { carrier?: string; trackingNumber?: string; note?: string; reason?: DisputeReason; description?: string; buyerRefund?: number },
) {
  const escrow = await prisma.$transaction(async (tx) => {
    const current = await tx.escrow.findUnique({ where: { id: escrowId } });
    if (!current) throw ApiError.notFound("Deal not found");

    const def = lookupTransition(current.status, event);
    if (!def) throw ApiError.badRequest(`Cannot ${event.toLowerCase()} a deal that is ${current.status}`);

    const role = resolveRole(current, actor);
    if (!role || !def.allow.includes(role)) {
      throw ApiError.forbidden(`Only the ${def.allow.filter((r) => r !== "system").join(" or ")} can do this`);
    }

    const escrowData = await applyEffects(tx, current, event, payload);

    const claimed = await tx.escrow.updateMany({
      where: { id: current.id, status: current.status },
      data: { status: def.to, ...escrowData },
    });
    if (claimed.count === 0) throw ApiError.conflict("Deal changed — please retry");

    await tx.escrowEvent.create({
      data: {
        escrowId: current.id,
        actorId: actor === "system" ? null : actor.id,
        actorRole: role,
        event: event.toLowerCase(),
        detail: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      },
    });

    return tx.escrow.findUniqueOrThrow({ where: { id: current.id } });
  });

  await notifyAfterTransition(escrow, event, actor).catch(() => undefined);
  return escrow;
}

function resolveRole(escrow: Escrow, actor: Actor): ActorRole | null {
  if (actor === "system") return "system";
  if (escrow.buyerId === actor.id) return "buyer";
  if (escrow.sellerId === actor.id) return "seller";
  return null;
}

/** Money + field effects per event — always inside the transition's transaction. */
async function applyEffects(
  tx: Tx,
  escrow: Escrow,
  event: EscrowEvent,
  payload?: { carrier?: string; trackingNumber?: string; note?: string; reason?: DisputeReason; description?: string; buyerRefund?: number },
): Promise<Prisma.EscrowUpdateInput> {
  const amount = Number(escrow.amount);
  const fee = Number(escrow.feeAmount);
  const money = breakdown(amount, fee);

  switch (event) {
    case "FUND": {
      if (!escrow.buyerId || !escrow.sellerId) {
        throw ApiError.badRequest("The counterparty must join before the deal can be funded");
      }
      if (escrow.rail === "crypto") {
        throw ApiError.notImplemented("TRX funding lands with the crypto rail — coming next");
      }
      // Simulated payment — no buyer wallet debit. TODO(payments): real charge here.
      return { fundedAt: new Date() };
    }

    case "DELIVER":
      return {
        carrier: payload?.carrier || null,
        trackingNumber: payload?.trackingNumber || null,
        deliveryNote: payload?.note || null,
        deliveredAt: new Date(),
        // auto-release disabled for now — everything is manual (buyer must release)
        autoReleaseAt: null,
      };

    case "RELEASE": {
      await payout(tx, escrow, money.sellerPayout);
      return { disbursedAt: new Date(), autoReleaseAt: null };
    }

    case "DISPUTE": {
      await tx.dispute.create({
        data: {
          escrowId: escrow.id,
          openedById: escrow.buyerId!, // overwritten below for seller-opened disputes
          reason: payload?.reason ?? "other",
          description: payload?.description ?? "",
          // auto-resolution disabled for now — an admin must rule manually
          autoResolveAt: null,
        },
      });
      return { disputedAt: new Date() };
    }

    case "RESOLVE_RELEASE": {
      await payout(tx, escrow, money.sellerPayout);
      return { disbursedAt: new Date() };
    }

    case "RESOLVE_REFUND": {
      // Full refund: the buyer gets everything back incl. their fee share; platform earns nothing
      await refundBuyer(tx, escrow, money.fundingTotal);
      return { disbursedAt: new Date() };
    }

    case "RESOLVE_PARTIAL": {
      // Ported TaaS pro-rata math: fee charged only on the portion the seller keeps
      const buyerRefundP = toPesewas(payload?.buyerRefund ?? 0);
      const fundingTotalP = toPesewas(money.fundingTotal);
      if (buyerRefundP < 0 || buyerRefundP > fundingTotalP) {
        throw ApiError.badRequest("Refund must be between 0 and the funded total");
      }
      const remainderP = fundingTotalP - buyerRefundP;
      const feeChargedP = fundingTotalP > 0 ? Math.floor((toPesewas(fee) * remainderP) / fundingTotalP) : 0;
      const sellerPayoutP = remainderP - feeChargedP;

      if (buyerRefundP > 0) await refundBuyer(tx, escrow, fromPesewas(buyerRefundP));
      if (sellerPayoutP > 0) await payout(tx, escrow, fromPesewas(sellerPayoutP));
      return { disbursedAt: new Date() };
    }

    default:
      return {};
  }
}

async function payout(tx: Tx, escrow: Escrow, sellerAmount: number) {
  if (escrow.rail !== "fiat") throw ApiError.notImplemented("Crypto payouts land with the TRX rail");
  await walletService.credit(
    tx,
    escrow.sellerId!,
    sellerAmount,
    "escrow_release",
    `Escrow payout released — ${escrow.title}`,
    escrow.id,
  );
}

async function refundBuyer(tx: Tx, escrow: Escrow, refundAmount: number) {
  if (escrow.rail !== "fiat") throw ApiError.notImplemented("Crypto refunds land with the TRX rail");
  await walletService.credit(
    tx,
    escrow.buyerId!,
    refundAmount,
    "escrow_refund",
    `Escrow refunded — ${escrow.title}`,
    escrow.id,
  );
}

async function notifyAfterTransition(escrow: Escrow, event: EscrowEvent, actor: Actor) {
  if (!escrow.buyerId || !escrow.sellerId) return;
  const money = `GH₵ ${Number(escrow.amount).toFixed(2)}`;
  switch (event) {
    case "FUND":
      return postDealMessage(escrow.buyerId, escrow.sellerId, `💰 "${escrow.title}" is funded — ${money} locked in escrow (${escrow.code}).`, escrow.id);
    case "DELIVER":
      return postDealMessage(escrow.sellerId, escrow.buyerId, `🚚 "${escrow.title}" marked delivered${escrow.trackingNumber ? ` — ${escrow.carrier ?? "tracking"} ${escrow.trackingNumber}` : ""}. Confirm receipt to release.`, escrow.id);
    case "RELEASE":
      return postDealMessage(
        actor === "system" ? escrow.buyerId : (actor as { id: string }).id,
        escrow.sellerId,
        `✅ "${escrow.title}" — escrow released${actor === "system" ? " automatically" : ""}. Payout sent to the seller.`,
        escrow.id,
      );
    case "DISPUTE":
      return postDealMessage(escrow.buyerId, escrow.sellerId, `⚠️ A dispute was opened on "${escrow.title}" (${escrow.code}). Funds are frozen until an admin rules.`, escrow.id);
    default:
      return;
  }
}

// ---------- Thin transition wrappers ----------

export const fund = (userId: string, id: string) => transition(id, "FUND", { id: userId });
export const deliver = (userId: string, id: string, payload: { carrier?: string; trackingNumber?: string; note?: string }) =>
  transition(id, "DELIVER", { id: userId }, payload);
export const release = (userId: string, id: string) => transition(id, "RELEASE", { id: userId });

export async function dispute(userId: string, id: string, payload: { reason: DisputeReason; description: string }) {
  const existing = await prisma.dispute.findUnique({ where: { escrowId: id } });
  if (existing) throw ApiError.conflict("This deal already has a dispute");
  const escrow = await transition(id, "DISPUTE", { id: userId }, payload);
  await prisma.dispute.update({ where: { escrowId: id }, data: { openedById: userId } });
  return escrow;
}

// ---------- Reviews (only after a deal is disbursed; one per party) ----------

export async function leaveReview(userId: string, escrowId: string, input: { rating: number; comment?: string }) {
  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow) throw ApiError.notFound("Deal not found");
  if (escrow.status !== "disbursed") throw ApiError.badRequest("You can only review a completed deal");

  const isBuyer = escrow.buyerId === userId;
  const isSeller = escrow.sellerId === userId;
  if (!isBuyer && !isSeller) throw ApiError.forbidden("You are not a party to this deal");

  const revieweeId = isBuyer ? escrow.sellerId : escrow.buyerId;
  if (!revieweeId) throw ApiError.badRequest("There is no counterparty to review");

  const existing = await prisma.review.findUnique({
    where: { escrowId_reviewerId: { escrowId, reviewerId: userId } },
  });
  if (existing) throw ApiError.conflict("You already reviewed this deal");

  await prisma.review.create({
    data: {
      escrowId,
      reviewerId: userId,
      revieweeId,
      // A buyer's review of the seller surfaces on the listing; seller→buyer reviews don't.
      listingId: isBuyer ? escrow.listingId : null,
      rating: input.rating,
      comment: input.comment || null,
    },
  });
  return getDetail({ id: userId }, escrowId);
}

// ---------- Queries ----------

export async function list(userId: string, params: { role?: "buyer" | "seller"; status?: EscrowStatus; page: number; limit: number }) {
  const where: Prisma.EscrowWhereInput = {
    ...(params.role === "buyer"
      ? { buyerId: userId }
      : params.role === "seller"
        ? { sellerId: userId }
        : { OR: [{ buyerId: userId }, { sellerId: userId }, { creatorId: userId }] }),
    ...(params.status && { status: params.status }),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.escrow.count({ where }),
    prisma.escrow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: {
        buyer: { select: { username: true, avatarUrl: true } },
        seller: { select: { username: true, avatarUrl: true } },
        listing: { select: { id: true, images: true } },
      },
    }),
  ]);
  return {
    deals: rows.map((e) => serialize(e, userId)),
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function getDetail(actor: { id: string }, id: string) {
  const escrow = await prisma.escrow.findUnique({
    where: { id },
    include: {
      buyer: { select: { username: true, avatarUrl: true } },
      seller: { select: { username: true, avatarUrl: true } },
      creator: { select: { username: true } },
      listing: { select: { id: true, images: true, title: true } },
      events: { orderBy: { createdAt: "asc" } },
      dispute: true,
      reviews: true,
    },
  });
  if (!escrow) throw ApiError.notFound("Deal not found");
  const isParty = [escrow.buyerId, escrow.sellerId, escrow.creatorId].includes(actor.id);
  if (!isParty) throw ApiError.forbidden("You are not a party to this deal");

  const myReview = escrow.reviews.find((r) => r.reviewerId === actor.id);

  return {
    ...serialize(escrow, actor.id),
    creatorUsername: escrow.creator.username,
    myReview: myReview ? { rating: myReview.rating, comment: myReview.comment } : null,
    events: escrow.events.map((ev) => ({
      id: ev.id,
      event: ev.event,
      actorRole: ev.actorRole,
      createdAt: ev.createdAt.toISOString(),
    })),
    dispute: escrow.dispute
      ? {
          reason: escrow.dispute.reason,
          description: escrow.dispute.description,
          status: escrow.dispute.status,
          outcome: escrow.dispute.outcome,
          rulingNote: escrow.dispute.rulingNote,
          createdAt: escrow.dispute.createdAt.toISOString(),
        }
      : null,
  };
}

type EscrowWithParties = Escrow & {
  buyer: { username: string; avatarUrl: string | null } | null;
  seller: { username: string; avatarUrl: string | null } | null;
  listing?: { id: string; images: string[] } | null;
};

function serialize(e: EscrowWithParties, userId: string) {
  const money = breakdown(Number(e.amount), Number(e.feeAmount));
  const myRole = e.buyerId === userId ? "buyer" : e.sellerId === userId ? "seller" : "creator";
  return {
    id: e.id,
    code: e.code,
    title: e.title,
    description: e.description,
    status: e.status,
    currency: e.currency,
    rail: e.rail,
    amount: Number(e.amount),
    feeAmount: Number(e.feeAmount),
    ...money, // buyerFee, sellerFee, fundingTotal, sellerPayout
    quantity: e.quantity,
    listing: e.listing ? { id: e.listing.id, image: e.listing.images[0] ?? null } : null,
    buyer: e.buyer,
    seller: e.seller,
    invitedUsername: e.invitedUsername,
    myRole,
    availableActions: availableActions(e, userId),
    carrier: e.carrier,
    trackingNumber: e.trackingNumber,
    deliveryNote: e.deliveryNote,
    autoReleaseAt: e.autoReleaseAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    fundedAt: e.fundedAt?.toISOString() ?? null,
    deliveredAt: e.deliveredAt?.toISOString() ?? null,
    disbursedAt: e.disbursedAt?.toISOString() ?? null,
    disputedAt: e.disputedAt?.toISOString() ?? null,
  };
}

/** Context-aware primary actions per role — drives the client's buttons (TaaS availableActions). */
function availableActions(e: Escrow, userId: string): string[] {
  const isBuyer = e.buyerId === userId;
  const isSeller = e.sellerId === userId;
  switch (e.status) {
    case "created":
      if (isBuyer && e.sellerId) return ["FUND"];
      return [];
    case "funded":
      // Seller ships; buyer can't confirm receipt until the seller marks it delivered.
      if (isSeller) return ["DELIVER", "DISPUTE"];
      if (isBuyer) return ["DISPUTE"];
      return [];
    case "delivered":
      if (isBuyer) return ["RELEASE", "DISPUTE"];
      if (isSeller) return ["DISPUTE"];
      return [];
    default:
      return [];
  }
}

// ---------- Auto-release sweep (replaces TaaS BullMQ; deadlines are persisted columns) ----------

export async function sweepAutoRelease() {
  const due = await prisma.escrow.findMany({
    where: { status: "delivered", autoReleaseAt: { lte: new Date() } },
    select: { id: true },
    take: 10,
  });
  for (const { id } of due) {
    // Stale/raced sweeps no-op via the status guard inside transition()
    await transition(id, "RELEASE", "system").catch(() => undefined);
  }
}
