import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth/data/authApi'
import { getSocket } from '../../messages/realtime/socket'
import { notificationKeys } from './notificationsApi'

/**
 * Keeps the bell badge and the panel live. Mount once, app-level (Layout) —
 * a notification's whole point is arriving while you're looking at something
 * else, so this can't live on the panel.
 *
 * Shares the one socket the messaging layer already opens; the server joins
 * every socket to `user:<id>` on connect, which is the room notify() emits to.
 *
 * Refetching rather than patching the cache keeps the server authoritative on
 * the unread count — the same discipline useMessageNotifications follows.
 */
export function useNotificationEvents() {
  const { data: me } = useMe()
  const meId = me?.id
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!meId) return
    const socket = getSocket()

    const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() })

    socket.on('notify:new', refresh) // something happened that concerns you
    socket.on('notify:read', refresh) // you read one — here or on another device

    return () => {
      socket.off('notify:new', refresh)
      socket.off('notify:read', refresh)
    }
  }, [meId, queryClient])
}
