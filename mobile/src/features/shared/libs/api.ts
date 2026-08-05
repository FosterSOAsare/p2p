import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Global API client — the phone version of `web/src/features/shared/libs/api.ts`.
 *
 * Same contract as the web's:
 *  - attaches the JWT access token as `Authorization: Bearer`
 *  - on 401, refreshes the token pair once and retries the original request
 *  - normalises server errors into `ApiError { status, message, details }`
 *
 * Two things differ, both because this is a phone and not a browser:
 *
 *  1. **Base URL.** The web reads `window.location.hostname`; a phone has no
 *     such thing, and `localhost` on a device means the device itself. So the
 *     host is taken from the Metro dev-server URI (the LAN IP you scan), with
 *     `EXPO_PUBLIC_API_URL` overriding it for a real deployment.
 *
 *  2. **Token storage.** The web uses `localStorage`, which is synchronous.
 *     `expo-secure-store` keeps tokens in the device keychain/keystore and is
 *     async, so `tokenStore` returns promises and is cached in memory to keep
 *     the hot path off the disk.
 */

const API_PORT = 8000;

/** `http://10.0.0.5:8000` — derived from wherever Metro is serving from. */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // e.g. "10.249.229.38:8081" in dev; undefined in a production build.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (host) return `http://${host}:${API_PORT}`;

  // Production builds must be told explicitly — there's no dev host to infer.
  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveBaseUrl();

const ACCESS_KEY = 'p2p_access_token';
const REFRESH_KEY = 'p2p_refresh_token';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// SecureStore is async; mirror it in memory so request building stays sync-ish
// and a cold read doesn't cost a disk hit on every call.
let cachedAccess: string | null = null;
let cachedRefresh: string | null = null;
let hydrated = false;

export const tokenStore = {
  /** Load once at startup, before the first authenticated request. */
  async hydrate(): Promise<void> {
    if (hydrated) return;
    cachedAccess = await SecureStore.getItemAsync(ACCESS_KEY);
    cachedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
    hydrated = true;
  },

  getAccess: () => cachedAccess,
  getRefresh: () => cachedRefresh,
  isLoggedIn: () => Boolean(cachedAccess),

  async set(tokens: AuthTokens): Promise<void> {
    cachedAccess = tokens.accessToken;
    cachedRefresh = tokens.refreshToken;
    hydrated = true;
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  },

  async clear(): Promise<void> {
    cachedAccess = null;
    cachedRefresh = null;
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** First validation detail if present, else the server's error message. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (Array.isArray(err.details) && err.details.length > 0) return String(err.details[0]);
    return err.message;
  }
  if (err instanceof Error && /Network request failed/i.test(err.message)) {
    return 'Cannot reach the server. Is the API running, and is your phone on the same WiFi?';
  }
  return 'Something went wrong. Please try again.';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, true);
}

async function request<T>(
  path: string,
  options: RequestOptions,
  allowRefresh: boolean,
): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const access = tokenStore.getAccess();
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Expired access token → refresh once, then retry the original request.
  if (
    res.status === 401 &&
    allowRefresh &&
    access &&
    tokenStore.getRefresh() &&
    path !== '/api/auth/refresh'
  ) {
    const refreshed = await refreshTokens();
    if (refreshed) return request<T>(path, options, false);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`,
      (data as { details?: unknown } | null)?.details,
    );
  }
  return data as T;
}

// Single refresh in flight at a time — concurrent 401s share it.
let refreshPromise: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await tokenStore.clear();
      return false;
    }
    const data = (await res.json()) as { tokens: AuthTokens };
    await tokenStore.set(data.tokens);
    return true;
  } catch {
    return false;
  }
}
