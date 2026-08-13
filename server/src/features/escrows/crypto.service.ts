import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { env, nowpaymentsEnabled } from "../../shared/config/env";
import * as nowpayments from "../../shared/lib/nowpayments";
import type { CryptoEscrow, Escrow } from "../../generated/prisma/client";
import { breakdown } from "./money";
import { transition } from "./escrows.service";

/**
 * The TRX rail's deposit half — the crypto answer to wallet.service's Paystack
 * block, and structured the same way: open a hosted charge, then settle the
 * reference exactly once from whichever of the webhook or the poll arrives
 * first.
 *
 * The buyer never funds a crypto deal by asking us to; they fund it by paying
 * the provider. Confirmation of that payment IS the FUND event, which is why
 * the state machine lets `system` fire it (see escrow-machine.ts) and why
 * applyEffects refuses a buyer-initiated crypto FUND outright.
 */

/** How far below the invoiced amount still counts as paid, as a fraction.
 *  The provider has its own underpayment tolerance and flags anything past it
 *  `partially_paid`; this is the second lock on the same door, so a status that
 *  says "finished" over a materially short transfer still cannot fund a deal. */
const UNDERPAY_TOLERANCE = 0.01; // 1%

async function loadForDeposit(escrowId: string) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: { crypto: true },
  });
  if (!escrow) throw ApiError.notFound("Deal not found");
  if (escrow.rail !== "crypto") throw ApiError.badRequest("This deal settles in GH₵, not on-chain");
  return escrow;
}

function assertParty(escrow: Escrow, userId: string) {
  if (![escrow.buyerId, escrow.sellerId, escrow.creatorId].includes(userId)) {
    throw ApiError.forbidden("You are not a party to this deal");
  }
}

/** What the buyer owes on-chain: the item plus their share of the platform fee. */
const expectedFor = (escrow: Escrow) =>
  breakdown(Number(escrow.amount), Number(escrow.feeAmount), escrow.feeSplit).fundingTotal;

/**
 * Open (or re-open) the hosted invoice for a crypto deal and hand back its URL.
 *
 * Re-entrant on purpose: a buyer who closes the tab and comes back gets the
 * same live invoice rather than a second one competing for the same deal. Only
 * an invoice the provider has given up on — expired, failed, refunded — is
 * replaced, and that replacement takes a fresh `orderRef` so the dead one's
 * callbacks can never be mistaken for the new one's.
 */
export async function startDeposit(userId: string, escrowId: string) {
  if (!nowpaymentsEnabled()) {
    throw ApiError.notImplemented("Crypto funding is not configured on this server");
  }
  const escrow = await loadForDeposit(escrowId);
  if (escrow.buyerId !== userId) throw ApiError.forbidden("Only the buyer funds a deal");
  if (!escrow.buyerId || !escrow.sellerId) {
    throw ApiError.badRequest("The counterparty must join before the deal can be funded");
  }
  if (escrow.status !== "created") throw ApiError.conflict(`This deal is already ${escrow.status}`);

  const expected = expectedFor(escrow);

  // Reuse a live invoice, but only while it still asks for the right amount:
  // the deal is editable until it is funded, so a price change mid-flow would
  // otherwise leave the buyer paying yesterday's total. A stale one is replaced
  // on the same terms as a dead one — new invoice, new orderRef.
  const existing = escrow.crypto;
  const stale = existing ? Math.abs(Number(existing.expectedTrx) - expected) > 1e-6 : false;
  if (existing?.invoiceUrl && !nowpayments.isDead(existing.payStatus) && !stale) {
    return serialize(escrow, existing);
  }

  const orderRef = nowpayments.newOrderRef(escrow.code);
  const invoice = await nowpayments.createInvoice({
    amount: expected,
    orderId: orderRef,
    description: `Escrow ${escrow.code} — ${escrow.title}`,
    successUrl: `${env.WEB_ORIGIN}/escrow/${escrow.id}/crypto/callback?ref=${encodeURIComponent(orderRef)}`,
    cancelUrl: `${env.WEB_ORIGIN}/escrow/${escrow.id}`,
  });

  // The row is per-escrow, so a retry rewrites the dead invoice in place rather
  // than accumulating orphans.
  const row = await prisma.cryptoEscrow.upsert({
    where: { escrowId: escrow.id },
    create: {
      escrowId: escrow.id,
      orderRef,
      invoiceId: invoice.invoiceId,
      invoiceUrl: invoice.invoiceUrl,
      payCurrency: env.NOWPAYMENTS_PAY_CURRENCY,
      expectedTrx: expected,
    },
    update: {
      orderRef,
      invoiceId: invoice.invoiceId,
      invoiceUrl: invoice.invoiceUrl,
      payStatus: "waiting",
      payCurrency: env.NOWPAYMENTS_PAY_CURRENCY,
      paymentId: null,
      depositAddress: null,
      depositTxid: null,
      receivedTrx: 0,
      expectedTrx: expected,
    },
  });

  await prisma.escrowEvent.create({
    data: {
      escrowId: escrow.id,
      actorId: userId,
      actorRole: "buyer",
      event: "crypto_invoice_opened",
      detail: { orderRef, provider: "nowpayments" },
    },
  });

  return serialize(escrow, row);
}

/** Current deposit state — what the funding screen polls. */
export async function getDeposit(userId: string, escrowId: string) {
  const escrow = await loadForDeposit(escrowId);
  assertParty(escrow, userId);
  return serialize(escrow, escrow.crypto);
}

/**
 * Poll fallback, for the case the webhook cannot cover: a laptop the provider
 * cannot reach. `paymentId` comes from `NP_id` on the success redirect — the
 * only place it exists before an IPN has ever landed.
 */
export async function checkDeposit(userId: string, escrowId: string, paymentId?: string) {
  const escrow = await loadForDeposit(escrowId);
  assertParty(escrow, userId);
  const row = escrow.crypto;
  if (!row) throw ApiError.notFound("No crypto deposit has been opened for this deal");

  const id = paymentId || row.paymentId;
  if (!id) {
    // The buyer has not reached the provider's checkout yet, so there is
    // nothing to ask about — report the invoice as it stands.
    return serialize(escrow, row);
  }

  const snapshot = await nowpayments.getPayment(id);
  if (snapshot.orderId && snapshot.orderId !== row.orderRef) {
    throw ApiError.badRequest("That payment belongs to a different deal");
  }
  const updated = await applySnapshot(escrow, row, snapshot);
  return serialize(await loadForDeposit(escrowId), updated);
}

/** Handle a signature-verified NOWPayments IPN. */
export async function handleIpn(body: Record<string, unknown>) {
  const snapshot = nowpayments.toSnapshot(body);
  if (!snapshot.orderId) return;

  const row = await prisma.cryptoEscrow.findUnique({
    where: { orderRef: snapshot.orderId },
    include: { escrow: true },
  });
  if (!row) return; // an order we don't know — a stale invoice, or not ours

  await applySnapshot(row.escrow, row, snapshot);
}

/**
 * Record what the provider says, and fund the deal if it says the money is in.
 *
 * Both callers can arrive at once (the IPN and the buyer's poll routinely
 * race), so nothing here may assume it is alone: the provider facts are a
 * straight overwrite, and the FUND itself is claimed by the state machine's
 * status guard — the loser finds the deal already funded, which is a no-op and
 * not an error.
 */
async function applySnapshot(
  escrow: Escrow,
  row: CryptoEscrow,
  snapshot: nowpayments.PaymentSnapshot,
): Promise<CryptoEscrow> {
  const updated = await prisma.cryptoEscrow.update({
    where: { id: row.id },
    data: {
      paymentId: snapshot.paymentId || row.paymentId,
      payStatus: snapshot.status,
      payCurrency: snapshot.payCurrency || row.payCurrency,
      depositAddress: snapshot.payAddress ?? row.depositAddress,
      depositTxid: snapshot.payinHash ?? row.depositTxid,
      receivedTrx: snapshot.actuallyPaid,
    },
  });

  if (!nowpayments.isSettled(snapshot.status)) return updated;

  const expected = Number(updated.expectedTrx);
  if (snapshot.actuallyPaid < expected * (1 - UNDERPAY_TOLERANCE)) {
    // Settled upstream but short of what the deal is worth. Funding on this
    // would hand the seller an escrow the buyer never covered, so it stops
    // here and stays visible as an underpayment for someone to sort out.
    console.warn(
      `[crypto:${escrow.id}] ${snapshot.status} but underpaid — ${snapshot.actuallyPaid} of ${expected} ${updated.payCurrency}`,
    );
    return prisma.cryptoEscrow.update({ where: { id: row.id }, data: { payStatus: "partially_paid" } });
  }

  if (escrow.status === "created") {
    try {
      await transition(escrow.id, "FUND", "system");
    } catch (err) {
      // Only a genuine failure is worth re-throwing. If the deal has since left
      // `created`, the other caller in the race funded it and this one is done.
      const now = await prisma.escrow.findUnique({ where: { id: escrow.id }, select: { status: true } });
      if (now?.status === "created") throw err;
    }
  }

  return prisma.cryptoEscrow.update({
    where: { id: row.id },
    data: { settledAt: updated.settledAt ?? new Date() },
  });
}

/** The deposit as the client sees it. */
export function serialize(escrow: Escrow, row: CryptoEscrow | null | undefined) {
  const expected = row ? Number(row.expectedTrx) : expectedFor(escrow);
  return {
    dealStatus: escrow.status,
    currency: escrow.currency,
    payCurrency: row?.payCurrency ?? env.NOWPAYMENTS_PAY_CURRENCY,
    expected,
    received: row ? Number(row.receivedTrx) : 0,
    payStatus: row?.payStatus ?? null,
    invoiceUrl: row?.invoiceUrl ?? null,
    depositAddress: row?.depositAddress ?? null,
    depositTxid: row?.depositTxid ?? null,
    /** Tronscan is the block explorer the proposal names — link the deposit if we have one. */
    explorerUrl: row?.depositTxid ? `https://shasta.tronscan.org/#/transaction/${row.depositTxid}` : null,
    settledAt: row?.settledAt?.toISOString() ?? null,
    /** True once the deal itself has moved on — the client can stop polling. */
    funded: escrow.status !== "created",
    dead: row ? nowpayments.isDead(row.payStatus) : false,
  };
}

export type CryptoDepositView = ReturnType<typeof serialize>;
