import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * In-app notifications — `GET /api/notifications` and its two read endpoints.
 *
 * Mirrors `web/src/features/notifications/data/notificationsApi.ts`, with one
 * deliberate difference: the web pages this with `useInfiniteQuery` because its
 * panel is the only surface and has to carry the whole history. The phone has a
 * dedicated screen, and a single generous page is both simpler and one round
 * trip instead of several on a link where each costs real time.
 */

export type NotificationCategory = 'deal' | 'listing' | 'dispute' | 'kyc' | 'wallet' | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** In-app path to open, e.g. `/escrow/:id`. Null when there's nowhere to go. */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationPage {
  notifications: AppNotification[];
  /** Unread across every page — carried on each response, so the badge is free. */
  unread: number;
  page: number;
  pages: number;
  total: number;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => api<NotificationPage>('/api/notifications?page=1&limit=50'),
    /**
     * 30 seconds — the same floor as the inbox, and for the same reason.
     *
     * `useLiveBadges` pushes `notify:new` / `notify:read` over the socket, so
     * this only covers the socket being down or the app waking up. Zero meant a
     * fresh round trip on every navigation to a screen carrying the bell, which
     * is seconds of work for a number the socket had already kept correct.
     */
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * The bell badge. Reads the count off the list response rather than issuing its
 * own request — the endpoint returns the global unread total on every page.
 */
export function useUnreadNotifications(): number {
  const { data } = useNotifications();
  return data?.unread ?? 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list() }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ ok: true; updated: number }>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list() }),
  });
}
