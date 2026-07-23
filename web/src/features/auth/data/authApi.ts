import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tokenStore, type AuthTokens } from '../../shared/libs/api'

// ---------- server response shapes ----------

export interface AuthUser {
  id: string
  username: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  role: 'user' | 'admin'
  emailVerified: boolean
  phoneVerified: boolean
  createdAt: string
}

export interface AuthResult {
  user: AuthUser
  tokens: AuthTokens
}

export interface MeResponse extends AuthUser {
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  wallets: { currency: 'GHS' | 'TRX'; balance: number }[]
  stats: { activeOrdersCount: number; totalSpent: number; savedItemsCount: number }
}

export const authKeys = {
  me: ['auth', 'me'] as const,
  usernameAvailable: (u: string) => ['auth', 'username-available', u] as const,
}

// ---------- queries ----------

/** The logged-in user (undefined while logged out). Auth state = `Boolean(useMe().data)`. */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api<MeResponse>('/api/auth/me'),
    enabled: tokenStore.isLoggedIn(),
    retry: false,
    staleTime: 60_000,
  })
}

/** Live "is this username free?" check for the signup form (pass a debounced value). */
export function useUsernameAvailable(username: string) {
  const valid = /^[a-z0-9_]{3,20}$/.test(username)
  return useQuery({
    queryKey: authKeys.usernameAvailable(username),
    queryFn: () => api<{ available: boolean }>(`/api/auth/username-available?u=${encodeURIComponent(username)}`),
    enabled: valid,
    staleTime: 30_000,
    retry: false,
  })
}

// ---------- mutations ----------

export function useSignup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { username: string; email: string; password: string; fullName: string }) =>
      api<AuthResult>('/api/auth/signup', { method: 'POST', body: input }),
    onSuccess: ({ tokens }) => {
      tokenStore.set(tokens)
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { identifier: string; password: string }) =>
      api<AuthResult>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ tokens }) => {
      tokenStore.set(tokens)
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStore.getRefresh()
      if (refreshToken) {
        await api('/api/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined)
      }
    },
    onSettled: () => {
      tokenStore.clear()
      queryClient.removeQueries({ queryKey: authKeys.me })
    },
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => api('/api/auth/verify-email', { method: 'POST', body: { token } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => api('/api/auth/resend-verification', { method: 'POST', body: {} }),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      api('/api/auth/reset-password', { method: 'POST', body: input }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<{ tokens: AuthTokens }>('/api/auth/change-password', { method: 'POST', body: input }),
    // Server revokes every session and returns a fresh pair — store it so we stay logged in.
    onSuccess: ({ tokens }) => tokenStore.set(tokens),
  })
}
