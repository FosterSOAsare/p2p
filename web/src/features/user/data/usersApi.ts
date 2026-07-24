import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tokenStore } from '../../shared/libs/api'
import { authKeys, type AuthUser, type MeResponse } from '../../auth/data/authApi'

export interface UpdateProfileInput {
  fullName?: string
  phone?: string | null
  avatarUrl?: string | null
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api<{ user: AuthUser }>('/api/users/me', { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  })
}

// ---------- Public seller profile ----------

export interface PublicSellerProfile {
  username: string
  avatarUrl: string | null
  verified: boolean
  storeName: string | null
  country: string | null
  joinedAt: string
  stats: { activeListings: number; salesCompleted: number; rating: number | null; reviewCount: number }
  listings: {
    id: string
    title: string
    short: string
    price: number
    category: string
    condition: string | null
    image: string | null
  }[]
}

export function useSellerProfile(username: string) {
  return useQuery({
    queryKey: ['users', 'profile', username],
    queryFn: () => api<PublicSellerProfile>(`/api/users/${username}`),
    retry: false,
    enabled: Boolean(username),
  })
}

// ---------- Vendor blocking ----------

export interface BlockedVendor {
  username: string
  avatarUrl: string | null
  storeName: string | null
  reason: string
  blockedAt: string
}

export const blockKeys = {
  list: ['users', 'blocked'] as const,
}

/** Blocked vendors (empty while logged out). */
export function useBlockedVendors() {
  return useQuery({
    queryKey: blockKeys.list,
    queryFn: async () => {
      if (!tokenStore.isLoggedIn()) return { blocked: [] as BlockedVendor[] }
      return api<{ blocked: BlockedVendor[] }>('/api/users/me/blocked')
    },
    retry: false,
  })
}

export function useBlockVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ username, reason }: { username: string; reason: string }) =>
      api(`/api/users/${username}/block`, { method: 'POST', body: { reason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blockKeys.list }),
  })
}

export function useUnblockVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => api(`/api/users/${username}/block`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blockKeys.list }),
  })
}

// ---------- Saved listings (marketplace bookmarks) ----------

export interface SavedListingCard {
  id: string
  title: string
  price: number
  currency: 'GHS' | 'TRX'
  category: string
  condition: string | null
  status: string
  image: string | null
  sellerUsername: string
  savedAt: string
}

export const userKeys = {
  saved: ['users', 'saved'] as const,
}

/** Saved listings (empty while logged out — same always-enabled pattern as useMe). */
export function useSavedListings() {
  return useQuery({
    queryKey: userKeys.saved,
    queryFn: async () => {
      if (!tokenStore.isLoggedIn()) return { saved: [] as SavedListingCard[] }
      return api<{ saved: SavedListingCard[] }>('/api/users/me/saved')
    },
    retry: false,
  })
}

export function useSaveListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (listingId: string) => api(`/api/users/me/saved/${listingId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.saved })
      queryClient.invalidateQueries({ queryKey: authKeys.me }) // savedItemsCount stat
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data })
    },
  })
}

export function useUnsaveListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (listingId: string) => api(`/api/users/me/saved/${listingId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.saved })
      queryClient.invalidateQueries({ queryKey: authKeys.me })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data })
    },
  })
}

export interface NotificationPrefs {
  emailShipmentUpdates: boolean
  smsReleaseAlerts: boolean
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) =>
      api<{ prefs: NotificationPrefs }>('/api/users/me/notification-prefs', { method: 'PUT', body: prefs }),
    // Optimistic — flip the checkboxes instantly, resync from the server on error.
    onMutate: async (prefs) => {
      queryClient.setQueryData<MeResponse | null>(authKeys.me, (old) => (old ? { ...old, prefs } : old))
    },
    onError: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  })
}

// ---------- Unified Dashboard ----------

export interface DashboardOrder {
  id: string
  code: string
  status: string
  orderDate: string
  vendorName: string
  title: string
  price: number
  currency: string
  imageUrl: string
  productId?: string
  trackingCode?: string
  shippingCarrier?: string
}

export interface SellerSaleOrder {
  id: string
  code: string
  status: string
  rawStatus: string
  buyerUsername: string
  date: string
  title: string
  amount: number
  currency: string
  carrier?: string
  trackingNumber?: string
}

export interface SellerProductListing {
  id: string
  title: string
  price: number
  currency: string
  category: string
  stock: number
  views: number
  imageUrl: string
  status: string
}

export interface DashboardResponse {
  persona: 'buyer' | 'seller'
  profile: {
    fullName: string
    username: string
    avatarUrl: string
    joinedDate: string
    isKycVerified: boolean
    kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  }
  buyer: {
    stats: {
      activeOrdersCount: number
      escrowLockedBalance: number
      totalSpent: number
      savedItemsCount: number
    }
    recentOrders: DashboardOrder[]
  }
  seller: {
    stats: {
      storeName: string
      storeHandle: string
      rating: number
      reviewCount: number
      totalEarnings: number
      escrowLockedBalance: number
      availablePayoutBalance: number
      actionRequiredCount: number
    }
    salesOrders: SellerSaleOrder[]
    listings: SellerProductListing[]
  }
}

export const dashboardKeys = {
  data: ['users', 'dashboard'] as const,
}

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.data,
    queryFn: async () => {
      if (!tokenStore.isLoggedIn()) return null
      return api<DashboardResponse>('/api/users/me/dashboard')
    },
    staleTime: 30_000,
  })
}

