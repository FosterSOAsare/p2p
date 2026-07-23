import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { KycStatus, Prisma } from "../../generated/prisma/client";

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
