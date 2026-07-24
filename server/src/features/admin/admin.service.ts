import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { DisputeOutcome, KycStatus, Prisma } from "../../generated/prisma/client";
import { transition } from "../escrows/escrows.service";
import { postDealMessage } from "../messages/messages.service";

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
      messageCount: d.escrow._count.messages,
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
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
          },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
      openedBy: { select: { id: true, username: true, avatarUrl: true } },
      resolvedBy: { select: { id: true, username: true } },
    },
  });

  if (!d) throw ApiError.notFound("Dispute not found");

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
      messages: d.escrow.messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender,
      })),
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
