import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { Prisma, TransactionType } from "../../generated/prisma/client";
import { feeMathP, toPesewas, fromPesewas } from "../escrows/money";
import * as paystack from "../../shared/lib/paystack";
import { paystackEnabled } from "../../shared/config/env";
import { mailer } from "../../shared/mail/mail.service";
import { notify } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

/**
 * Simulated GHS rail. TaaS's double-entry ledger is replaced by:
 *  - one balance per user (Wallet row, created at signup)
 *  - atomic guarded updates (UPDATE ... WHERE balance >= X) instead of row locks
 *  - a Transaction row per movement (signed amounts: + credit, - debit)
 * Invariant kept from TaaS: money only ever moves inside the same DB
 * transaction as the state change that justifies it.
 */

async function ensureWallet(tx: Tx, userId: string) {
  return tx.wallet.upsert({
    where: { userId_currency: { userId, currency: "GHS" } },
    create: { userId, currency: "GHS" },
    update: {},
  });
}

/** Credit — always succeeds. */
export async function credit(
  tx: Tx,
  userId: string,
  amount: number,
  type: TransactionType,
  note: string,
  escrowId?: string,
) {
  const wallet = await ensureWallet(tx, userId);
  await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
  await tx.transaction.create({
    data: { walletId: wallet.id, type, amount, note, escrowId },
  });
}

/** Debit with an atomic sufficient-balance guard (the TaaS overdraft check, one statement). */
export async function debitGuarded(
  tx: Tx,
  userId: string,
  amount: number,
  type: TransactionType,
  note: string,
  escrowId?: string,
) {
  const wallet = await ensureWallet(tx, userId);
  const updated = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count === 0) {
    // Report the shortfall, not the total: "you need GH₵ 50" reads as though an
    // existing GH₵ 40 balance doesn't count toward it.
    const short = Math.max(0, amount - Number(wallet.balance));
    throw ApiError.badRequest(`Insufficient wallet balance — add GH₵ ${short.toFixed(2)} to cover this`);
  }
  await tx.transaction.create({
    data: { walletId: wallet.id, type, amount: -amount, note, escrowId },
  });
}

// ---------- API surface ----------

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.upsert({
    where: { userId_currency: { userId, currency: "GHS" } },
    create: { userId, currency: "GHS" },
    update: {},
  });

  // Escrow-locked = Σ fundingTotal of funded-and-live fiat deals as buyer or seller.
  // `created` is excluded: an unfunded deal hasn't debited the wallet yet, so
  // counting it would understate available balance.
  const active = await prisma.escrow.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      rail: "fiat",
      status: { in: ["funded", "delivered", "disputed"] },
    },
    select: { amount: true, feeAmount: true },
  });
  const escrowLockedP = active.reduce(
    (sum, e) => sum + feeMathP(toPesewas(Number(e.amount)), toPesewas(Number(e.feeAmount))).fundingTotalP,
    0,
  );

  // Pending Clearance = payouts released to seller within the last 24h safety holding window.
  // Admin-resolved disputes skip the hold — the funds were released by admin ruling, so they
  // clear straight to available balance (no dispute → subject to the 24h hold).
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pendingClearanceDeals = await prisma.escrow.findMany({
    where: {
      sellerId: userId,
      rail: "fiat",
      status: "disbursed",
      disbursedAt: { gte: twentyFourHoursAgo },
      dispute: { is: null },
    },
    select: { amount: true, feeAmount: true },
  });
  const pendingClearanceP = pendingClearanceDeals.reduce((sum, e) => {
    const money = feeMathP(toPesewas(Number(e.amount)), toPesewas(Number(e.feeAmount)));
    return sum + money.sellerPayoutP;
  }, 0);

  const pendingClearance = fromPesewas(pendingClearanceP);
  const totalDbBalance = Number(wallet.balance);
  const clearedAvailableBalance = Math.max(0, totalDbBalance - pendingClearance);

  return {
    currency: "GHS" as const,
    balance: clearedAvailableBalance,
    pendingClearance,
    escrowLocked: fromPesewas(escrowLockedP),
  };
}

/** Simulated momo top-up — instant. Kept as the dev-complete fallback when
 *  Paystack isn't configured. */
export async function deposit(userId: string, amount: number) {
  await prisma.$transaction((tx) =>
    credit(tx, userId, amount, "deposit", "Mobile money deposit (simulated)"),
  );
  return getWallet(userId);
}

// ---------- Real deposit via Paystack (test mode) ----------

/**
 * Start a Paystack charge. Records a `pending` PaymentIntent (the reference is
 * the idempotency key) and hands back the hosted authorization URL. The wallet
 * is NOT credited here — only once the charge is confirmed via webhook or the
 * /verify poll.
 */
export async function initDeposit(userId: string, amount: number, method?: "momo" | "card") {
  if (!paystackEnabled()) {
    throw ApiError.notImplemented(
      "Paystack is not configured — top up with the simulated deposit (POST /wallet/deposit) instead",
    );
  }
  // The buyer already picked a method in our UI — carry it through so the hosted
  // page opens straight on it instead of asking twice.
  const channels: paystack.PaymentChannel[] | undefined =
    method === "momo" ? ["mobile_money"] : method === "card" ? ["card"] : undefined;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });
  const reference = paystack.newReference();
  await prisma.paymentIntent.create({
    data: { userId, reference, amount, currency: "GHS", provider: "paystack", status: "pending" },
  });
  try {
    const init = await paystack.initTransaction({
      email: user.email,
      amountPesewas: toPesewas(amount),
      reference,
      metadata: { userId },
      channels,
    });
    return { authorizationUrl: init.authorizationUrl, accessCode: init.accessCode, reference };
  } catch (err) {
    // Don't leave a dangling pending intent if the Paystack call failed.
    await prisma.paymentIntent.delete({ where: { reference } }).catch(() => undefined);
    throw err;
  }
}

type SettleStatus = "success" | "failed" | "pending" | "unknown" | "amount_mismatch" | string;

/**
 * Idempotently settle a deposit reference. The pending→success flip is a guarded
 * updateMany, so only the first caller (webhook OR poll) credits the wallet —
 * the other no-ops. `verify:true` (poll path, no signature) re-confirms with
 * Paystack; the webhook path trusts its already signature-verified payload.
 */
async function settleDeposit(
  reference: string,
  opts: { verify: boolean; payloadAmountPesewas?: number },
): Promise<{ credited: boolean; status: SettleStatus; userId?: string }> {
  const intent = await prisma.paymentIntent.findUnique({ where: { reference } });
  if (!intent) return { credited: false, status: "unknown" };
  if (intent.status !== "pending") {
    return { credited: false, status: intent.status, userId: intent.userId };
  }

  const intentAmountP = toPesewas(Number(intent.amount));
  const markFailed = () =>
    prisma.paymentIntent.updateMany({ where: { reference, status: "pending" }, data: { status: "failed" } });

  if (opts.verify) {
    const v = await paystack.verifyTransaction(reference);
    if (v.status !== "success") {
      if (v.status === "failed" || v.status === "abandoned") await markFailed();
      return { credited: false, status: v.status, userId: intent.userId };
    }
    if (v.currency !== "GHS" || v.amountPesewas < intentAmountP) {
      await markFailed();
      return { credited: false, status: "amount_mismatch", userId: intent.userId };
    }
  } else if (opts.payloadAmountPesewas != null && opts.payloadAmountPesewas < intentAmountP) {
    await markFailed();
    return { credited: false, status: "amount_mismatch", userId: intent.userId };
  }

  const credited = await prisma.$transaction(async (tx) => {
    const flip = await tx.paymentIntent.updateMany({
      where: { reference, status: "pending" },
      data: { status: "success", paidAt: new Date() },
    });
    if (flip.count === 0) return false; // another caller settled it first
    await credit(tx, intent.userId, Number(intent.amount), "deposit", `Wallet deposit via Paystack (${reference})`);
    return true;
  });

  // Only on the call that actually flipped the intent — settleDeposit runs from
  // both the webhook and the poll fallback, and the loser of that race must not
  // notify a second time.
  if (credited) {
    await notify({
      userId: intent.userId,
      category: "wallet",
      title: "Deposit confirmed",
      body: `GH₵ ${Number(intent.amount).toFixed(2)} was added to your wallet.`,
      link: "/wallet",
    });
  }

  return { credited, status: "success", userId: intent.userId };
}

/** Poll fallback for localhost (webhooks can't reach a laptop). Owner-scoped. */
export async function verifyDeposit(userId: string, reference: string) {
  const intent = await prisma.paymentIntent.findUnique({ where: { reference } });
  if (!intent || intent.userId !== userId) throw ApiError.notFound("Deposit not found");
  const result = await settleDeposit(reference, { verify: true });
  return { status: result.status, credited: result.credited, wallet: await getWallet(userId) };
}

/** Handle a signature-verified Paystack webhook event. */
export async function handlePaystackWebhook(event: {
  event?: string;
  data?: { reference?: string; amount?: number; status?: string };
}) {
  const reference = event.data?.reference;
  if (!reference) return;
  if (event.event === "charge.success") {
    await settleDeposit(reference, { verify: false, payloadAmountPesewas: event.data?.amount });
  } else if (event.event === "charge.failed") {
    await prisma.paymentIntent.updateMany({ where: { reference, status: "pending" }, data: { status: "failed" } });
  }
}

/** Simulated momo payout — instant settle at this scope. */
export async function withdraw(userId: string, amount: number, destination: string) {
  const walletState = await getWallet(userId);
  if (walletState.balance < amount) {
    throw ApiError.badRequest(
      `Insufficient cleared balance — you have GH₵ ${walletState.balance.toFixed(2)} available (GH₵ ${walletState.pendingClearance.toFixed(2)} is pending 24h clearance).`
    );
  }

  await prisma.$transaction((tx) =>
    debitGuarded(tx, userId, amount, "withdrawal", `Mobile money payout to ${destination} (simulated)`),
  );

  // Money-movement receipt — always sent (not gated by shipment prefs).
  prisma.user
    .findUnique({ where: { id: userId }, select: { email: true, fullName: true } })
    .then((u) => u && mailer.withdrawal(u.email, u.fullName, amount.toFixed(2), destination))
    .catch(() => undefined);

  await notify({
    userId,
    category: "wallet",
    title: "Withdrawal sent",
    body: `GH₵ ${amount.toFixed(2)} is on its way to ${destination}.`,
    link: "/wallet",
  });

  return getWallet(userId);
}

export async function listTransactions(userId: string, page: number, limit: number) {
  const wallet = await prisma.wallet.upsert({
    where: { userId_currency: { userId, currency: "GHS" } },
    create: { userId, currency: "GHS" },
    update: {},
  });
  const where = { walletId: wallet.id };
  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { escrow: { select: { id: true, title: true, code: true } } },
    }),
  ]);
  return {
    transactions: rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      note: t.note,
      escrow: t.escrow ? { id: t.escrow.id, title: t.escrow.title, code: t.escrow.code } : null,
      createdAt: t.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
