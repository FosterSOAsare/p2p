import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/features/shared/data/api'

export interface AdminUserRow {
  id: string
  username: string
  email: string
  fullName: string
  avatarUrl: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  emailVerified: boolean
  dealsAsBuyer: number
  dealsAsSeller: number
  listingsCount: number
  joinedAt: string
}

export interface AdminUserDetail extends AdminUserRow {
  phone: string | null
  wallets: { currency: 'GHS' | 'TRX'; balance: number }[]
}

export interface AdminUsersResponse {
  users: AdminUserRow[]
  total: number
  page: number
  pages: number
}

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  list: (query: string) => [...adminUserKeys.all, 'list', query] as const,
  detail: (id: string) => [...adminUserKeys.all, 'detail', id] as const,
}

export function useAdminUsers(query: string) {
  return useQuery({
    queryKey: adminUserKeys.list(query),
    queryFn: () => api<AdminUsersResponse>(`/api/admin/users${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: adminUserKeys.detail(id ?? ''),
    queryFn: () => api<{ user: AdminUserDetail }>(`/api/admin/users/${id}`).then((r) => r.user),
    enabled: Boolean(id),
    retry: false,
  })
}

export function useSetUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      api<{ user: AdminUserRow }>(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }).then((r) => r.user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all })
    },
  })
}
