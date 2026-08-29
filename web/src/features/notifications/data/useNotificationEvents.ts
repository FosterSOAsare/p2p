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

    /**
     * A deal you're party to changed — someone joined it, funded it, shipped it.
     *
     * Nothing invalidated the deal itself before: `notify:new` only refreshed
     * the notification list, so an open deal page kept whatever it loaded with.
     * The creator of a shared deal watched an invite panel for a deal that
     * already had both parties, until they refreshed by hand.
     *
     * Only the id travels — each party's view of a deal differs (`myRole`,
     * `availableActions`, `share`), so they re-read their own rather than being
     * handed the other's copy.
     *
     * The whole `escrows` prefix goes rather than just this deal: `dealKeys`
     * puts both `detail` and `list` under it, and a status change moves the
     * row's badge on My Deals as well as the page you're looking at. `deals` is
     * the separate key the create mutation invalidates.
     */
    const refreshDeal = () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    }

    socket.on('notify:new', refresh) // something happened that concerns you
    socket.on('notify:read', refresh) // you read one — here or on another device
    socket.on('deal:updated', refreshDeal)

    return () => {
      socket.off('notify:new', refresh)
      socket.off('notify:read', refresh)
      socket.off('deal:updated', refreshDeal)
    }
  }, [meId, queryClient])
}
