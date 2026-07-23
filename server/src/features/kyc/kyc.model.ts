/** DTOs for the KYC feature — single lightweight submission, admin-reviewed (docs/14 §14.3). */

export interface KycSubmissionInput {
  legalName: string;
  storeName: string;
  taxId?: string | null;
  country: string;
  address: string;
  idType: string;
  idNumber: string;
  /** Payout destinations — each optional, at least one required. */
  momoNumber?: string | null; // GHS payouts (simulated momo)
  trxAddress?: string | null; // TRX payouts (TRON Shasta address)
}

export interface KycStatusResponse {
  status: "unverified" | "pending" | "verified" | "rejected";
  rejectionReason?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  /** Echo of the last submission so the client can prefill a resubmission after rejection. */
  submission?: KycSubmissionInput;
}
