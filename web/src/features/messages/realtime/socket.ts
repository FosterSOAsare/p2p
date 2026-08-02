import { io, type Socket } from 'socket.io-client'
import { API_URL, refreshAccessToken, tokenStore } from '../../shared/libs/api'

/**
 * The app's single WebSocket connection.
 *
 * Deliberately a module-level singleton rather than per-page state: the server
 * joins every socket to its `user:<id>` room on connect, and that room is how
 * unread bumps and escrow deal notices reach you when you *aren't* looking at
 * the thread they belong to. 
 */

/** Server ack envelope — mirrors the REST error shape (see messages.gateway.ts). */
export type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: { status: number; message: string; details?: unknown } }

let socket: Socket | null = null
let refreshing = false

export function getSocket(): Socket {
  if (socket) return socket

  socket = io(API_URL, {
    // A function, not a static object: socket.io calls it on every (re)connect,
    // so a reconnect after a token refresh automatically carries the new token.
    auth: (cb) => cb({ token: tokenStore.getAccess() ?? '' }),
  })

  socket.on('connect_error', async (err) => {
    // A rejected handshake is the socket's 401. Refresh once and let the
    // built-in reconnect pick up the fresh token; if the refresh fails the
    // session is genuinely gone, so stop retrying instead of hammering.
    if (err.message !== 'Invalid or expired token' || refreshing) return
    refreshing = true
    const refreshed = await refreshAccessToken()
    refreshing = false
    if (!refreshed) disconnectSocket()
  })

  return socket
}

/** Tear down on logout — a logged-out tab must stop receiving notifications. */
export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
