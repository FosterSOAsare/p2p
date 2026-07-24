import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'


// Marketplace listings are fiat-only (GH₵) — crypto/TRX exists only on standalone escrow deals.
export interface ListingCard {
  id: string
  title: string
  short: string
  price: number
  currency: 'GHS'
  category: string
  condition: string | null
  quantity: number
  image: string | null
  location: string | null
  views: number
  sellerUsername: string
  sellerVerified: boolean
  rating: number | null
  reviewCount: number
  createdAt: string
}

export interface ListingsResponse {
  listings: ListingCard[]
  total: number
  page: number
  pages: number
}

export interface ListingReview {
  id: string
  reviewer: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface ListingDetailData {
  id: string
  title: string
  description: string | null
  price: number
  currency: 'GHS'
  category: string
  condition: string | null
  quantity: number
  images: string[]
  location: string | null
  status: string
  views: number
  createdAt: string
  seller: {
    username: string
    avatarUrl: string | null
    storeName: string | null
    verified: boolean
    joinedAt: string
  }
  rating: number | null
  reviewCount: number
  reviews: ListingReview[]
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

/** `query` is the already-built query string (from the page's URL search params). */
export function useListings(query: string) {
  return useQuery({
    queryKey: ['listings', query],
    queryFn: () => api<ListingsResponse>(`/api/listings${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData, // smooth page transitions
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listings', 'detail', id],
    queryFn: () => api<ListingDetailData>(`/api/listings/${id}`),
    retry: false,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 5 * 60_000,
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/api/listings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

