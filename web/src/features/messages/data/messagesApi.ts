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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

/**
 * Deal messaging. Every buyer↔seller pair has exactly one thread; escrow
 * lifecycle events and moderation notices are posted into it server-side, which
 * is also what the admin reads as dispute evidence.
 */

export interface Counterparty {
  username: string
  avatarUrl: string | null
  storeName: string | null
  verified: boolean
}

export interface Message {
  id: string
  body: string
  mine: boolean
  escrowId: string | null
  createdAt: string
}

export interface Conversation {
  id: string
  counterparty: Counterparty
  lastMessage: { body: string; mine: boolean; createdAt: string } | null
  unreadCount: number
  updatedAt: string
}

export interface Thread {
  counterparty: Counterparty
  messages: Message[]
}

export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  thread: (username: string) => [...messageKeys.all, 'thread', username] as const,
}

export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: () => api<Conversation[]>('/api/messages'),
    retry: false,
  })
}

export function useThread(username: string) {
  return useQuery({
    queryKey: messageKeys.thread(username),
    queryFn: () => api<Thread>(`/api/messages/${username}`),
    enabled: Boolean(username),
    retry: false,
    // No WebSocket yet — a light poll keeps the thread close to live.
    refetchInterval: 15_000,
  })
}

export function useSendMessage(username: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api<Message>(`/api/messages/${username}`, { method: 'POST', body: { body } }),
    onSuccess: (message) => {
      // Append locally so the bubble appears instantly, then refresh.
      qc.setQueryData<Thread>(messageKeys.thread(username), (prev) =>
        prev ? { ...prev, messages: [...prev.messages, message] } : prev,
      )
      qc.invalidateQueries({ queryKey: messageKeys.conversations() })
    },
  })
}

export function useMarkThreadRead(username: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api(`/api/messages/${username}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.conversations() }),
  })
}
