import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { env, nowpaymentsEnabled, nowpaymentsTrustStatus } from "../../shared/config/env";
import * as nowpayments from "../../shared/lib/nowpayments";
import type { CryptoEscrow, Escrow } from "../../generated/prisma/client";
import { breakdown } from "./money";
import { resolveReturnUrl } from "./return-url";
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

/**
 * How far below the invoiced amount still counts as paid, as a fraction.
 *
 * The provider has its own underpayment tolerance and flags anything past it
 * `partially_paid`; this is the second lock on the same door, so a status that
 * says "finished" over a materially short transfer still cannot fund a deal.
 */
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
export async function startDeposit(userId: string, escrowId: string, returnUrl?: string) {
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

  /*
    Where this invoice will send the buyer back to — resolved *before* the reuse
    check below, because it is one of the things that decides whether a live
    invoice is still the right one.

    Also means a malformed or disallowed `returnUrl` is refused even when an
    invoice already exists, rather than being quietly ignored because the early
    return fired first.
  */
  const returnBase = resolveReturnUrl(
    returnUrl,
    `${env.WEB_ORIGIN}/escrow/${escrow.id}/crypto/callback`,
  );

  /*
    Reuse a live invoice, but only while it is still the right one in both
    respects.

    The amount matters because a deal is editable until it is funded, so a price
    change mid-flow would leave the buyer paying yesterday's total.

    The destination matters for the same kind of reason, and was missing: the
    success URL is baked into the invoice at the provider and cannot be re-read
    or amended, so an invoice opened while `WEB_ORIGIN` was `localhost` kept
    sending buyers to localhost forever, and one opened on the web and then
    reused by the phone dropped the buyer into the web app instead of back into
    the app. Rows created before this was recorded have `returnUrl` null, which
    reads as "unknown" and therefore stale — so the next attempt replaces them.

    A stale invoice is replaced on the same terms as a dead one: new invoice,
    new orderRef, so the old one's callbacks can never be mistaken for the new.
  */
  const existing = escrow.crypto;
  const amountChanged = existing ? Math.abs(Number(existing.expectedTrx) - expected) > 1e-6 : false;
  const destinationChanged = existing ? existing.returnUrl !== returnBase : false;
  const stale = amountChanged || destinationChanged;

  if (existing?.invoiceUrl && !nowpayments.isDead(existing.payStatus) && !stale) {
    return serialize(escrow, existing);
  }

  const orderRef = nowpayments.newOrderRef(escrow.code);

  /*
    The web wants its own callback route; the phone wants a deep link back into
    the app, because that redirect is the only place NOWPayments discloses the
    payment id before an IPN arrives (see return-url.ts). Hard-coding
    `WEB_ORIGIN` here is what stranded mobile deposits on "waiting" after the
    buyer had already paid.

    `returnBase` was resolved and allowlisted above — an unvalidated redirect
    target on a payment page is an open redirect — falling back to the web
    callback when the client asks for nothing, which is what the web does.
  */
  const successUrl = `${returnBase}${returnBase.includes("?") ? "&" : "?"}ref=${encodeURIComponent(orderRef)}`;

  const invoice = await nowpayments.createInvoice({
    amount: expected,
    orderId: orderRef,
    description: `Escrow ${escrow.code} — ${escrow.title}`,
    successUrl,
    // Cancelling goes back where they came from too, so a phone doesn't strand
    // the buyer on the web app after they change their mind.
    cancelUrl: returnUrl ? returnBase : `${env.WEB_ORIGIN}/escrow/${escrow.id}`,
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
      // Recorded so the next call can tell whether this invoice still points
      // where the caller wants to come back to.
      returnUrl: returnBase,
      payCurrency: env.NOWPAYMENTS_PAY_CURRENCY,
      expectedTrx: expected,
    },
    update: {
      orderRef,
      invoiceId: invoice.invoiceId,
      invoiceUrl: invoice.invoiceUrl,
      returnUrl: returnBase,
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
  const settled = nowpayments.isSettled(snapshot.status);

  // What to record as received: the provider's own count when it gives one,
  // otherwise — on a settled status — the amount the invoice asked for.
  //
  // The sandbox never gives one. A payment created with an explicit
  // `case: "success"` still walks to `finished` carrying `actually_paid: 0`
  // and `payin_hash: null`, because no transfer is ever simulated; checked
  // against the sandbox directly, and it stays 0 long after settling. So the
  // amount is not independently verified here — a settled status is taken at
  // its word, which is the same bet the provider's own contract makes when it
  // promises a short transfer arrives as `partially_paid`, never `finished`.
  //
  // That is sound ONLY because this build is sandbox/testnet by design: real
  // processing and mainnet crypto are out of scope per the project proposal.
  // GOING LIVE MEANS RESTORING AN AMOUNT CHECK HERE. Without one, a provider
  // that ever reported `finished` over a short payment would fund an escrow
  // the buyer never covered, and the seller would be paid out of it.
  //
  // That warning is now enforced rather than remembered. The substitution is
  // gated on `nowpaymentsTrustStatus()`, which requires both an explicit
  // `NOWPAYMENTS_TRUST_STATUS=true` and a sandbox base URL — so pointing this
  // build at live keys restores the amount check by itself, with no edit here
  // and nothing to forget. Unset it and the guard below bites in the sandbox too.
  const expected = Number(row.expectedTrx);
  const sandboxTrust = nowpaymentsTrustStatus();
  const received =
    snapshot.actuallyPaid > 0 ? snapshot.actuallyPaid : settled && sandboxTrust ? expected : 0;

  const updated = await prisma.cryptoEscrow.update({
    where: { id: row.id },
    data: {
      paymentId: snapshot.paymentId || row.paymentId,
      payStatus: snapshot.status,
      payCurrency: snapshot.payCurrency || row.payCurrency,
      depositAddress: snapshot.payAddress ?? row.depositAddress,
      depositTxid: snapshot.payinHash ?? row.depositTxid,
      receivedTrx: received,
    },
  });

  if (!settled) return updated;

  /*
    The guard runs against `received`, not `snapshot.actuallyPaid`.

    That distinction is the whole reconciliation between two approaches to the
    same sandbox problem. `received` above already substitutes the invoiced
    amount when the provider reports a settled payment with `actually_paid: 0`
    — but only in the sandbox, and only with the flag. So in the sandbox this
    passes and the deal funds; in production `received` is whatever actually
    arrived and the check below bites exactly as before.

    Checking `snapshot.actuallyPaid` here instead would contradict the row we
    just wrote: the deposit would be recorded as fully received and the deal
    still refused to fund.
  */
  const short = received < expected * (1 - UNDERPAY_TOLERANCE);

  if (settled && sandboxTrust && snapshot.actuallyPaid <= 0) {
    // Loud on every settlement it affects, not once at boot: if this ever fires
    // where it shouldn't, the evidence should be impossible to miss.
    console.warn(
      `[crypto:${escrow.id}] SANDBOX: settling on provider status "${snapshot.status}" alone — ` +
        `the provider reported 0 of ${expected} ${updated.payCurrency}. ` +
        `The amount is not verified here and this must never run against live keys.`,
    );
  }

  if (short) {
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
