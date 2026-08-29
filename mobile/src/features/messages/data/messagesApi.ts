import { useQuery } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * The message **inbox** — `GET /api/messages`.
 *
 * The thread itself is not here: it runs entirely on the socket (see
 * `useChat`), which is what makes an incoming message appear immediately
 * instead of after a full refetch. What is left is the conversation list, which
 * is a genuine list query — paged, cached, and shared with the unread badge in
 * the app bar — so React Query still suits it.
 *
 * Threads are keyed by the other person's username, not a conversation id, so
 * every "Message" button in the app can link straight to `/messages/<username>`
 * without looking anything up first.
 */

export interface Counterparty {
  username: string;
  avatarUrl: string | null;
  storeName: string | null;
  verified: boolean;
}

export interface ConversationSummary {
  id: string;
  counterparty: Counterparty;
  lastMessage: {
    body: string;
    type: 'text' | 'file' | 'system';
    /** True when the signed-in account sent it — drives the "You: " prefix. */
    mine: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  thread: (username: string) => [...messageKeys.all, 'thread', username] as const,
};

/** The inbox. Also the only source of unread counts in the app. */
export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: () =>
      api<{ conversations: ConversationSummary[] }>('/api/messages').then((r) => r.conversations),
    /**
     * 30 seconds, not the client's five-minute default and not zero either.
     *
     * `useLiveBadges` keeps this fresh over the socket, so this is only the
     * floor for when the socket is down, reconnecting, or the app has just come
     * back from the background. Zero was the wrong floor: it made every single
     * navigation to a screen showing the badge fire a fresh round trip, which on
     * this connection is seconds of work for a number that had almost certainly
     * not changed. Half a minute keeps the badge honest without that cost.
     */
    staleTime: 30_000,
    retry: false,
  });
}
