import { randomBytes } from "node:crypto";
import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type {
  Currency,
  Prisma,
  TransactionType,
  WithdrawalStatus,
} from "../../generated/prisma/client";
import { feeMathP, toPesewas, fromPesewas } from "../escrows/money";
import * as paystack from "../../shared/lib/paystack";
import { paystackEnabled } from "../../shared/config/env";
import { mailer } from "../../shared/mail/mail.service";
import { notify, notifyAdmins } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

/**
 * The ledger, one balance per (user, currency). TaaS's double-entry ledger is
 * replaced by:
 *  - a Wallet row per currency the user actually touches, created on demand
 *  - atomic guarded updates (UPDATE ... WHERE balance >= X) instead of row locks
 *  - a Transaction row per movement (signed amounts: + credit, - debit)
 * Invariant kept from TaaS: money only ever moves inside the same DB
 * transaction as the state change that justifies it.
 *
 * BOTH rails settle through here — GHS and TRX differ only by the `currency`
 * argument. A TRX deposit credits the TRX wallet, funding a TRX deal debits it,
 * and releasing one credits the seller's TRX wallet, exactly as the fiat rail
 * has always worked. What the provider holds off-platform is float backing
 * those balances; the row here is the claim on it.
 *
 * Amounts are stored at 2dp for both currencies, so a TRX movement is rounded
 * to the hundredth of a coin. Deliberate — see money.ts.
 */

/** How an amount is written to the user in that currency. */
export function formatAmount(amount: number, currency: Currency): string {
  return currency === "GHS" ? `GH₵ ${amount.toFixed(2)}` : `${amount.toFixed(2)} TRX`;
}

/** Human-legible payout reference, and the row's idempotency key. */
const newWithdrawalRef = () => `wd_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;

type WithdrawalRow = {
  id: string;
  reference: string;
  amount: Prisma.Decimal;
  currency: Currency;
  destination: string;
  status: WithdrawalStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

/** One payout as every client sees it — user history and the admin queue alike. */
export function serializeWithdrawal(w: WithdrawalRow) {
  return {
    id: w.id,
    reference: w.reference,
    amount: Number(w.amount),
    currency: w.currency,
    destination: w.destination,
    status: w.status,
    reviewNote: w.reviewNote,
    reviewedAt: w.reviewedAt?.toISOString() ?? null,
    createdAt: w.createdAt.toISOString(),
  };
}

/** The wallet a deal settles through: a deal's currency IS its rail's currency. */
export const walletCurrencyFor = (escrow: { currency: Currency }): Currency => escrow.currency;

async function ensureWallet(tx: Tx, userId: string, currency: Currency) {
  return tx.wallet.upsert({
    where: { userId_currency: { userId, currency } },
    create: { userId, currency },
    update: {},
  });
}

/** Credit — always succeeds. */
export async function credit(
  tx: Tx,
  userId: string,
  currency: Currency,
  amount: number,
  type: TransactionType,
  note: string,
  escrowId?: string,
) {
  const wallet = await ensureWallet(tx, userId, currency);
  await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
  await tx.transaction.create({
    data: { walletId: wallet.id, type, amount, note, escrowId },
  });
}

/** Debit with an atomic sufficient-balance guard (the TaaS overdraft check, one statement). */
export async function debitGuarded(
  tx: Tx,
  userId: string,
  currency: Currency,
  amount: number,
  type: TransactionType,
  note: string,
  escrowId?: string,
) {
  const wallet = await ensureWallet(tx, userId, currency);
  const updated = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count === 0) {
    // Report the shortfall, not the total: "you need GH₵ 50" reads as though an
    // existing GH₵ 40 balance doesn't count toward it.
    const short = Math.max(0, amount - Number(wallet.balance));
    throw ApiError.badRequest(`Insufficient wallet balance — add ${formatAmount(short, currency)} to cover this`);
  }
  await tx.transaction.create({
    data: { walletId: wallet.id, type, amount: -amount, note, escrowId },
  });
}

// ---------- API surface ----------

export async function getWallet(userId: string, currency: Currency = "GHS") {
  // Read-only on purpose: looking at a balance must not bring a wallet into
  // existence. `ensureWallet` is the only thing that creates one, so a row
  // means money has actually moved in that currency — a user who never touches
  // crypto never gets a TRX row, and the admin user panel stays free of empty
  // ones. GHS is created at signup (auth.service), so it is normally present.
  const wallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });

  // Escrow-locked = Σ fundingTotal of funded-and-live deals as buyer or seller.
  // Scoped by the deal's currency, not its rail: a GHS balance must not be
  // reduced by TRX a deal locked, and vice versa.
  // `created` is excluded: an unfunded deal hasn't debited the wallet yet, so
  // counting it would understate available balance.
  const active = await prisma.escrow.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      currency,
      status: { in: ["funded", "delivered", "disputed"] },
    },
    select: { amount: true, feeAmount: true },
  });
  const escrowLockedP = active.reduce(
    (sum, e) => sum + feeMathP(toPesewas(Number(e.amount)), toPesewas(Number(e.feeAmount))).fundingTotalP,
    0,
  );

  // There is no clearance hold: a payout the buyer has released is the seller's
  // money immediately, so `balance` is the wallet row as stored. The 24h window
  // that used to sit here was enforced by a read-then-act check on top of an
  // atomic guard that knew nothing about it, which made it raceable — and with
  // admin rulings final and disputes only openable before release, it was not
  // buying a window anyone acted in.
  return {
    currency,
    // No row yet means nothing has ever landed, so zero. `escrowLocked` is
    // still computed either way — it comes from the deals, not the wallet, and
    // a seller can be owed TRX by a funded deal before ever holding any.
    balance: wallet ? Number(wallet.balance) : 0,
    escrowLocked: fromPesewas(escrowLockedP),
  };
}

/**
 * Every balance the user actually holds, GHS first.
 *
 * GHS is always present — it is created at signup and is the wallet everyone
 * has, whether or not they ever touch crypto. TRX is included only once a row
 * exists, which happens the first time TRX genuinely moves (see ensureWallet).
 * So a fiat-only user is never offered a crypto wallet they don't have, and
 * the list grows the moment their first deposit or payout lands.
 *
 * The single-wallet response shape is kept alongside this (see the controller)
 * so existing clients keep working — the web and mobile apps both read
 * `balance`/`escrowLocked` off the top level today.
 */
export async function getWallets(userId: string) {
  const held = await prisma.wallet.findMany({ where: { userId }, select: { currency: true } });
  const currencies: Currency[] = held.some((w) => w.currency === "TRX") ? ["GHS", "TRX"] : ["GHS"];
  return Promise.all(currencies.map((c) => getWallet(userId, c)));
}

/** Simulated momo top-up — instant. Kept as the dev-complete fallback when
 *  Paystack isn't configured. */
export async function deposit(userId: string, amount: number) {
  await prisma.$transaction((tx) =>
    credit(tx, userId, "GHS", amount, "deposit", "Mobile money deposit (simulated)"),
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
    // Paystack settles fiat only — the intent is created with currency GHS.
    await credit(
      tx,
      intent.userId,
      "GHS",
      Number(intent.amount),
      "deposit",
      `Wallet deposit via Paystack (${reference})`,
    );
    return true;
  });

  // Only on the call that actually flipped the intent — settleDeposit runs from
  // both the webhook and the poll fallback, and the loser of that race must not
  // notify a second time.
  if (credited) {
    void notify({
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
export async function withdraw(
  userId: string,
  amount: number,
  destination: string,
  currency: Currency = "GHS",
  /**
   * Client-minted idempotency key, reused across retries of one payout.
   *
   * Absent from older clients, which then get a generated one and no
   * protection: two taps are two payouts. That is what this exists to stop.
   */
  reference?: string,
) {
  // Friendly pre-check only. Correctness is the atomic guard inside
  // debitGuarded — this exists so the common case reads as a payout problem
  // ("you have X available") rather than a top-up one, and a lost race just
  // surfaces the guard's message instead.
  const walletState = await getWallet(userId, currency);
  if (walletState.balance < amount) {
    throw ApiError.badRequest(
      `Insufficient balance — you have ${formatAmount(walletState.balance, currency)} available to withdraw.`,
    );
  }

  // A TRX payout is a transfer to the address on file, not a momo cash-out.
  const note =
    currency === "GHS"
      ? `Mobile money payout to ${destination}`
      : `TRX payout to ${destination}`;

  const payoutRef = reference ?? newWithdrawalRef();

  // Debit and record together. The debit happens now rather than on approval so
  // one balance cannot back several pending requests at once; the Withdrawal
  // row is what an admin later completes or reverses.
  let withdrawal;
  let replayed = false;
  try {
    withdrawal = await prisma.$transaction(async (tx) => {
      await debitGuarded(tx, userId, currency, amount, "withdrawal", note);
      return tx.withdrawal.create({
        data: { userId, reference: payoutRef, amount, currency, destination },
      });
    });
  } catch (err) {
    /*
      The reference is already taken, so this is a resubmission of a payout that
      already exists — a double tap, or a retry after a response was lost.

      Answer with the original rather than an error. The debit above rolled back
      with the failed insert, so nothing was taken twice, and a client that never
      saw the first response gets the same result it would have got then. Raising
      a conflict here would be correct about the database and useless to the
      caller, who cannot tell it apart from a genuine failure.
    */
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
      const existing = await prisma.withdrawal.findUnique({ where: { reference: payoutRef } });
      // A key belonging to somebody else is not a replay, it is a probe — and
      // answering would hand over another user's payout details.
      if (!existing || existing.userId !== userId) {
        throw ApiError.badRequest("That payout reference is already in use");
      }
      withdrawal = existing;
      replayed = true;
    } else {
      throw err;
    }
  }

  // Only on a genuine first submission: a replay must not send a second receipt
  // for money that moved once.
  if (!replayed) {
    // Money-movement receipt — always sent (not gated by shipment prefs).
    prisma.user
      .findUnique({ where: { id: userId }, select: { email: true, fullName: true } })
      // Pre-formatted with its currency — the template no longer hardcodes GH₵,
      // since this receipt now covers TRX payouts too.
      .then((u) => u && mailer.withdrawal(u.email, u.fullName, formatAmount(amount, currency), destination))
      .catch(() => undefined);

    void notify({
      userId,
      category: "wallet",
      title: "Withdrawal requested",
      // Deliberately not "sent": the money has left their balance but not yet the
      // platform. Saying "sent" here is what would make a later rejection read as
      // money going missing.
      body: `${formatAmount(amount, currency)} to ${destination} is awaiting review.`,
      link: "/wallet",
    });

    /*
      And tell the admins, because somebody has to act on this.

      Every other queue announces itself on submission — KYC, listing appeals,
      reports, disputes all call `notifyAdmins` — and payouts were the one that
      did not, which left the review queue as the only console screen with no
      live signal behind it. It is also the queue where waiting costs the most:
      the money is already out of the seller's balance and sitting nowhere until
      someone rules.
    */
    void notifyAdmins({
      category: "wallet",
      title: "Payout awaiting review",
      body: `${formatAmount(amount, currency)} to ${destination} is waiting to be sent or refused.`,
      link: "/admin/withdrawals",
    });
  }

  return { wallet: await getWallet(userId, currency), withdrawal: serializeWithdrawal(withdrawal) };
}

/** The user's own payout history, newest first. */
export async function listWithdrawals(
  userId: string,
  page: number,
  limit: number,
  currency: Currency = "GHS",
  status: WithdrawalStatus | "all" = "all",
) {
  // Scoped to one currency, like the transaction ledger — the wallet page shows
  // one rail at a time and a TRX payout in the cedi list would read as an error.
  //
  // `status` lets the wallet page ask for only what is still in flight: a
  // settled payout is already in the ledger below as a `withdrawal` row, so
  // repeating it here would just be the same fact twice.
  const where = { userId, currency, ...(status === "all" ? {} : { status }) };
  const [total, rows] = await Promise.all([
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    withdrawals: rows.map(serializeWithdrawal),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listTransactions(
  userId: string,
  page: number,
  limit: number,
  currency: Currency = "GHS",
) {
  // Read-only, like getWallet: asking for a ledger must not create the wallet
  // it would belong to. No wallet means no movements have ever been recorded,
  // which is an empty page rather than an error.
  const wallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  if (!wallet) {
    return { transactions: [], currency, total: 0, page, pages: 1 };
  }

  const where = { walletId: wallet.id };
  // Concurrent, not transactional — see the note in listings.service list().
  const [total, rows] = await Promise.all([
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
    currency,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
