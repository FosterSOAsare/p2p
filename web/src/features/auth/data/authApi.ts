import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, tokenStore, type AuthTokens } from '../../shared/libs/api'
import { disconnectSocket } from '../../messages/realtime/socket'

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

export interface MeResponse extends AuthUser {
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  prefs: { emailShipmentUpdates: boolean; smsReleaseAlerts: boolean }
  wallets: { currency: 'GHS' | 'TRX'; balance: number }[]
  stats: { activeOrdersCount: number; totalSpent: number; savedItemsCount: number }
}

/**
 * Login answers with the full `/me` payload, not a thinner user — so the
 * signed-in shell can be drawn from this response without a second request.
 */
export interface AuthResult {
  user: MeResponse
  tokens: AuthTokens
}

export const authKeys = {
  me: ['auth', 'me'] as const,
  usernameAvailable: (u: string) => ['auth', 'username-available', u] as const,
}

// ---------- queries ----------

/**
 * The logged-in user (`null` while logged out). Auth state = `Boolean(useMe().data)`.
 * Always enabled — the queryFn resolves `null` when there's no token, so login/logout
 * invalidations always reach active subscribers (an `enabled:` gate on localStorage
 * is not reactive and left the header stuck on the previous auth state).
 */
export function useMe() {
  return useQuery<MeResponse | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      if (!tokenStore.isLoggedIn()) return null
      try {
        return await api<MeResponse>('/api/auth/me')
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          tokenStore.clear() // session fully expired/revoked — drop the dead tokens
          return null
        }
        throw err
      }
    },
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
  // No auto-login: signup creates the account and sends a verification email.
  // The user must verify, then log in — the Signup screen routes to /verify-email.
  return useMutation({
    mutationFn: (input: { username: string; email: string; password: string; fullName: string }) =>
      api<{ user: AuthUser }>('/api/auth/signup', { method: 'POST', body: input }),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { identifier: string; password: string }) =>
      api<AuthResult>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ user, tokens }) => {
      tokenStore.set(tokens)
      /*
        Write the user straight into the cache instead of invalidating.

        `invalidateQueries` only marks the query stale and starts a *refetch* —
        `useMe().data` stays `null` until that returns, so for a full round trip
        after a successful sign-in the header still rendered Sign up / Log in to
        someone who was already signed in. The login response now carries the
        same payload `/me` does, so there is nothing left to go and ask for:
        setting it notifies every subscriber synchronously and the header flips
        in the same tick.
      */
      queryClient.setQueryData<MeResponse>(authKeys.me, user)
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
      disconnectSocket()
      // setQueryData notifies active subscribers immediately (removeQueries does not),
      // so the header flips to logged-out without waiting for a re-render.
      queryClient.setQueryData(authKeys.me, null)
    },
  })
}

/**
 * Verifies the emailed link. Modeled as a query keyed by the token — NOT a
 * mutation fired from useEffect, which is unreliable under StrictMode
 * double-invocation (state can land on the discarded instance, leaving the
 * rendered hook stuck without success/error). The query runs automatically
 * when a token is present and never re-posts thanks to staleTime: Infinity.
 */
export function useVerifyEmailToken(token: string | null) {
  return useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: () => api<{ ok: boolean }>('/api/auth/verify-email', { method: 'POST', body: { token } }),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
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
