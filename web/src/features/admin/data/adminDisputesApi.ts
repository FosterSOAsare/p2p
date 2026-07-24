import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { dashboardKeys } from '../../user/data/usersApi'

export interface AdminDispute {
  id: string
  escrowId: string
  status: 'open' | 'resolved'
  reason: string
  description: string
  outcome: 'release' | 'refund' | 'split' | null
  ruledAmountBuyer: number | null
  ruledAmountSeller: number | null
  rulingNote: string | null
  createdAt: string
  resolvedAt: string | null
  escrow: {
    id: string
    code: string
    title: string
    amount: number
    currency: string
    status: string
    buyer: { id: string; username: string; avatarUrl: string | null } | null
    seller: { id: string; username: string; avatarUrl: string | null } | null
    messageCount: number
  }
  openedBy: { id: string; username: string }
  resolvedBy: { id: string; username: string } | null
}

export interface DisputeMessage {
  id: string
  body: string
  createdAt: string
  sender: { id: string; username: string; avatarUrl: string | null }
}

export interface AdminDisputeDetail extends AdminDispute {
  escrow: AdminDispute['escrow'] & {
    feeAmount: number
    messages: DisputeMessage[]
    events: Array<{ id: string; event: string; createdAt: string }>
  }
}

export const adminDisputeKeys = {
  all: ['admin', 'disputes'] as const,
  list: (status: string) => [...adminDisputeKeys.all, 'list', status] as const,
  detail: (id: string) => [...adminDisputeKeys.all, 'detail', id] as const,
}

export function useAdminDisputes(status: 'open' | 'resolved' | 'all' = 'open') {
  return useQuery({
    queryKey: adminDisputeKeys.list(status),
    queryFn: async () => {
      const res = await api.get<{ disputes: AdminDispute[] }>(`/api/admin/disputes?status=${status}`)
      return res.data.disputes
    },
  })
}

export function useAdminDisputeDetail(id: string | null) {
  return useQuery({
    queryKey: adminDisputeKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const res = await api.get<AdminDisputeDetail>(`/api/admin/disputes/${id}`)
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useResolveDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      outcome,
      buyerRefund,
      rulingNote,
    }: {
      id: string
      outcome: 'release' | 'refund' | 'split'
      buyerRefund?: number
      rulingNote: string
    }) => {
      const res = await api.post<AdminDisputeDetail>(`/api/admin/disputes/${id}/resolve`, {
        outcome,
        buyerRefund,
        rulingNote,
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminDisputeKeys.all })
      qc.invalidateQueries({ queryKey: dashboardKeys.data })
    },
  })
}
