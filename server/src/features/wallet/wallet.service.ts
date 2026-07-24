import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { Prisma, TransactionType } from "../../generated/prisma/client";
import { feeMathP, toPesewas, fromPesewas } from "../escrows/money";

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
    throw ApiError.badRequest(`Insufficient wallet balance — you need GH₵ ${amount.toFixed(2)}`);
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

  // Escrow-locked = Σ fundingTotal of active fiat deals as buyer or seller (funded, delivered, disputed)
  const active = await prisma.escrow.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      rail: "fiat",
      status: { in: ["created", "funded", "delivered", "disputed"] },
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

/** Simulated momo top-up — instant. */
export async function deposit(userId: string, amount: number) {
  await prisma.$transaction((tx) =>
    credit(tx, userId, amount, "deposit", "Mobile money deposit (simulated)"),
  );
  return getWallet(userId);
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
