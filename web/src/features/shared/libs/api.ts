/**
 * Global API client — all server requests go through here.
 * - Base URL from VITE_API_URL (defaults to the local API server)
 * - Attaches the JWT access token as an Authorization: Bearer header
 * - On 401, transparently refreshes the token pair once and retries
 * - Normalizes server errors into ApiError { status, message, details }
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const ACCESS_KEY = 'p2p_access_token'
const REFRESH_KEY = 'p2p_refresh_token'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  isLoggedIn: () => Boolean(localStorage.getItem(ACCESS_KEY)),
}

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/** First validation detail if present, else the server's error message. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (Array.isArray(err.details) && err.details.length > 0) return String(err.details[0])
    return err.message
  }
  if (err instanceof Error && err.message === 'Failed to fetch') {
    return 'Cannot reach the server. Is the API running?'
  }
  return 'Something went wrong. Please try again.'
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, true)
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return uploadRequest<T>(path, formData, true)
}

async function request<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const { method = 'GET', body } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const access = tokenStore.getAccess()
  if (access) headers.Authorization = `Bearer ${access}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Expired access token → refresh once, then retry the original request.
  if (res.status === 401 && allowRefresh && access && tokenStore.getRefresh() && path !== '/api/auth/refresh') {
    const refreshed = await refreshTokens()
    if (refreshed) return request<T>(path, options, false)
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? res.statusText, (data as { details?: unknown } | null)?.details)
  }
  return data as T
}

async function uploadRequest<T>(path: string, formData: FormData, allowRefresh: boolean): Promise<T> {
  const headers: Record<string, string> = {}
  const access = tokenStore.getAccess()
  if (access) headers.Authorization = `Bearer ${access}`

  // Do NOT set Content-Type header when sending FormData — fetch auto-sets multipart boundary
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401 && allowRefresh && access && tokenStore.getRefresh() && path !== '/api/auth/refresh') {
    const refreshed = await refreshTokens()
    if (refreshed) return uploadRequest<T>(path, formData, false)
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? res.statusText, (data as { details?: unknown } | null)?.details)
  }
  return data as T
}

// Single refresh in flight at a time — concurrent 401s share it.
let refreshPromise: Promise<boolean> | null = null

function refreshTokens(): Promise<boolean> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      tokenStore.clear()
      return false
    }
    const data = (await res.json()) as { tokens: AuthTokens }
    tokenStore.set(data.tokens)
    return true
  } catch {
    return false
  }
}
