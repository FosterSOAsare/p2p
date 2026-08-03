import { useQuery } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { useMe } from '../../auth/data/authApi'
import type { MessageType } from './useChat'

/**
 * The inbox snapshot. REST on purpose: the list is a page load, not a live
 * channel — `notify:message` on the user room is what keeps it fresh, by
 * invalidating this query rather than patching counts client-side.
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
  conversations: ['messages', 'conversations'] as const,
}

/**
 * Gated on auth because Layout calls this on every page for the unread badge —
 * `enabled` is reactive, so it starts on login and stops on logout.
 */
export function useConversations() {
  const { data: me } = useMe()
  return useQuery({
    queryKey: messageKeys.conversations,
    queryFn: async () => {
      const res = await api<{ conversations: ConversationSummary[] }>('/api/messages')
      return res.conversations
    },
    enabled: Boolean(me),
  })
}

/** Total unread across every thread — the number on the Messages nav item. */
export function useUnreadTotal(): number {
  const { data } = useConversations()
  return (data ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
}
