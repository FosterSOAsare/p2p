import { useCallback, useEffect, useRef, useState } from 'react'
import { useMe } from '../../auth/data/authApi'
import { getSocket, type Ack } from '../realtime/socket'

// ---------- wire shapes (mirror server/src/features/messages/messages.service.ts) ----------

export type MessageType = 'text' | 'file' | 'system'

export interface Attachment {
  url: string
  name: string
  mime: string
  size: number
}

/**
 * No `mine` flag — one payload is broadcast to both parties, so the view
 * derives it by comparing senderId against the signed-in user (`meId` below).
 */
export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderUsername: string
  type: MessageType
  body: string
  attachment: Attachment | null
  escrowId: string | null
  readAt: string | null
  createdAt: string
}

export interface ChatCounterparty {
  username: string
  avatarUrl: string | null
  storeName: string | null
  verified: boolean
}

interface OpenResult {
  conversationId: string
  counterparty: ChatCounterparty
  messages: ChatMessage[]
  incremental: boolean
  hasMore: boolean
}

interface HistoryResult {
  messages: ChatMessage[]
  hasMore: boolean
}

const TYPING_THROTTLE_MS = 2000

/**
 * Live 1:1 chat with one counterparty, over the app socket.
 *
 * History arrives in the `conversation:open` ack rather than a REST call, and
 * on reconnect the same call gap-fills whatever was missed while offline.
 */
export function useChat(username: string) {
  const { data: me } = useMe()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [counterparty, setCounterparty] = useState<ChatCounterparty | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counterpartyTyping, setCounterpartyTyping] = useState(false)
  /** History above what we hold, reachable by scrolling to the top. */
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const conversationId = useRef<string | null>(null)
  /** Newest message we hold — the gap-fill cursor for the next open. */
  const lastMessageId = useRef<string | undefined>(undefined)
  /** Read through a ref so identity changes don't re-subscribe the socket. */
  const meId = useRef<string | undefined>(undefined)
  meId.current = me?.id

  // Mirrored into refs because the scroll handler that calls loadOlder fires on
  // every frame while the reader sits at the top — it needs the current values,
  // not the ones captured when the callback was last built.
  const oldestMessageId = useRef<string | undefined>(undefined)
  oldestMessageId.current = messages[0]?.id
  const hasMoreRef = useRef(false)
  hasMoreRef.current = hasMore
  const loadingOlderRef = useRef(false)

  const lastTypingSent = useRef(0)
  const typingStopTimer = useRef<number | undefined>(undefined)
  const typingClearTimer = useRef<number | undefined>(undefined)

  const appendMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      // Our own sends arrive twice — once as the send ack, once as the
      // message:new broadcast we receive as a member of the room.
      if (prev.some((m) => m.id === incoming.id)) return prev
      return [...prev, incoming]
    })
    lastMessageId.current = incoming.id
  }, [])

  useEffect(() => {
    if (!username) return
    const socket = getSocket()

    const open = () => {
      socket.emit(
        'conversation:open',
        { username, sinceId: lastMessageId.current },
        (res: Ack<OpenResult>) => {
          setLoading(false)
          if (!res.ok) {
            setError(res.error.message)
            return
          }
          setError(null)
          conversationId.current = res.data.conversationId
          setCounterparty(res.data.counterparty)
          // incremental = a gap-fill to append; otherwise it's the full history
          // and our cursor was stale, so replace what we hold.
          setMessages((prev) => (res.data.incremental ? [...prev, ...res.data.messages] : res.data.messages))
          // Only meaningful on a full load. A gap-fill answers "what did I miss
          // at the bottom", so its hasMore says nothing about the top and would
          // wrongly clear a `true` we're already holding.
          if (!res.data.incremental) setHasMore(res.data.hasMore)
          const newest = res.data.messages.at(-1)
          if (newest) lastMessageId.current = newest.id
        },
      )
    }

    const onConnect = () => {
      setConnected(true)
      open() // also covers reconnects — this is where the gap-fill happens
    }
    const onDisconnect = () => setConnected(false)

    const onMessage = (m: ChatMessage) => {
      if (m.conversationId !== conversationId.current) return
      appendMessage(m)
      // We're looking at the thread, so anything from them is read on arrival.
      if (m.senderId !== meId.current) socket.emit('message:read', { username })
    }

    const onRead = (p: { conversationId: string; readerId: string; readAt: string }) => {
      if (p.conversationId !== conversationId.current || p.readerId === meId.current) return
      setMessages((prev) =>
        prev.map((m) => (m.senderId === meId.current && !m.readAt ? { ...m, readAt: p.readAt } : m)),
      )
    }

    const onTyping = (p: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (p.conversationId !== conversationId.current || p.userId === meId.current) return
      setCounterpartyTyping(p.isTyping)
      // Safety net: if the trailing "stopped" relay is ever lost (tab closed
      // mid-keystroke), don't leave the indicator stuck on forever.
      window.clearTimeout(typingClearTimer.current)
      if (p.isTyping) typingClearTimer.current = window.setTimeout(() => setCounterpartyTyping(false), 5000)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('message:new', onMessage)
    socket.on('message:read', onRead)
    socket.on('typing', onTyping)

    if (socket.connected) onConnect()

    return () => {
      socket.emit('conversation:leave')
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('message:new', onMessage)
      socket.off('message:read', onRead)
      socket.off('typing', onTyping)
      window.clearTimeout(typingStopTimer.current)
      window.clearTimeout(typingClearTimer.current)
      conversationId.current = null
      lastMessageId.current = undefined
      loadingOlderRef.current = false
      setCounterpartyTyping(false)
      setHasMore(false)
      setLoadingOlder(false)
    }
  }, [username, appendMessage])

  /**
   * Fetch the page above what we hold. Safe to call on every scroll event: it
   * no-ops while a page is in flight, once the top is reached, and before the
   * first page has landed.
   */
  const loadOlder = useCallback(() => {
    if (loadingOlderRef.current || !hasMoreRef.current) return
    const before = oldestMessageId.current
    if (!before) return

    const socket = getSocket()
    if (!socket.connected) return

    loadingOlderRef.current = true
    setLoadingOlder(true)
    socket.emit('conversation:history', { username, beforeId: before }, (res: Ack<HistoryResult>) => {
      loadingOlderRef.current = false
      setLoadingOlder(false)
      if (!res.ok) {
        setError(res.error.message)
        return
      }
      setHasMore(res.data.hasMore)
      setMessages((prev) => {
        // Guard against a double-fetch racing in with rows we already hold —
        // prepending them would duplicate keys and break the scroll anchor.
        const known = new Set(prev.map((m) => m.id))
        const fresh = res.data.messages.filter((m) => !known.has(m.id))
        return fresh.length ? [...fresh, ...prev] : prev
      })
    })
  }, [username])

  const emitTyping = useCallback((isTyping: boolean) => {
    lastTypingSent.current = isTyping ? Date.now() : 0
    getSocket().emit('typing', { isTyping })
  }, [])

  const send = useCallback(
    (payload: { body?: string; attachment?: Attachment }) => {
      window.clearTimeout(typingStopTimer.current)
      emitTyping(false)
      getSocket().emit('message:send', { username, ...payload }, (res: Ack<ChatMessage>) => {
        if (!res.ok) setError(res.error.message)
        else appendMessage(res.data) // usually a no-op; the broadcast normally wins the race
      })
    },
    [username, appendMessage, emitTyping],
  )

  const sendText = useCallback(
    (body: string) => {
      const trimmed = body.trim()
      if (trimmed) send({ body: trimmed })
    },
    [send],
  )

  const sendFile = useCallback((attachment: Attachment) => send({ attachment }), [send])

  const markRead = useCallback(() => {
    getSocket().emit('message:read', { username })
  }, [username])

  /** Call on each keystroke — throttled, with a trailing "stopped typing". */
  const notifyTyping = useCallback(() => {
    if (Date.now() - lastTypingSent.current > TYPING_THROTTLE_MS) emitTyping(true)
    window.clearTimeout(typingStopTimer.current)
    typingStopTimer.current = window.setTimeout(() => emitTyping(false), TYPING_THROTTLE_MS)
  }, [emitTyping])

  return {
    messages,
    counterparty,
    meId: me?.id,
    connected,
    loading,
    error,
    counterpartyTyping,
    hasMore,
    loadingOlder,
    loadOlder,
    sendText,
    sendFile,
    markRead,
    notifyTyping,
  }
}
