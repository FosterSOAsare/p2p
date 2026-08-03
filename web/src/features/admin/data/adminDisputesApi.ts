import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { dashboardKeys } from '../../user/data/usersApi'

export type DisputeReason =
  | 'not_delivered'
  | 'not_as_described'
  | 'wrong_item'
  | 'service_not_done'
  | 'other'

export interface DisputeParty {
  id: string
  username: string
  avatarUrl: string | null
}

/** List-row shape — server: `GET /api/admin/disputes` → `{ disputes: [...] }`. */
export interface AdminDispute {
  id: string
  escrowId: string
  status: 'open' | 'resolved'
  reason: DisputeReason | string
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
    buyer: DisputeParty | null
    seller: DisputeParty | null
    /** Deal-linked lifecycle notices, not the length of the parties' chat. */
    noticeCount: number
  }
  openedBy: { id: string; username: string }
  resolvedBy: { id: string; username: string } | null
}

/**
 * One line of the evidence transcript — the server's `MessageDto`, so file
 * evidence arrives with its Cloudinary metadata rather than a bare body string.
 * `system` lines are the escrow's own lifecycle notices.
 */
export interface DisputeMessage {
  id: string
  senderId: string
  senderUsername: string
  type: 'text' | 'file' | 'system'
  body: string
  attachment: { url: string; name: string; mime: string; size: number } | null
  escrowId: string | null
  createdAt: string
}

export interface DisputeEvent {
  id: string
  event: string
  actorRole: string
  createdAt: string
}

/**
 * Detail shape — server: `GET /api/admin/disputes/:id` returns the object
 * directly (no envelope). Detail parties carry `email`, and the escrow adds
 * the fee, the full chat transcript, and the event timeline.
 */
export interface AdminDisputeDetail extends Omit<AdminDispute, 'escrow' | 'openedBy'> {
  escrow: {
    id: string
    code: string
    title: string
    amount: number
    feeAmount: number
    currency: string
    status: string
    buyer: (DisputeParty & { email: string }) | null
    seller: (DisputeParty & { email: string }) | null
    messages: DisputeMessage[]
    events: DisputeEvent[]
  }
  openedBy: DisputeParty
}

export const adminDisputeKeys = {
  all: ['admin', 'disputes'] as const,
  list: (status: string) => [...adminDisputeKeys.all, 'list', status] as const,
  detail: (id: string) => [...adminDisputeKeys.all, 'detail', id] as const,
}

export function useAdminDisputes(status: 'open' | 'resolved' | 'all' = 'open') {
  return useQuery({
    queryKey: adminDisputeKeys.list(status),
    queryFn: () =>
      api<{ disputes: AdminDispute[] }>(`/api/admin/disputes?status=${status}`).then((r) => r.disputes),
    retry: false,
  })
}

export function useAdminDisputeDetail(id: string | null) {
  return useQuery({
    queryKey: adminDisputeKeys.detail(id ?? ''),
    queryFn: () => api<AdminDisputeDetail>(`/api/admin/disputes/${id}`),
    enabled: Boolean(id),
    retry: false,
  })
}

export function useResolveDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      outcome,
      buyerRefund,
      rulingNote,
    }: {
      id: string
      outcome: 'release' | 'refund' | 'split'
      buyerRefund?: number
      rulingNote: string
    }) =>
      api<AdminDisputeDetail>(`/api/admin/disputes/${id}/resolve`, {
        method: 'POST',
        body: { outcome, buyerRefund, rulingNote },
      }),
    onSuccess: (updated) => {
      qc.setQueryData(adminDisputeKeys.detail(updated.id), updated)
      qc.invalidateQueries({ queryKey: adminDisputeKeys.all })
      // A ruling moves wallet money and flips the deal to `disbursed`, so the
      // dashboards, deal lists, and wallet balances all need to refresh.
      qc.invalidateQueries({ queryKey: dashboardKeys.data })
      qc.invalidateQueries({ queryKey: ['escrows'] })
      qc.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
}
