import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export type ListingStatus = 'draft' | 'active' | 'out_of_stock' | 'removed'

export type RemovalReason =
  | 'prohibited_item'
  | 'duplicate'
  | 'misleading'
  | 'spam'
  | 'guidelines'
  | 'fraud'
  | 'other'

/** Mirrors the server's removal-reasons module — keep the wording in step. */
export const REMOVAL_REASONS: { id: RemovalReason; label: string }[] = [
  { id: 'prohibited_item', label: 'Prohibited or restricted item' },
  { id: 'duplicate', label: 'Duplicate listing' },
  { id: 'misleading', label: 'Misleading or inaccurate information' },
  { id: 'spam', label: 'Spam or low-quality content' },
  { id: 'guidelines', label: 'Violates community guidelines' },
  { id: 'fraud', label: 'Fraudulent or suspicious activity' },
  { id: 'other', label: 'Other' },
]

export interface AdminListingRow {
  id: string
  title: string
  price: number
  currency: 'GHS' | 'TRX'
  category: string
  quantity: number
  image: string | null
  status: ListingStatus
  createdAt: string
  seller: { username: string; avatarUrl: string | null }
  removal: {
    reason: RemovalReason | null
    reasonText: string | null
    removedAt: string
    removedBy: string | null
    disputeAllowed: boolean
    disputeStatus: 'open' | 'approved' | 'rejected' | null
  } | null
}

export interface AdminListingsResponse {
  listings: AdminListingRow[]
  total: number
  page: number
  pages: number
}

export const adminListingKeys = {
  all: ['admin', 'listings'] as const,
  list: (query: string) => [...adminListingKeys.all, 'list', query] as const,
}

export function useAdminListings(query: string) {
  return useQuery({
    queryKey: adminListingKeys.list(query),
    queryFn: () => api<AdminListingsResponse>(`/api/admin/listings${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useRemoveListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reason,
      note,
      disputeAllowed,
    }: {
      id: string
      reason: RemovalReason
      note?: string
      disputeAllowed: boolean
    }) =>
      api<{ listing: AdminListingRow }>(`/api/admin/listings/${id}/remove`, {
        method: 'POST',
        body: { reason, disputeAllowed, ...(note ? { note } : {}) },
      }).then((r) => r.listing),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminListingKeys.all })
      // The listing leaves the public marketplace too.
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ---------- Seller appeals ----------

export type ListingDisputeStatus = 'open' | 'approved' | 'rejected'

/** Listing fields captured at removal / as they stand now — for the diff. */
export interface ListingSnapshot {
  title: string
  description: string | null
  price: number
  category: string
  condition: string | null
  quantity: number
  images: string[]
  location: string | null
}

export interface AdminListingDispute {
  id: string
  status: ListingDisputeStatus
  explanation: string
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  seller: { username: string; avatarUrl: string | null }
  /** The listing as removed — it's frozen, so this is what the ruling applies to. */
  listing: ListingSnapshot & {
    id: string
    status: ListingStatus
    image: string | null
    removalReasonText: string | null
  }
}

export function useAdminListingDisputes(status: 'open' | 'resolved' | 'all') {
  return useQuery({
    queryKey: [...adminListingKeys.all, 'disputes', status] as const,
    queryFn: () =>
      api<{ disputes: AdminListingDispute[]; total: number }>(`/api/admin/listing-disputes?status=${status}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useResolveListingDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approve' | 'reject'; note?: string }) =>
      api<{ dispute: AdminListingDispute }>(`/api/admin/listing-disputes/${id}/resolve`, {
        method: 'POST',
        body: { decision, ...(note ? { note } : {}) },
      }).then((r) => r.dispute),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminListingKeys.all })
      qc.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

// ---------- Single listing: the admin review page ----------

export interface AdminListingDetail {
  id: string
  title: string
  description: string | null
  price: number
  currency: 'GHS' | 'TRX'
  category: string
  condition: string | null
  quantity: number
  images: string[]
  location: string | null
  status: ListingStatus
  views: number
  createdAt: string
  updatedAt: string
  rating: number | null
  reviewCount: number
  /** Deals referencing this listing — why a takedown is a soft delete. */
  dealCount: number
  seller: {
    id: string
    username: string
    avatarUrl: string | null
    email: string
    storeName: string | null
    kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
    accountStatus: 'active' | 'suspended'
    listingsCount: number
    joinedAt: string
  }
  removal: {
    reason: RemovalReason
    reasonText: string
    note: string | null
    removedAt: string
    removedBy: string | null
    disputeAllowed: boolean
  } | null
  dispute: {
    id: string
    status: ListingDisputeStatus
    explanation: string
    reviewNote: string | null
    createdAt: string
  } | null
}

export function useAdminListing(id: string) {
  return useQuery({
    queryKey: [...adminListingKeys.all, 'detail', id] as const,
    queryFn: () => api<{ listing: AdminListingDetail }>(`/api/admin/listings/${id}`).then((r) => r.listing),
    enabled: Boolean(id),
    retry: false,
  })
}

/** Put a removed listing back on the marketplace. */
export function useReinstateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ listing: AdminListingRow }>(`/api/admin/listings/${id}/reinstate`, { method: 'POST' }).then(
        (r) => r.listing,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminListingKeys.all })
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}
