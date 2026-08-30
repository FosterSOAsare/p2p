import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authKeys, useMe } from '../../auth/data/authApi'
import { dashboardKeys } from '../../user/data/usersApi'
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

    /**
     * A notification is not only something for the bell — it is the server
     * saying a thing changed, and usually the only thing that says so, because
     * the change was somebody else's doing. An admin completing a payout writes
     * to the seller's wallet; nothing here knows unless this does.
     *
     * The category rides on the payload and was simply being ignored, so the
     * bell updated and the data behind it did not. An unrecognised category
     * refreshes everything rather than nothing — a build that doesn't know the
     * category is still being told something changed, and a stale screen is the
     * worse failure. Invalidation only refetches what is mounted, so the cost
     * is the page in front of the reader.
     */
    const onNotification = (payload: { category?: string } | undefined) => {
      refresh()
      switch (payload?.category) {
        case 'wallet':
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          break
        case 'deal':
        case 'dispute':
          refreshDeal()
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          break
        case 'kyc':
          queryClient.invalidateQueries({ queryKey: ['kyc'] })
          // Approval flips the account to seller, which changes the whole shell.
          queryClient.invalidateQueries({ queryKey: authKeys.me })
          break
        case 'listing':
        case 'promotion':
          queryClient.invalidateQueries({ queryKey: ['listings'] })
          queryClient.invalidateQueries({ queryKey: ['promotions'] })
          break
        case 'system':
          break
        default:
          queryClient.invalidateQueries()
          return
      }
      // Balances, deal counts and KYC state all surface here.
      queryClient.invalidateQueries({ queryKey: dashboardKeys.data })
    }

    /**
     * Reconnected, so we were disconnected, and anything emitted in that window
     * reached nobody. Everything goes: there is no knowing what was missed.
     */
    const onReconnect = () => queryClient.invalidateQueries()

    socket.on('notify:new', onNotification) // something happened that concerns you
    socket.on('notify:read', refresh) // you read one — here or on another device
    socket.on('deal:updated', refreshDeal)
    socket.on('connect', onReconnect)

    return () => {
      socket.off('notify:new', onNotification)
      socket.off('notify:read', refresh)
      socket.off('deal:updated', refreshDeal)
      socket.off('connect', onReconnect)
    }
  }, [meId, queryClient])
}
