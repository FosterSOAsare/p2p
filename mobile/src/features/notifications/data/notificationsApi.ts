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

/**
 * Marking read is optimistic — the row and the badge both settle before the
 * server answers.
 *
 * This is the clearest case for it in the app: the write cannot meaningfully
 * fail (it is idempotent and needs no permission beyond owning the row), the
 * change is one boolean, and the alternative is tapping a notification and
 * watching the unread dot sit there for the best part of a second. `onMutate`
 * snapshots the page so a genuine failure rolls straight back.
 */
function patchNotifications(
  qc: ReturnType<typeof useQueryClient>,
  patch: (page: NotificationPage) => NotificationPage,
) {
  const previous = qc.getQueryData<NotificationPage>(notificationKeys.list());
  if (previous) qc.setQueryData<NotificationPage>(notificationKeys.list(), patch(previous));
  return previous;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onMutate: async (id) => {
      // Stop an in-flight refetch from landing on top of the patch below.
      await qc.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = patchNotifications(qc, (page) => {
        const target = page.notifications.find((n) => n.id === id);
        // Already read: leave the count alone rather than double-decrementing.
        if (!target || target.readAt) return page;
        return {
          ...page,
          unread: Math.max(0, page.unread - 1),
          notifications: page.notifications.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(notificationKeys.list(), context.previous);
    },
    // Reconcile against the server either way — the optimistic page is a guess
    // about one row, not about what else may have arrived meanwhile.
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.list() }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ ok: true; updated: number }>('/api/notifications/read-all', { method: 'POST' }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = patchNotifications(qc, (page) => ({
        ...page,
        unread: 0,
        notifications: page.notifications.map((n) =>
          n.readAt ? n : { ...n, readAt: new Date().toISOString() },
        ),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(notificationKeys.list(), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.list() }),
  });
}
