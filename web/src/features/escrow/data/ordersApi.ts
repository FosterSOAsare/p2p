import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { authKeys } from '../../auth/data/authApi'
import type { FeeSplit } from './fees'

// ---------- shared deal shape (server serialize()) ----------

export type EscrowStatus = 'created' | 'funded' | 'delivered' | 'disbursed' | 'disputed'
export type EscrowAction = 'FUND' | 'DELIVER' | 'RELEASE' | 'DISPUTE'

export interface DealParty {
  username: string
  avatarUrl: string | null
}

export interface Deal {
  id: string
  code: string
  title: string
  description: string | null
  status: EscrowStatus
  currency: 'GHS' | 'TRX'
  rail: 'fiat' | 'crypto'
  amount: number
  feeAmount: number
  feeSplit: FeeSplit
  buyerFee: number
  sellerFee: number
  fundingTotal: number
  sellerPayout: number
  quantity: number | null
  listing: { id: string; image: string | null } | null
  buyer: DealParty | null
  seller: DealParty | null
  invitedUsername: string | null
  myRole: 'buyer' | 'seller' | 'creator'
  availableActions: EscrowAction[]
  carrier: string | null
  trackingNumber: string | null
  deliveryNote: string | null
  autoReleaseAt: string | null
  createdAt: string
  fundedAt: string | null
  deliveredAt: string | null
  disbursedAt: string | null
  disputedAt: string | null
}

export interface DealDetail extends Deal {
  creatorUsername: string
  myReview: { rating: number; comment: string | null } | null
  events: { id: string; event: string; actorRole: string; createdAt: string }[]
  dispute: {
    reason: string
    description: string
    status: string
    outcome: string | null
    rulingNote: string | null
    createdAt: string
  } | null
}

export interface DealsResponse {
  deals: Deal[]
  total: number
  page: number
  pages: number
}

export const dealKeys = {
  list: (query: string) => ['escrows', 'list', query] as const,
  detail: (id: string) => ['escrows', 'detail', id] as const,
}

function useInvalidateDeals() {
  const queryClient = useQueryClient()
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['escrows'] })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: authKeys.me })
    queryClient.invalidateQueries({ queryKey: ['users', 'dashboard'] })
    if (id) queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) })
  }
}

// ---------- queries ----------

export function useDeals(query: string) {
  return useQuery({
    queryKey: dealKeys.list(query),
    queryFn: () => api<DealsResponse>(`/api/escrows${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => api<{ deal: DealDetail }>(`/api/escrows/${id}`).then((r) => r.deal),
    retry: false,
    enabled: Boolean(id),
  })
}

// ---------- checkout ----------

export interface CheckoutInput {
  listingId: string
  quantity: number
  paymentMethod: 'momo' | 'card' // simulated — not charged
}

export function useCheckout() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: (input: CheckoutInput) => api<{ deal: Deal }>('/api/escrows/from-listing', { method: 'POST', body: input }),
    onSuccess: () => invalidate(),
  })
}

// ---------- transitions ----------

export function useFundDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: (id: string) => api<{ deal: DealDetail }>(`/api/escrows/${id}/fund`, { method: 'POST' }),
    onSuccess: (_d, id) => invalidate(id),
  })
}

export function useDeliverDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; carrier?: string; trackingNumber?: string; note?: string }) =>
      api<{ deal: DealDetail }>(`/api/escrows/${id}/deliver`, { method: 'POST', body }),
    onSuccess: (_d, { id }) => invalidate(id),
  })
}

export function useReleaseDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: (id: string) => api<{ deal: DealDetail }>(`/api/escrows/${id}/release`, { method: 'POST' }),
    onSuccess: (_d, id) => invalidate(id),
  })
}

export function useDisputeDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ id, reason, description }: { id: string; reason: string; description: string }) =>
      api<{ deal: DealDetail }>(`/api/escrows/${id}/dispute`, { method: 'POST', body: { reason, description } }),
    onSuccess: (_d, { id }) => invalidate(id),
  })
}

export function useReviewDeal() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      api<{ deal: DealDetail }>(`/api/escrows/${id}/review`, { method: 'POST', body: { rating, comment } }),
    onSuccess: (_d, { id }) => {
      invalidate(id)
      // refresh the counterparty's profile rating + the listing's reviews
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export function useCreateStandaloneEscrow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitedUsername, ...rest }: {
      title: string
      description?: string
      amount: number
      currency?: 'GHS' | 'TRX'
      role?: 'buyer' | 'seller'
      invitedUsername?: string
      // `rail` is intentionally absent — the server derives it from currency.
      feeSplit?: FeeSplit
    }) =>
      api<{ deal: DealDetail }>('/api/escrows', {
        method: 'POST',
        body: {
          ...rest,
          counterpartyUsername: invitedUsername,
          invitedUsername,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useUpdateEscrow() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string
      title?: string
      description?: string
      amount?: number
      currency?: 'GHS' | 'TRX'
      role?: 'buyer' | 'seller'
      invitedUsername?: string
    }) =>
      api<{ deal: DealDetail }>(`/api/escrows/${id}`, {
        method: 'PATCH',
        body: {
          ...body,
          counterpartyUsername: body.invitedUsername,
        },
      }),
    onSuccess: (_d, { id }) => invalidate(id),
  })
}
