import { API_URL } from './config';
import { tokenStore } from './tokenStore';

/**
 * API client — the mobile twin of `web/src/features/shared/libs/api.ts`.
 *
 * Same contract: attach the access token, transparently refresh once on a 401
 * and retry, and normalise failures into ApiError so screens can render
 * `apiErrorMessage(err)` without unwrapping anything.
 *
 * Admin is the first feature on this path; the rest of the app still runs on
 * mock data and can migrate onto it screen by screen.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Best-effort human message from anything thrown by the client. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** Session-expiry hook — AuthContext registers a callback to sign the user out. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, true);
}

async function request<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const access = await tokenStore.getAccess();
  if (access) headers.Authorization = `Bearer ${access}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // No response at all — almost always the phone can't see the dev machine.
    throw new ApiError(0, `Can't reach the server at ${API_URL}. Check you're on the same network.`);
  }

  if (res.status === 401 && allowRefresh && access) {
    const refreshed = await refreshTokens();
    if (refreshed) return request<T>(path, options, false);
    await tokenStore.clear();
    onSessionExpired?.();
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { error?: string } | null)?.error ?? res.statusText ?? 'Request failed',
      (data as { details?: unknown } | null)?.details,
    );
  }
  return data as T;
}

/** Rotate the token pair. Returns false when the refresh token is spent. */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    // The endpoint wraps the pair: { tokens: { accessToken, refreshToken } }
    const body = (await res.json()) as { tokens?: { accessToken?: string; refreshToken?: string } };
    const tokens = body.tokens;
    if (!tokens?.accessToken || !tokens?.refreshToken) return false;
    await tokenStore.set(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}
