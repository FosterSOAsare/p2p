import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { authKeys } from '../../auth/data/authApi'

export interface KycSubmission {
  legalName: string
  storeName: string
  taxId?: string | null
  country: string
  address: string
  idType: string
  idNumber: string
  /** Payout destinations — each optional, at least one required. */
  momoNumber?: string | null
  trxAddress?: string | null
}

export interface KycMe {
  status: 'unverified' | 'pending' | 'verified' | 'rejected'
  rejectionReason?: string | null
  submittedAt?: string
  reviewedAt?: string | null
  submission?: KycSubmission
}

export const kycKeys = {
  me: ['kyc', 'me'] as const,
}

export function useKycStatus() {
  return useQuery({
    queryKey: kycKeys.me,
    queryFn: () => api<KycMe>('/api/kyc/me'),
    retry: false,
  })
}

export function useSubmitKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: KycSubmission) => api<KycMe>('/api/kyc', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kycKeys.me })
      queryClient.invalidateQueries({ queryKey: authKeys.me }) // kycStatus shown in Settings & header
    },
  })
}
