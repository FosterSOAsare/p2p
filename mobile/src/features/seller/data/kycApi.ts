import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * Vendor KYC — the gate between a buyer account and a seller one.
 *
 * "Seller" is not a role on the server; it is a user whose KYC has been
 * approved. So this submission is what starts the conversion, and an admin
 * approving it (`POST /api/admin/kyc/:id/approve`) is what completes it:
 *
 *   submit -> pending -> admin approves -> verified -> usePersona() === 'seller'
 *
 * Mirrors `web/src/features/seller/data/kycApi.ts`.
 */

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/** `GET /api/kyc/me` — an account with no profile yet answers `unverified`. */
export interface KycStatusResponse {
  status: KycStatus;
  rejectionReason?: string | null;
  submittedAt?: string;
  decidedAt?: string | null;
}

/** Exactly the body `kyc.validation.ts` accepts. */
export interface KycSubmission {
  legalName: string;
  storeName: string;
  taxId?: string;
  country: string;
  address: string;
  idType: 'Passport' | 'National ID' | 'Drivers License';
  idNumber: string;
  /** At least one payout account is required — momo or TRX, either will do. */
  momoNumber?: string;
  trxAddress?: string;
}

export const kycKeys = {
  all: ['kyc'] as const,
  mine: () => [...kycKeys.all, 'me'] as const,
};

/** The signed-in account's KYC standing, used to pick which panel to render. */
export function useMyKyc() {
  return useQuery({
    queryKey: kycKeys.mine(),
    queryFn: () => api<KycStatusResponse>('/api/kyc/me'),
    retry: false,
  });
}

/**
 * `POST /api/kyc`.
 *
 * On success the profile becomes `pending`, so two caches go stale: this
 * feature's own status, and the session — `/api/auth/me` carries `kycStatus`,
 * which is what `usePersona()` reads to decide buyer vs seller.
 */
export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: KycSubmission) =>
      api<KycStatusResponse>('/api/kyc', { method: 'POST', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kycKeys.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
