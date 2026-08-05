import { useQuery } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export type DealStatus = 'created' | 'funded' | 'delivered' | 'disbursed' | 'disputed' | 'cancelled'

export interface AdminStats {
  users: number
  suspendedUsers: number
  activeListings: number
  kycPending: number
  openDisputes: number
  openReports: number
  totalDeals: number
  dealsByStatus: Record<DealStatus, number>
  ghsVolume: number
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/api/admin/stats'),
    // AdminSectionNav reads this for its reports badge, so it mounts on every
    // admin page — cached rather than refetched on each navigation.
    staleTime: 60_000,
    retry: false,
  })
}
