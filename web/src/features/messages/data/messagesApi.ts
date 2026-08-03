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
