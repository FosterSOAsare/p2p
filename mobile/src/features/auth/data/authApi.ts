import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';
import { tokenStore } from '@/features/shared/data/tokenStore';

/**
 * Auth server calls — the mobile twin of `web/src/features/auth/data/authApi.ts`.
 *
 * Session *state* lives in `AuthContext` (it owns the tokens and the signed-in
 * user); this file only holds the one-shot calls that don't establish a session.
 *
 * Signup is the first of those, and deliberately does not log anyone in: the
 * server replies with the created user and **no tokens**, because the account
 * has to clear email verification before it can hold a session. The screen
 * therefore sends the new account to /verify-email rather than into the app.
 */

/** The account as the server hands it back — `PublicUser` in auth.service.ts. */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'user' | 'admin';
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

/**
 * `POST /api/auth/signup`.
 *
 * A mutation rather than a query because it changes server state — react-query
 * keeps the two apart: queries are cached and re-fetched, mutations are fired
 * once and expose `isPending` / `error` for the form to render.
 *
 * Nothing is invalidated on success: the new account is not the signed-in user,
 * so no cached data goes stale.
 *
 * Failures arrive as `ApiError`, so the screen can show the server's own words
 * ("Username is taken", "Email already registered") via `apiErrorMessage`.
 */
export function useSignup() {
  return useMutation({
    mutationFn: (input: SignupInput) =>
      api<{ user: PublicUser }>('/api/auth/signup', {
        method: 'POST',
        body: input,
      }).then((r) => r.user),
  });
}

/**
 * `POST /api/auth/verify-email`.
 *
 * Consumes the token from the emailed link. Until this succeeds the account
 * exists but cannot hold a session, so this is what turns a signed-up account
 * into one that can log in.
 *
 * Single-use: running it twice fails the second time, which is why the screen
 * fires it once on arrival rather than on every render.
 */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      api<{ ok: true }>('/api/auth/verify-email', { method: 'POST', body: { token } }),
  });
}

/**
 * `POST /api/auth/resend-verification`.
 *
 * Note the server guards this with `auth` — it needs a valid access token. A
 * user who has just signed up has no session yet, so this only works for
 * someone signed in with a still-unverified address. The screen surfaces the
 * 401 rather than pretending a mail went out.
 */
export function useResendVerification() {
  return useMutation({
    mutationFn: () => api<{ ok: true }>('/api/auth/resend-verification', { method: 'POST' }),
  });
}

/**
 * `POST /api/auth/forgot-password`.
 *
 * Succeeds for **any** address, known or not — the server answers `{ ok: true }`
 * either way so nobody can use this endpoint to discover which emails have
 * accounts. The screen must therefore show the same "if that account exists,
 * we've sent a link" confirmation regardless, and must not treat success as
 * proof the address was real.
 *
 * An error here means the request itself failed (offline, server down), not
 * that the email was rejected.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ ok: true }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  });
}

/**
 * `POST /api/auth/reset-password`.
 *
 * The token comes from the emailed link (`/reset-password?token=…`). Unlike
 * forgot-password this one does fail loudly — an expired, already-used or
 * tampered token returns an error the screen should show, because the user
 * needs to know to request a fresh link.
 *
 * On success the server revokes every existing session, so the account has to
 * sign in again with the new password.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      api<{ ok: true }>('/api/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword },
      }),
  });
}

/**
 * `GET /api/auth/username-available` — the live "@name is available / taken"
 * check under the signup field.
 *
 * `enabled` on the format test is what keeps this from being chatty: the query
 * only runs once what's typed could actually be a username, so the half-typed
 * prefixes on the way there cost nothing. React Query then caches per value, so
 * backspacing to something already checked doesn't ask again.
 *
 * The same regex the server enforces, so the message under the field matches
 * what signup would actually accept.
 */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function useUsernameAvailable(username: string) {
  return useQuery({
    queryKey: ['auth', 'username-available', username] as const,
    queryFn: () =>
      api<{ available: boolean }>(
        `/api/auth/username-available?u=${encodeURIComponent(username)}`,
      ).then((r) => r.available),
    enabled: USERNAME_RE.test(username),
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * `POST /api/auth/change-password` — for someone already signed in.
 *
 * The server **rotates the token pair** on success and signs every other device
 * out, which is why the response carries tokens and they're stored here. Without
 * that the current session would be running on a pair the change just
 * invalidated, and the next request would 401 the user out of their own account
 * seconds after they changed their password.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      const res = await api<{ tokens: { accessToken: string; refreshToken: string } }>(
        '/api/auth/change-password',
        { method: 'POST', body: input },
      );
      await tokenStore.set(res.tokens.accessToken, res.tokens.refreshToken);
      return res;
    },
  });
}
