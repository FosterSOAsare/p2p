import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import type { RemovalReason } from '../../shared/libs/removalReasons'
import { adminListingKeys, type ListingStatus } from './adminListingsApi'

export type ReportStatus = 'open' | 'actioned' | 'dismissed'
export type ReportFilter = ReportStatus | 'all'

export interface AdminReport {
  id: string
  reason: RemovalReason
  /** Reason label, or the reporter's own note when the reason is `other`. */
  reasonText: string
  note: string | null
  status: ReportStatus
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reporter: { username: string; avatarUrl: string | null }
  createdAt: string
}

/** One reported listing and everything said about it — the unit of review. */
export interface AdminReportGroup {
  listing: {
    id: string
    title: string
    image: string | null
    price: number
    currency: 'GHS' | 'TRX'
    category: string
    status: ListingStatus
    seller: { username: string; avatarUrl: string | null }
  }
  reportCount: number
  reasonCounts: { reason: RemovalReason; reasonText: string; count: number }[]
  /** Most-reported reason — pre-selects the takedown dialog. */
  topReason: RemovalReason
  openCount: number
  firstReportedAt: string
  lastReportedAt: string
  reports: AdminReport[]
}

export interface AdminReportsResponse {
  groups: AdminReportGroup[]
  total: number
  page: number
  pages: number
}

export const adminReportKeys = {
  all: ['admin', 'reports'] as const,
  list: (query: string) => [...adminReportKeys.all, 'list', query] as const,
}

export function useAdminReports(query: string) {
  return useQuery({
    queryKey: adminReportKeys.list(query),
    queryFn: () => api<AdminReportsResponse>(`/api/admin/reports${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

/**
 * The "no violation" verdict — clears every open report on the listing at once.
 * The other verdict has no endpoint here: removing the listing actions them.
 */
export function useDismissListingReports() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ listingId, note }: { listingId: string; note?: string }) =>
      api<{ dismissed: number }>(`/api/admin/listings/${listingId}/reports/dismiss`, {
        method: 'POST',
        body: { ...(note ? { note } : {}) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminReportKeys.all })
      // The listing rows carry an open-report badge, and the nav/dashboard a count.
      qc.invalidateQueries({ queryKey: adminListingKeys.all })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}
