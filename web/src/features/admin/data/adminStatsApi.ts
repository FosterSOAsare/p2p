import { useQuery } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export type DealStatus = 'created' | 'funded' | 'delivered' | 'disbursed' | 'disputed'

export interface AdminStats {
  users: number
  suspendedUsers: number
  activeListings: number
  kycPending: number
  openDisputes: number
  totalDeals: number
  dealsByStatus: Record<DealStatus, number>
  ghsVolume: number
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/api/admin/stats'),
    retry: false,
  })
}
