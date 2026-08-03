import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth/data/authApi'
import { getSocket } from '../realtime/socket'
import { messageKeys } from './messagesApi'

/**
 * Keeps the inbox and its unread counts live. Mount once, app-level (Layout) —
 * not on the messages page, or counts would only update while you're already
 * looking at them.
 *
 * Calling getSocket() here is also what establishes the connection for the
 * whole session, so `user:<id>` room traffic (unread bumps, escrow deal
 * notices) arrives on every page, not just inside a thread.
 *
 * Refetching rather than patching the cache keeps the server authoritative:
 * it already excludes your own messages from the count and zeroes a thread the
 * moment you read it, so there's no client-side "is this mine / am I looking
 * at it / did I already count this" logic to get wrong.
 */
export function useMessageNotifications() {
  const { data: me } = useMe()
  const meId = me?.id
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!meId) return
    const socket = getSocket()

    const refresh = () => queryClient.invalidateQueries({ queryKey: messageKeys.conversations() })

    socket.on('notify:message', refresh) // a message landed in some thread
    socket.on('message:read', refresh) // you read one — here or on another device

    return () => {
      socket.off('notify:message', refresh)
      socket.off('message:read', refresh)
    }
  }, [meId, queryClient])
}
