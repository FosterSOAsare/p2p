import { useQuery } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { useMe } from '../../auth/data/authApi'
import type { MessageType } from './useChat'

/**
 * The inbox snapshot. REST on purpose: the list is a page load, not a live
 * channel — `notify:message` on the user room is what keeps it fresh, by
 * invalidating this query rather than patching counts client-side.
 *
 * The open thread itself is not here: that's `useChat`, over the socket.
 */

export interface ConversationSummary {
  id: string
  counterparty: {
    username: string
    avatarUrl: string | null
    storeName: string | null
    verified: boolean
  }
  lastMessage: {
    body: string
    type: MessageType
    mine: boolean
    createdAt: string
  } | null
  unreadCount: number
  updatedAt: string
}

export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
}

export function useConversations() {
  const { data: me } = useMe()
  return useQuery({
    queryKey: messageKeys.conversations(),
    // The server wraps the list: `res.json({ conversations })`.
    queryFn: () =>
      api<{ conversations: ConversationSummary[] }>('/api/messages').then((r) => r.conversations),
    // Layout mounts this on every page, signed in or not — without the gate a
    // logged-out visitor fires a guaranteed 401 on each navigation.
    enabled: Boolean(me),
    retry: false,
  })
}

/** Total unread across every thread — the number on the Messages nav item. */
export function useUnreadTotal(): number {
  const { data } = useConversations()
  return (data ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
}
