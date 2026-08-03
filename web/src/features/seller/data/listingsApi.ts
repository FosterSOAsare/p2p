import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export interface MyListingCard {
  id: string
  title: string
  short: string
  description: string | null
  price: number
  currency: 'GHS'
  category: string
  condition: string | null
  quantity: number
  image: string | null
  location: string | null
  views: number
  reviewCount: number
  status: 'draft' | 'active' | 'out_of_stock' | 'removed'
  /** Set when an admin removed the listing — the reason shown to the seller. */
  removalReason: string | null
  disputeAllowed: boolean
  disputeStatus: 'open' | 'approved' | 'rejected' | null
  createdAt: string
}

export interface MyListingsResponse {
  listings: MyListingCard[]
  total: number
  page: number
  pages: number
}

export interface ListingInput {
  title: string
  description?: string | null
  price: number
  category: string
  condition?: string | null
  quantity: number
  images: string[]
  location?: string | null
  status?: 'draft' | 'active' | 'out_of_stock'
}

export const myListingsKeys = {
  all: ['listings', 'mine'] as const,
  list: (query: string) => ['listings', 'mine', query] as const,
}

export function useMyListings(query: string) {
  return useQuery({
    queryKey: myListingsKeys.list(query),
    queryFn: () => api<MyListingsResponse>(`/api/listings/mine${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

function useInvalidateListings() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['listings'] }) // mine + public browse + details
  }
}

export function useCreateListing() {
  const invalidate = useInvalidateListings()
  return useMutation({
    mutationFn: (input: ListingInput) => api<{ listing: MyListingCard }>('/api/listings', { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}

export function useUpdateListing() {
  const invalidate = useInvalidateListings()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<ListingInput> & { id: string }) =>
      api<{ listing: MyListingCard }>(`/api/listings/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  })
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings()
  return useMutation({
    mutationFn: (id: string) => api(`/api/listings/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

/** Appeal a takedown. The seller should correct the listing first. */
export function useSubmitListingDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, explanation }: { id: string; explanation: string }) =>
      api<{ dispute: { id: string; status: string } }>(`/api/listings/${id}/dispute`, {
        method: 'POST',
        body: { explanation },
      }).then((r) => r.dispute),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['my-listings'] })
    },
  })
}
