import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { KycProfile } from "../../generated/prisma/client";
import type { KycStatusResponse, KycSubmissionInput } from "./kyc.model";

/**
 * Submit (or resubmit after rejection). Pending and verified submissions can't
 * be overwritten — the review queue is the only path out of those states.
 */
export async function submit(userId: string, input: KycSubmissionInput): Promise<KycStatusResponse> {
  const existing = await prisma.kycProfile.findUnique({ where: { userId } });
  if (existing?.status === "verified") throw ApiError.conflict("Your identity is already verified");
  if (existing?.status === "pending") throw ApiError.conflict("Your submission is already under review");

  const data = {
    legalName: input.legalName,
    storeName: input.storeName,
    taxId: input.taxId || null,
    country: input.country,
    address: input.address,
    idType: input.idType,
    idNumber: input.idNumber,
    momoNumber: input.momoNumber || null,
    trxAddress: input.trxAddress || null,
  };

  const kyc = await prisma.kycProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data, status: "pending", rejectionReason: null, reviewedById: null, reviewedAt: null },
  });
  return toStatusResponse(kyc);
}

export async function getMine(userId: string): Promise<KycStatusResponse> {
  const kyc = await prisma.kycProfile.findUnique({ where: { userId } });
  if (!kyc) return { status: "unverified" };
  return toStatusResponse(kyc);
}

function toStatusResponse(kyc: KycProfile): KycStatusResponse {
  return {
    status: kyc.status,
    rejectionReason: kyc.rejectionReason,
    submittedAt: kyc.createdAt.toISOString(),
    reviewedAt: kyc.reviewedAt?.toISOString() ?? null,
    submission: {
      legalName: kyc.legalName,
      storeName: kyc.storeName,
      taxId: kyc.taxId,
      country: kyc.country,
      address: kyc.address,
      idType: kyc.idType,
      idNumber: kyc.idNumber,
      momoNumber: kyc.momoNumber,
      trxAddress: kyc.trxAddress,
    },
  };
}
