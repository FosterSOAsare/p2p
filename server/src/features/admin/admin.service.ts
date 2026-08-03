import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type {
  AccountStatus,
  DisputeOutcome,
  EscrowStatus,
  KycStatus,
  Prisma,
  UserRole,
} from "../../generated/prisma/client";
import { transition } from "../escrows/escrows.service";
import { listDealTranscript, postDealMessage } from "../messages/messages.service";

// ---------- KYC review queue ----------

const kycWithUser = {
  user: { select: { id: true, username: true, email: true, avatarUrl: true, createdAt: true } },
} satisfies Prisma.KycProfileInclude;

type KycWithUser = Prisma.KycProfileGetPayload<{ include: typeof kycWithUser }>;

export async function listKyc(status: KycStatus) {
  const rows = await prisma.kycProfile.findMany({
    where: { status },
    orderBy: { createdAt: "asc" }, // oldest submissions first
    include: kycWithUser,
  });
  return rows.map(toAdminKyc);
}

export async function getKyc(id: string) {
  const kyc = await prisma.kycProfile.findUnique({ where: { id }, include: kycWithUser });
  if (!kyc) throw ApiError.notFound("KYC submission not found");
  return toAdminKyc(kyc);
}

export async function approveKyc(adminId: string, id: string) {
  await assertPending(id);
  const kyc = await prisma.kycProfile.update({
    where: { id },
    data: { status: "verified", rejectionReason: null, reviewedById: adminId, reviewedAt: new Date() },
    include: kycWithUser,
  });
  return toAdminKyc(kyc);
}

export async function rejectKyc(adminId: string, id: string, reason: string) {
  await assertPending(id);
  const kyc = await prisma.kycProfile.update({
    where: { id },
    data: { status: "rejected", rejectionReason: reason, reviewedById: adminId, reviewedAt: new Date() },
    include: kycWithUser,
  });
  return toAdminKyc(kyc);
}

async function assertPending(id: string) {
  const kyc = await prisma.kycProfile.findUnique({ where: { id } });
  if (!kyc) throw ApiError.notFound("KYC submission not found");
  if (kyc.status !== "pending") {
    throw ApiError.conflict(`This submission was already ${kyc.status} — only pending submissions can be reviewed`);
  }
}

function toAdminKyc(kyc: KycWithUser) {
  return {
    id: kyc.id,
    status: kyc.status,
    legalName: kyc.legalName,
    storeName: kyc.storeName,
    taxId: kyc.taxId,
    country: kyc.country,
    address: kyc.address,
    idType: kyc.idType,
    idNumber: kyc.idNumber,
    momoNumber: kyc.momoNumber,
    trxAddress: kyc.trxAddress,
    rejectionReason: kyc.rejectionReason,
    submittedAt: kyc.createdAt.toISOString(),
    reviewedAt: kyc.reviewedAt?.toISOString() ?? null,
    user: {
      id: kyc.user.id,
      username: kyc.user.username,
      email: kyc.user.email,
      avatarUrl: kyc.user.avatarUrl,
      joinedAt: kyc.user.createdAt.toISOString(),
    },
  };
}

// ---------- Disputes review & resolution ----------

export async function listDisputes(status: "open" | "resolved" | "all") {
  const where = status === "all" ? {} : { status };
  const rows = await prisma.dispute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      escrow: {
        select: {
          id: true,
          code: true,
          title: true,
          amount: true,
          currency: true,
          status: true,
          buyer: { select: { id: true, username: true, avatarUrl: true } },
          seller: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { messages: true } },
        },
      },
      openedBy: { select: { id: true, username: true } },
      resolvedBy: { select: { id: true, username: true } },
    },
  });

  return rows.map((d) => ({
    id: d.id,
    escrowId: d.escrowId,
    status: d.status,
    reason: d.reason,
    description: d.description,
    outcome: d.outcome,
    ruledAmountBuyer: d.ruledAmountBuyer ? Number(d.ruledAmountBuyer) : null,
    ruledAmountSeller: d.ruledAmountSeller ? Number(d.ruledAmountSeller) : null,
    rulingNote: d.rulingNote,
    createdAt: d.createdAt.toISOString(),
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    escrow: {
      id: d.escrow.id,
      code: d.escrow.code,
      title: d.escrow.title,
      amount: Number(d.escrow.amount),
      currency: d.escrow.currency,
      status: d.escrow.status,
      buyer: d.escrow.buyer,
      seller: d.escrow.seller,
      // Deal-linked system notices only — the parties' chat isn't stamped with
      // escrowId, so this is a lifecycle count, not a conversation length.
      noticeCount: d.escrow._count.messages,
    },
    openedBy: d.openedBy,
    resolvedBy: d.resolvedBy,
  }));
}

export async function getDispute(id: string) {
  const d = await prisma.dispute.findUnique({
    where: { id },
    include: {
      escrow: {
        include: {
          buyer: { select: { id: true, username: true, avatarUrl: true, email: true } },
          seller: { select: { id: true, username: true, avatarUrl: true, email: true } },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
      openedBy: { select: { id: true, username: true, avatarUrl: true } },
      resolvedBy: { select: { id: true, username: true } },
    },
  });

  if (!d) throw ApiError.notFound("Dispute not found");

  // Evidence = what the parties actually said about this deal. Starts at the
  // deal's first system notice; runs to the ruling, or to now while still open
  // (post-dispute messages are where the parties argue their case).
  const transcript =
    d.escrow.buyerId && d.escrow.sellerId
      ? await listDealTranscript(d.escrowId, d.escrow.buyerId, d.escrow.sellerId, {
          fallbackFrom: d.escrow.createdAt,
          until: d.resolvedAt,
        })
      : [];

  return {
    id: d.id,
    escrowId: d.escrowId,
    status: d.status,
    reason: d.reason,
    description: d.description,
    outcome: d.outcome,
    ruledAmountBuyer: d.ruledAmountBuyer ? Number(d.ruledAmountBuyer) : null,
    ruledAmountSeller: d.ruledAmountSeller ? Number(d.ruledAmountSeller) : null,
    rulingNote: d.rulingNote,
    createdAt: d.createdAt.toISOString(),
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    escrow: {
      id: d.escrow.id,
      code: d.escrow.code,
      title: d.escrow.title,
      amount: Number(d.escrow.amount),
      feeAmount: Number(d.escrow.feeAmount),
      currency: d.escrow.currency,
      status: d.escrow.status,
      buyer: d.escrow.buyer,
      seller: d.escrow.seller,
      messages: transcript,
      events: d.escrow.events,
    },
    openedBy: d.openedBy,
    resolvedBy: d.resolvedBy,
  };
}

export async function resolveDispute(
  adminId: string,
  id: string,
  input: { outcome: "release" | "refund" | "split"; buyerRefund?: number; rulingNote: string },
) {
  const d = await prisma.dispute.findUnique({ where: { id }, include: { escrow: true } });
  if (!d) throw ApiError.notFound("Dispute not found");
  if (d.status !== "open") throw ApiError.conflict("This dispute is already resolved");

  const totalAmount = Number(d.escrow.amount);
  let ruledBuyer = 0;
  let ruledSeller = 0;

  if (input.outcome === "release") {
    ruledSeller = totalAmount;
    await transition(d.escrowId, "RESOLVE_RELEASE", "system");
  } else if (input.outcome === "refund") {
    ruledBuyer = totalAmount;
    await transition(d.escrowId, "RESOLVE_REFUND", "system");
  } else if (input.outcome === "split") {
    ruledBuyer = input.buyerRefund ?? 0;
    ruledSeller = Math.max(0, totalAmount - ruledBuyer);
    await transition(d.escrowId, "RESOLVE_PARTIAL", "system", { buyerRefund: ruledBuyer });
  }

  const updated = await prisma.dispute.update({
    where: { id },
    data: {
      status: "resolved",
      outcome: input.outcome as DisputeOutcome,
      ruledAmountBuyer: ruledBuyer,
      ruledAmountSeller: ruledSeller,
      rulingNote: input.rulingNote,
      resolvedById: adminId,
      resolvedAt: new Date(),
    },
  });

  // Post resolution announcement in deal chat
  if (d.escrow.buyerId && d.escrow.sellerId) {
    const verdictText =
      input.outcome === "refund"
        ? "Full refund granted to buyer."
        : input.outcome === "release"
        ? "Payout released to seller."
        : `Split ruling: GH₵ ${ruledBuyer.toFixed(2)} to buyer / GH₵ ${ruledSeller.toFixed(2)} to seller.`;

    await postDealMessage(
      d.escrow.buyerId,
      d.escrow.sellerId,
      `⚖️ Official Admin Ruling Verdict: ${verdictText}\nNote: "${input.rulingNote}"`,
      d.escrowId,
    ).catch(() => undefined);
  }

  return getDispute(updated.id);
}

// ---------- User management ----------

const userRowSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  kyc: { select: { status: true } },
  _count: { select: { escrowsAsBuyer: true, escrowsAsSeller: true, listings: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userRowSelect }>;

function toAdminUserRow(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    status: u.status,
    kycStatus: u.kyc?.status ?? "unverified",
    emailVerified: Boolean(u.emailVerifiedAt),
    dealsAsBuyer: u._count.escrowsAsBuyer,
    dealsAsSeller: u._count.escrowsAsSeller,
    listingsCount: u._count.listings,
    joinedAt: u.createdAt.toISOString(),
  };
}

export async function listUsers(params: {
  search?: string;
  role?: UserRole;
  status?: AccountStatus;
  page: number;
  limit: number;
}) {
  const { search, role, status, page, limit } = params;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: userRowSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: rows.map(toAdminUserRow),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getUser(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: { ...userRowSelect, phone: true, wallets: { select: { currency: true, balance: true } } },
  });
  if (!u) throw ApiError.notFound("User not found");
  return {
    ...toAdminUserRow(u),
    phone: u.phone,
    wallets: u.wallets.map((w) => ({ currency: w.currency, balance: Number(w.balance) })),
  };
}

export async function setUserStatus(adminId: string, id: string, status: AccountStatus) {
  if (id === adminId) throw ApiError.badRequest("You cannot change your own account status");
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw ApiError.notFound("User not found");
  const updated = await prisma.user.update({ where: { id }, data: { status }, select: userRowSelect });
  return toAdminUserRow(updated);
}

// ---------- Escrow deals oversight (read-only) ----------

const dealPartySelect = { id: true, username: true, avatarUrl: true } satisfies Prisma.UserSelect;

export async function listEscrows(params: {
  status?: EscrowStatus;
  search?: string;
  page: number;
  limit: number;
}) {
  const { status, search, page, limit } = params;
  const where: Prisma.EscrowWhereInput = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.escrow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        title: true,
        amount: true,
        feeAmount: true,
        currency: true,
        rail: true,
        status: true,
        createdAt: true,
        buyer: { select: dealPartySelect },
        seller: { select: dealPartySelect },
        dispute: { select: { id: true, status: true } },
      },
    }),
    prisma.escrow.count({ where }),
  ]);

  return {
    deals: rows.map((d) => ({
      id: d.id,
      code: d.code,
      title: d.title,
      amount: Number(d.amount),
      feeAmount: Number(d.feeAmount),
      currency: d.currency,
      rail: d.rail,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      buyer: d.buyer,
      seller: d.seller,
      hasOpenDispute: d.dispute?.status === "open",
      disputeId: d.dispute?.id ?? null,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ---------- Platform stats (admin dashboard) ----------

export async function getStats() {
  const [users, suspendedUsers, activeListings, kycPending, openDisputes, dealGroups, volume] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "suspended" } }),
      prisma.listing.count({ where: { status: "active" } }),
      prisma.kycProfile.count({ where: { status: "pending" } }),
      prisma.dispute.count({ where: { status: "open" } }),
      prisma.escrow.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.escrow.aggregate({ _sum: { amount: true }, where: { status: "disbursed" } }),
    ]);

  const dealsByStatus: Record<EscrowStatus, number> = {
    created: 0,
    funded: 0,
    delivered: 0,
    disbursed: 0,
    disputed: 0,
    cancelled: 0,
  };
  for (const g of dealGroups) dealsByStatus[g.status] = g._count._all;
  const totalDeals = Object.values(dealsByStatus).reduce((a, b) => a + b, 0);

  return {
    users,
    suspendedUsers,
    activeListings,
    kycPending,
    openDisputes,
    totalDeals,
    dealsByStatus,
    // Completed (disbursed) GHS volume — the only "settled" money in the simulated fiat rail.
    ghsVolume: Number(volume._sum.amount ?? 0),
  };
}
