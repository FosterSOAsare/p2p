import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { env } from "../../shared/config/env";
import type { DisputeReason, Escrow, EscrowStatus, Prisma } from "../../generated/prisma/client";
import { lookupTransition, type ActorRole, type EscrowEvent } from "./escrow-machine";
import { CRYPTO_FEE, FIAT_FEE, breakdown, computeFeeP, feeMathP, fromPesewas, toPesewas, type FeeSplit } from "./money";
import * as walletService from "../wallet/wallet.service";
import { postDealMessage } from "../messages/messages.service";
import { notifyAdmins } from "../notifications/notifications.service";
import { mailer } from "../../shared/mail/mail.service";

type Tx = Prisma.TransactionClient;
type Actor = { id: string } | "system";

// Auto-release is DISABLED for now — the buyer releases manually. The sweep
// below and this constant stay for when the timer is switched back on.
// (Dispute auto-resolution was removed outright: every ruling is an admin's.)
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

// ---------- Shared guards ----------

/**
 * Two parties with money frozen in arbitration have no business starting a new
 * deal — settle the open one first. Guards checkout, standalone creation and
 * join-by-code, in both role orientations (the seller can't invite a buyer they
 * are mid-dispute with either).
 *
 * Keys off `escrow.status` rather than `Dispute.status`: a ruling transitions
 * the deal to `disbursed`, so `disputed` means exactly "arbitration in progress".
 */
async function assertNoOpenDispute(tx: Tx, a: string, b: string) {
  const frozen = await tx.escrow.findFirst({
    where: {
      status: "disputed",
      OR: [
        { buyerId: a, sellerId: b },
        { buyerId: b, sellerId: a },
      ],
    },
    select: { code: true, title: true },
  });
  if (frozen) {
    throw ApiError.conflict(
      `There's an open dispute between you two on "${frozen.title}" (${frozen.code}). It has to be resolved before you can start another deal together.`,
    );
  }
}

// ---------- Checkout: order → payment → escrow born funded → seller notified ----------

export interface CheckoutInput {
  listingId: string;
  quantity: number;
  paymentMethod: string; // momo/card — recorded on the event, not a separate charge
}

/**
 * The /checkout flow. Nothing persists while the buyer reviews the order — this
 * call IS the payment moment. One transaction decrements stock, creates the
 * escrow already `funded`, and debits the buyer's wallet for the funding total;
 * a short balance throws and rolls the whole thing back, stock included, so the
 * buyer has to top up (Paystack deposit) first.
 *
 * Because the escrow is born `funded`, checkout never runs the FUND transition —
 * which is why the seller's "new order" mail is sent here rather than by
 * sendTransitionEmails.
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
    await assertNoOpenDispute(tx, buyerId, listing.seller.id);

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
        status: "funded", // funded in the same breath — but now backed by a real wallet debit
        fundedAt: new Date(),
      },
    });

    // Real payment: debit the buyer's wallet for the funding total. If the
    // balance is short, the guard throws and the whole checkout rolls back
    // (stock restored) — the buyer must top up (Paystack deposit) first.
    // Marketplace checkout has no fee-split control — always 50/50.
    const fundingTotal = fromPesewas(feeMathP(amountP, feeP, "split").fundingTotalP);
    await walletService.debitGuarded(
      tx,
      buyerId,
      fundingTotal,
      "escrow_fund",
      `Escrow funded — ${escrow.title}`,
      escrow.id,
    );

    await tx.escrowEvent.createMany({
      data: [
        { escrowId: escrow.id, actorId: buyerId, actorRole: "buyer", event: "created" },
        { escrowId: escrow.id, actorId: buyerId, actorRole: "buyer", event: "funded", detail: { paymentMethod: input.paymentMethod } },
      ],
    });

    return escrow;
  });

  // After commit: the seller learns about the order in the pair's one thread
  await postDealMessage(
    buyerId,
    result.sellerId!,
    `📦 New order: "${result.title}" — GH₵ ${Number(result.amount).toFixed(2)} is locked in escrow (${result.code}).`,
    result.id,
  ).catch((err) => console.error("[escrow] order notice failed:", err));

  // …and by email, if they haven't opted out of order updates.
  prisma.user
    .findUnique({
      where: { id: result.sellerId! },
      select: { email: true, fullName: true, emailShipmentUpdates: true },
    })
    .then((seller) => {
      if (seller?.emailShipmentUpdates) {
        return mailer.newOrder(
          seller.email,
          seller.fullName,
          result.title,
          Number(result.amount).toFixed(2),
          result.code,
        );
      }
    })
    .catch(() => undefined);

  return getDetail({ id: buyerId }, result.id);
}

// ---------- Standalone deals ----------

export interface CreateStandaloneInput {
  title: string;
  description?: string;
  counterpartyUsername?: string;
  invitedUsername?: string;
  role: "buyer" | "seller";
  amount: number;
  currency: "GHS" | "TRX";
  /** Who absorbs the platform fee. Defaults to an even split. */
  feeSplit?: FeeSplit;
}

export async function createStandalone(creatorId: string, input: CreateStandaloneInput) {
  const rail = input.currency === "TRX" ? "crypto" : "fiat";
  const amountP = toPesewas(input.amount);
  const feeP = computeFeeP(amountP, rail === "crypto" ? CRYPTO_FEE : FIAT_FEE);

  const rawCounterparty = (input.counterpartyUsername || input.invitedUsername || "").replace(/^@/, "").trim().toLowerCase();

  let invitedUserId: string | null = null;
  let cleanCounterpartyUsername: string | null = null;

  if (rawCounterparty) {
    const invited = await prisma.user.findUnique({ where: { username: rawCounterparty } });
    if (!invited) {
      throw ApiError.badRequest(`User @${rawCounterparty} was not found on P2P Market. Please verify the username and try again.`);
    }
    if (invited.id === creatorId) {
      throw ApiError.badRequest("You cannot create an escrow deal with yourself");
    }
    invitedUserId = invited.id;
    cleanCounterpartyUsername = invited.username;
  }

  const escrow = await prisma.$transaction(async (tx) => {
    if (invitedUserId) await assertNoOpenDispute(tx, creatorId, invitedUserId);
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
        invitedUsername: cleanCounterpartyUsername,
        amount: fromPesewas(amountP),
        feeAmount: fromPesewas(feeP),
        feeSplit: input.feeSplit ?? "split",
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
    ).catch((err) => console.error("[escrow] invite notice failed:", err));
  }

  return getDetail({ id: creatorId }, escrow.id);
}

export interface UpdateDealInput {
  title?: string;
  description?: string;
  counterpartyUsername?: string;
  invitedUsername?: string;
  role?: "buyer" | "seller";
  amount?: number;
  currency?: "GHS" | "TRX";
}

/** Update terms of an unfunded deal (status === 'created') */
export async function updateDeal(userId: string, escrowId: string, input: UpdateDealInput) {
  const current = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!current) throw ApiError.notFound("Deal not found");

  if (current.creatorId !== userId && current.buyerId !== userId && current.sellerId !== userId) {
    throw ApiError.forbidden("Only parties to this deal can edit its terms");
  }

  if (current.status !== "created") {
    throw ApiError.badRequest("Deals can only be edited before funding");
  }

  const rawCounterparty = (input.counterpartyUsername || input.invitedUsername || "").replace(/^@/, "").trim().toLowerCase();

  let invitedUserId: string | null = null;
  let cleanCounterpartyUsername: string | null = current.invitedUsername;

  if (rawCounterparty) {
    const invited = await prisma.user.findUnique({ where: { username: rawCounterparty } });
    if (!invited) {
      throw ApiError.badRequest(`User @${rawCounterparty} was not found on P2P Market. Please verify the username and try again.`);
    }
    if (invited.id === userId) {
      throw ApiError.badRequest("You cannot create an escrow deal with yourself");
    }
    invitedUserId = invited.id;
    cleanCounterpartyUsername = invited.username;
  }

  const newRole = input.role || current.creatorRole;
  const newCurrency = input.currency || current.currency;
  const newRail = newCurrency === "TRX" ? "crypto" : "fiat";
  const newAmount = input.amount || Number(current.amount);
  const amountP = toPesewas(newAmount);
  const feeP = computeFeeP(amountP, newRail === "crypto" ? CRYPTO_FEE : FIAT_FEE);

  const updatedBuyerId = newRole === "buyer" ? (current.creatorId === userId ? userId : current.buyerId) : (invitedUserId || (current.creatorId === userId ? current.buyerId : userId));
  const updatedSellerId = newRole === "seller" ? (current.creatorId === userId ? userId : current.sellerId) : (invitedUserId || (current.creatorId === userId ? current.sellerId : userId));

  await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      amount: fromPesewas(amountP),
      feeAmount: fromPesewas(feeP),
      currency: newCurrency,
      rail: newRail,
      creatorRole: newRole,
      buyerId: updatedBuyerId,
      sellerId: updatedSellerId,
      ...(cleanCounterpartyUsername !== null && { invitedUsername: cleanCounterpartyUsername }),
    },
  });

  await prisma.escrowEvent.create({
    data: {
      escrowId,
      actorId: userId,
      actorRole: current.buyerId === userId ? "buyer" : "seller",
      event: "updated",
      detail: JSON.parse(JSON.stringify(input)),
    },
  });

  return getDetail({ id: userId }, escrowId);
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
    // The joiner is agreeing to these terms — show who carries the fee, and
    // what each side actually pays/receives, before they accept.
    feeSplit: escrow.feeSplit,
    ...breakdown(Number(escrow.amount), Number(escrow.feeAmount), escrow.feeSplit),
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
    await assertNoOpenDispute(tx, userId, found.creatorId);

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
  ).catch((err) => console.error("[escrow] join notice failed:", err));

  return getDetail({ id: userId }, escrow.id);
}

// ---------- The transition gateway (the TaaS load-bearing pattern) ----------

interface TransitionPayload {
  carrier?: string;
  trackingNumber?: string;
  note?: string;
  reason?: DisputeReason;
  description?: string;
  buyerRefund?: number;
  /** Free-text explanation the seller gives when cancelling a funded order. */
  cancelReason?: string;
}

/**
 * The ONLY code that mutates escrow.status. Consults the machine table for
 * legality + actor role, applies money effects inside the same transaction,
 * and claims the row with a status-guarded update (stale calls no-op as 409).
 */
export async function transition(
  escrowId: string,
  event: EscrowEvent,
  actor: Actor,
  payload?: TransitionPayload,
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

  await notifyAfterTransition(escrow, event, actor, payload).catch((err) =>
    console.error(`[escrow:${escrow.id}] ${event} notifications failed —`, (err as Error).message),
  );
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
  payload?: TransitionPayload,
): Promise<Prisma.EscrowUpdateInput> {
  const amount = Number(escrow.amount);
  const fee = Number(escrow.feeAmount);
  const money = breakdown(amount, fee, escrow.feeSplit);

  switch (event) {
    case "FUND": {
      if (!escrow.buyerId || !escrow.sellerId) {
        throw ApiError.badRequest("The counterparty must join before the deal can be funded");
      }
      if (escrow.rail === "crypto") {
        throw ApiError.notImplemented("TRX funding lands with the crypto rail — coming next");
      }
      // Buyer pays the funding total (item + their half of the fee) from their
      // wallet. Guarded debit rolls the whole transition back if the balance is
      // short — the buyer must top up (Paystack deposit) first.
      await walletService.debitGuarded(
        tx,
        escrow.buyerId,
        money.fundingTotal,
        "escrow_fund",
        `Escrow funded — ${escrow.title}`,
        escrow.id,
      );
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

    case "CANCEL": {
      // Two shapes of cancellation reach here. A `created` deal never debited
      // anyone — refunding it would mint money — and it never held stock, since
      // only checkout (which mints `funded` outright) touches a listing. So the
      // money effects belong strictly to the funded case.
      if (escrow.status === "funded") {
        // The seller can't fulfil. Nothing shipped, so the buyer is made whole —
        // item + their fee share. The platform charges nothing on a cancellation.
        await refundBuyer(tx, escrow, money.fundingTotal);

        // Put the units back on the shelf; checkout decremented them at payment.
        if (escrow.listingId && escrow.quantity) {
          await tx.listing.update({
            where: { id: escrow.listingId },
            data: { quantity: { increment: escrow.quantity } },
          });
          // …and un-sell-out the listing, but only if that's why it went dark
          // (a seller who since drafted it stays drafted).
          await tx.listing.updateMany({
            where: { id: escrow.listingId, status: "out_of_stock", quantity: { gt: 0 } },
            data: { status: "active" },
          });
        }
      }

      return {
        cancelledAt: new Date(),
        cancelReason: payload?.cancelReason?.trim() || null,
        autoReleaseAt: null,
      };
    }

    case "DISPUTE": {
      await tx.dispute.create({
        data: {
          escrowId: escrow.id,
          openedById: escrow.buyerId!, // overwritten below for seller-opened disputes
          reason: payload?.reason ?? "other",
          description: payload?.description ?? "",
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

async function notifyAfterTransition(escrow: Escrow, event: EscrowEvent, actor: Actor, payload?: TransitionPayload) {
  if (!escrow.buyerId || !escrow.sellerId) return;
  const money = `GH₵ ${Number(escrow.amount).toFixed(2)}`;

  // In-app thread message. RESOLVE_* is intentionally absent — the admin service
  // posts the official verdict itself.
  switch (event) {
    case "FUND":
      await postDealMessage(escrow.buyerId, escrow.sellerId, `💰 "${escrow.title}" is funded — ${money} locked in escrow (${escrow.code}).`, escrow.id);
      break;
    case "DELIVER":
      await postDealMessage(escrow.sellerId, escrow.buyerId, `🚚 "${escrow.title}" marked delivered${escrow.trackingNumber ? ` — ${escrow.carrier ?? "tracking"} ${escrow.trackingNumber}` : ""}. Confirm receipt to release.`, escrow.id);
      break;
    case "RELEASE":
      await postDealMessage(
        actor === "system" ? escrow.buyerId : (actor as { id: string }).id,
        escrow.sellerId,
        `✅ "${escrow.title}" — escrow released${actor === "system" ? " automatically" : ""}. Payout sent to the seller.`,
        escrow.id,
      );
      break;
    case "CANCEL": {
      if (actor === "system") break;
      const why = payload?.cancelReason?.trim();
      const suffix = why ? `\n\nReason: ${why}` : "";
      // Either party can cancel before funding, so address the *other* one.
      const other = actor.id === escrow.buyerId ? escrow.sellerId : escrow.buyerId;

      if (escrow.fundedAt) {
        // Funded orders are seller-cancel only. The buyer gets the funding total
        // back (item + their fee share), not just the item price.
        const refunded = breakdown(Number(escrow.amount), Number(escrow.feeAmount), escrow.feeSplit).fundingTotal;
        await postDealMessage(
          actor.id,
          other,
          `🚫 The seller cancelled "${escrow.title}" (${escrow.code}). GH₵ ${refunded.toFixed(2)} has been refunded to your wallet in full.${suffix}`,
          escrow.id,
        );
      } else {
        await postDealMessage(
          actor.id,
          other,
          `🚫 "${escrow.title}" (${escrow.code}) was cancelled before it was funded. No money changed hands.${suffix}`,
          escrow.id,
        );
      }
      break;
    }
    case "DISPUTE":
      await postDealMessage(escrow.buyerId, escrow.sellerId, `⚠️ A dispute was opened on "${escrow.title}" (${escrow.code}). Funds are frozen until an admin rules.`, escrow.id);
      // The parties are covered by the notice above; the admins were not
      // covered by anything — a disputed deal freezes money and only surfaced
      // when someone happened to open /admin/disputes.
      await notifyAdmins({
        category: "dispute",
        title: "New dispute — funds frozen",
        body: `"${escrow.title}" (${escrow.code}) is disputed and awaiting a ruling.`,
        link: "/admin/disputes",
      });
      break;
  }

  // Email side-channel — best-effort, never blocks the transition.
  await sendTransitionEmails(escrow, event, actor).catch(() => undefined);
}

/** Lifecycle emails. Money & dispute mail always sends; the two shipment steps
 *  (FUND, DELIVER) respect the recipient's emailShipmentUpdates preference,
 *  matching how checkout gates mailer.newOrder. */
async function sendTransitionEmails(escrow: Escrow, event: EscrowEvent, actor: Actor) {
  const MAILED: EscrowEvent[] = ["FUND", "DELIVER", "RELEASE", "CANCEL", "DISPUTE"];
  if (!MAILED.includes(event) && !event.startsWith("RESOLVE_")) return;
  if (!escrow.buyerId || !escrow.sellerId) return;

  const userSelect = { email: true, fullName: true, emailShipmentUpdates: true } as const;
  const [buyer, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: escrow.buyerId }, select: userSelect }),
    prisma.user.findUnique({ where: { id: escrow.sellerId }, select: userSelect }),
  ]);
  if (!buyer || !seller) return;

  const money = breakdown(Number(escrow.amount), Number(escrow.feeAmount), escrow.feeSplit);
  const payout = money.sellerPayout.toFixed(2);

  switch (event) {
    case "FUND":
      // Only standalone deals reach here — marketplace checkout writes the
      // escrow straight to `funded` and mails newOrder itself.
      if (seller.emailShipmentUpdates) {
        await mailer.dealFunded(seller.email, seller.fullName, escrow.title, Number(escrow.amount).toFixed(2), escrow.code);
      }
      break;
    case "DELIVER":
      if (buyer.emailShipmentUpdates) {
        const tracking = escrow.trackingNumber
          ? `${escrow.carrier ?? "Tracking"} ${escrow.trackingNumber}`
          : "No tracking provided";
        await mailer.orderDelivered(buyer.email, buyer.fullName, escrow.title, tracking, escrow.code);
      }
      break;
    case "RELEASE":
      await mailer.fundsRelease(seller.email, seller.fullName, escrow.title, payout, escrow.code);
      // The buyer is told only when the *timer* released it — on a manual
      // release they clicked the button, so an email restating that is noise.
      if (actor === "system") {
        await mailer.autoRelease(buyer.email, buyer.fullName, escrow.title, payout, escrow.code);
      }
      break;
    case "CANCEL":
      // Only for a funded order — that template is about the refund, and an
      // unfunded deal has none. Pre-funding cancels are in-app only.
      if (escrow.fundedAt) {
        await mailer.orderCancelled(buyer.email, buyer.fullName, escrow.title, money.fundingTotal.toFixed(2), escrow.code);
      }
      break;
    case "DISPUTE": {
      // Notify the party who didn't open it (or both, on a system-opened dispute).
      const openerId = actor === "system" ? null : (actor as { id: string }).id;
      if (openerId !== escrow.buyerId) await mailer.disputeCreated(buyer.email, buyer.fullName, escrow.title, escrow.code);
      if (openerId !== escrow.sellerId) await mailer.disputeCreated(seller.email, seller.fullName, escrow.title, escrow.code);
      break;
    }
    case "RESOLVE_RELEASE":
    case "RESOLVE_REFUND":
    case "RESOLVE_PARTIAL": {
      const outcome =
        event === "RESOLVE_RELEASE" ? "Released to seller" : event === "RESOLVE_REFUND" ? "Refunded to buyer" : "Split between parties";
      await Promise.all([
        mailer.disputeResolved(buyer.email, buyer.fullName, escrow.title, outcome, escrow.code),
        mailer.disputeResolved(seller.email, seller.fullName, escrow.title, outcome, escrow.code),
      ]);
      break;
    }
  }
}

// ---------- Thin transition wrappers ----------

export const fund = (userId: string, id: string) => transition(id, "FUND", { id: userId });
export const deliver = (userId: string, id: string, payload: { carrier?: string; trackingNumber?: string; note?: string }) =>
  transition(id, "DELIVER", { id: userId }, payload);
export const release = (userId: string, id: string) => transition(id, "RELEASE", { id: userId });
export const cancel = (userId: string, id: string, payload: { reason?: string }) =>
  transition(id, "CANCEL", { id: userId }, { cancelReason: payload.reason });

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
  // `cancelled` is excluded by construction — nothing was traded, so no rating is earned.
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
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  const myUsername = me?.username;

  const userOrInvitedFilter: Prisma.EscrowWhereInput[] = [
    { buyerId: userId },
    { sellerId: userId },
    { creatorId: userId },
  ];
  if (myUsername) {
    userOrInvitedFilter.push({ invitedUsername: myUsername });
  }

  const where: Prisma.EscrowWhereInput = {
    ...(params.role === "buyer"
      ? { OR: [{ buyerId: userId }, ...(myUsername ? [{ invitedUsername: myUsername, creatorRole: "seller" as const }] : [])] }
      : params.role === "seller"
        ? { OR: [{ sellerId: userId }, ...(myUsername ? [{ invitedUsername: myUsername, creatorRole: "buyer" as const }] : [])] }
        : { OR: userOrInvitedFilter }),
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

/**
 * The invite kit for a deal that still has an empty side: the join URL and a QR
 * of it. Built inline in getDetail rather than behind its own endpoint — the
 * deal page already makes that request, and one source means the QR can't drift
 * from the link it encodes. `/join/:code` mirrors the public preview endpoint.
 */
async function buildShareInvite(code: string) {
  const joinUrl = `${env.WEB_ORIGIN}/join/${code}`;
  return { code, joinUrl, dataUrl: await QRCode.toDataURL(joinUrl, { width: 240, margin: 1 }) };
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

  // A deal with an empty side has no counterparty to notify in-app, so the
  // creator has to hand it over out of band — that's the only case that needs
  // (and pays for) the QR. Same condition as getPublicByCode's `joinable`.
  const share =
    escrow.status === "created" && (!escrow.buyerId || !escrow.sellerId)
      ? await buildShareInvite(escrow.code)
      : null;

  return {
    ...serialize(escrow, actor.id),
    creatorUsername: escrow.creator.username,
    share,
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
  const money = breakdown(Number(e.amount), Number(e.feeAmount), e.feeSplit);
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
    feeSplit: e.feeSplit,
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
    cancelReason: e.cancelReason,
    autoReleaseAt: e.autoReleaseAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    fundedAt: e.fundedAt?.toISOString() ?? null,
    deliveredAt: e.deliveredAt?.toISOString() ?? null,
    disbursedAt: e.disbursedAt?.toISOString() ?? null,
    disputedAt: e.disputedAt?.toISOString() ?? null,
    cancelledAt: e.cancelledAt?.toISOString() ?? null,
  };
}

/** Context-aware primary actions per role — drives the client's buttons (TaaS availableActions). */
function availableActions(e: Escrow, userId: string): string[] {
  const isBuyer = e.buyerId === userId;
  const isSeller = e.sellerId === userId;
  switch (e.status) {
    case "created": {
      // No money has moved, so either party can walk away — including a creator
      // whose invite was never accepted (they still fill one of the two slots).
      const actions: string[] = [];
      if (isBuyer && e.sellerId) actions.push("FUND");
      if (isBuyer || isSeller) actions.push("CANCEL");
      return actions;
    }
    case "funded":
      // Seller ships; buyer can't confirm receipt until the seller marks it delivered.
      // CANCEL is the seller's out while nothing has shipped yet.
      if (isSeller) return ["DELIVER", "CANCEL", "DISPUTE"];
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
