import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export interface AdminKyc {
  id: string
  status: 'pending' | 'verified' | 'rejected'
  legalName: string
  storeName: string
  taxId: string | null
  country: string
  address: string
  idType: string
  idNumber: string
  momoNumber: string | null
  trxAddress: string | null
  rejectionReason: string | null
  submittedAt: string
  reviewedAt: string | null
  user: {
    id: string
    username: string
    email: string
    avatarUrl: string | null
    joinedAt: string
  }
}

export const adminKeys = {
  kycList: (status: string) => ['admin', 'kyc', 'list', status] as const,
  kyc: (id: string) => ['admin', 'kyc', id] as const,
}

export function useAdminKycList(status: 'pending' | 'verified' | 'rejected') {
  return useQuery({
    queryKey: adminKeys.kycList(status),
    queryFn: () => api<{ submissions: AdminKyc[] }>(`/api/admin/kyc?status=${status}`),
    retry: false,
  })
}

export function useAdminKyc(id: string) {
  return useQuery({
    queryKey: adminKeys.kyc(id),
    queryFn: () => api<AdminKyc>(`/api/admin/kyc/${id}`),
    retry: false,
  })
}

function useKycDecision(action: 'approve' | 'reject') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api<AdminKyc>(`/api/admin/kyc/${id}/${action}`, {
        method: 'POST',
        body: action === 'reject' ? { reason } : {},
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminKeys.kyc(updated.id), updated)
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc', 'list'] })
    },
  })
}

export function useApproveKyc() {
  return useKycDecision('approve')
}

export function useRejectKyc() {
  return useKycDecision('reject')
}
