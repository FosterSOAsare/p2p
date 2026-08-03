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

export type NotificationCategory = 'deal' | 'listing' | 'dispute' | 'kyc' | 'wallet' | 'system'

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

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ ok: true; updated: number }>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  })
}
