import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export type AdminDealStatus = 'created' | 'funded' | 'delivered' | 'disbursed' | 'disputed'

export interface AdminDealParty {
  id: string
  username: string
  avatarUrl: string | null
}

export interface AdminDeal {
  id: string
  code: string
  title: string
  amount: number
  feeAmount: number
  currency: 'GHS' | 'TRX'
  rail: 'fiat' | 'crypto'
  status: AdminDealStatus
  createdAt: string
  buyer: AdminDealParty | null
  seller: AdminDealParty | null
  hasOpenDispute: boolean
  disputeId: string | null
}

export interface AdminDealsResponse {
  deals: AdminDeal[]
  total: number
  page: number
  pages: number
}

export const adminDealKeys = {
  all: ['admin', 'deals'] as const,
  list: (query: string) => [...adminDealKeys.all, 'list', query] as const,
}

export function useAdminDeals(query: string) {
  return useQuery({
    queryKey: adminDealKeys.list(query),
    queryFn: () => api<AdminDealsResponse>(`/api/admin/escrows${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}
