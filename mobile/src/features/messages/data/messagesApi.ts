import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';
import { emitWithAck, type Attachment } from '../realtime/socket';

export type { Attachment };

/**
 * Per-counterparty chat — `GET/POST /api/messages/:username`.
 *
 * Mirrors `web/src/features/messages/data/messagesApi.ts`. Threads are keyed by
 * the other person's username, not a conversation id, so every "Message" button
 * in the app can link straight to `/messages/<username>` without looking
 * anything up first.
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

export interface Message {
  id: string;
  conversationId: string;
  senderUsername: string;
  type: 'text' | 'file' | 'system';
  body: string;
  /**
   * An **object**, not a URL string — the server splits it back out of four
   * columns (`attachmentUrl`/`Name`/`Mime`/`Size`). Typed as a string here
   * previously, which meant the thread's image lookup was handing an object to
   * an `<Image source={{ uri }}>` and silently rendering nothing.
   */
  attachment: Attachment | null;
  escrowId: string | null;
  readAt: string | null;
  createdAt: string;
  mine: boolean;
}

export interface Thread {
  counterparty: Counterparty;
  messages: Message[];
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

export function useThread(username: string) {
  return useQuery({
    queryKey: messageKeys.thread(username),
    queryFn: () => api<Thread>(`/api/messages/${username}`),
    enabled: Boolean(username),
    retry: false,
  });
}

/**
 * Sending changes two things — the thread and the inbox's preview/ordering —
 * so both are invalidated rather than one being patched by hand.
 */
export function useSendMessage(username: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<{ message: Message }>(`/api/messages/${username}`, {
        method: 'POST',
        body: { body },
      }).then((r) => r.message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.thread(username) });
      qc.invalidateQueries({ queryKey: messageKeys.conversations() });
    },
  });
}

/**
 * Send a file — the evidence path.
 *
 * Goes over the socket rather than REST because it has to: the REST endpoint's
 * validator accepts `body` and nothing else, so a file sent that way would be
 * stored as a text message and could never render as an attachment. Only
 * `message:send` persists the four attachment columns that make the result a
 * real `file` message, which is what a dispute needs to be able to point at.
 *
 * The upload happens first (Cloudinary, over REST); what travels here is the
 * hosted URL plus the metadata the server requires.
 */
export function useSendAttachment(username: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachment: Attachment) =>
      emitWithAck<Message>('message:send', { username, attachment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.thread(username) });
      qc.invalidateQueries({ queryKey: messageKeys.conversations() });
    },
  });
}

/** Clears this thread's unread badge; the inbox count comes from the server. */
export function useMarkRead(username: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>(`/api/messages/${username}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.conversations() }),
  });
}
