import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { useMe } from '../../auth/data/authApi'

/**
 * In-app notifications — REST snapshot kept fresh by `notify:new` / `notify:read`
 * on the user socket room (see useNotificationEvents).
 *
 * Paged rather than a flat list: the panel is the only surface, so it has to
 * carry the full history itself instead of deferring to a separate page.
 */

export type NotificationCategory = 'deal' | 'listing' | 'dispute' | 'kyc' | 'wallet' | 'promotion' | 'system'

export interface AppNotification {
  id: string
  category: NotificationCategory
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}

interface NotificationPage {
  notifications: AppNotification[]
  /** Unread across every page — carried on each response so the badge is free. */
  unread: number
  page: number
  pages: number
  total: number
}

const PAGE_SIZE = 20

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
}

export function useNotifications() {
  const { data: me } = useMe()
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) =>
      api<NotificationPage>(`/api/notifications?page=${pageParam}&limit=${PAGE_SIZE}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    // Layout mounts this on every page — without the gate a logged-out visitor
    // fires a guaranteed 401 on each navigation.
    enabled: Boolean(me),
    retry: false,
  })
}

/**
 * The bell badge. Reads the count off page 1 rather than issuing its own
 * request — the list endpoint returns the global unread total on every page.
 */
export function useUnreadNotifications(): number {
  const { data } = useNotifications()
  return data?.pages[0]?.unread ?? 0
}

/** The shape `useInfiniteQuery` keeps in the cache. */
interface NotificationCache {
  pages: NotificationPage[]
  pageParams: unknown[]
}

/**
 * Rewrite every page through `patch`, then recount the badge.
 *
 * `unread` rides on each page, so it has to be corrected on all of them rather
 * than just the one holding the notification that changed — otherwise page 1's
 * stale count keeps feeding the badge.
 */
function patchPages(
  cache: NotificationCache | undefined,
  patch: (n: AppNotification) => AppNotification,
): NotificationCache | undefined {
  if (!cache) return cache
  const pages = cache.pages.map((p) => ({ ...p, notifications: p.notifications.map(patch) }))
  // Only what's loaded can be counted, so a read on an unloaded page would be
  // missed — the settle-time invalidate is what makes the number authoritative.
  const stillUnread = pages.reduce((n, p) => n + p.notifications.filter((x) => !x.readAt).length, 0)
  return { ...cache, pages: pages.map((p) => ({ ...p, unread: stillUnread })) }
}

/**
 * Marking read is optimistic: the row is being clicked, so it must grey out and
 * drop off the badge in the same frame rather than after a round trip. The
 * server is asked all the same, and the cache is re-read once it answers.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const key = notificationKeys.list()
  return useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onMutate: async (id) => {
      // An in-flight refetch would land after this and undo it.
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<NotificationCache>(key)
      const now = new Date().toISOString()
      queryClient.setQueryData<NotificationCache>(key, (old) =>
        patchPages(old, (n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n)),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  const key = notificationKeys.list()
  return useMutation({
    mutationFn: () => api<{ ok: true; updated: number }>('/api/notifications/read-all', { method: 'POST' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<NotificationCache>(key)
      const now = new Date().toISOString()
      queryClient.setQueryData<NotificationCache>(key, (old) =>
        patchPages(old, (n) => (n.readAt ? n : { ...n, readAt: now })),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
