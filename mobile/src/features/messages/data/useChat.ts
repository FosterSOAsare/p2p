import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getSocket, type Ack, type Attachment } from '../realtime/socket';
import { messageKeys } from './messagesApi';

/**
 * Live 1:1 chat over the app socket — the phone port of `web/src/features/
 * messages/data/useChat.ts`.
 *
 * This replaces a REST + React Query thread that used the socket only as a
 * doorbell: an incoming `message:new` threw the delivered message away and
 * called `invalidateQueries`, which issued a fresh `GET /api/messages/:username`
 * for the whole thread. On this connection a request costs 1–6 seconds, so a
 * message that had already arrived over the wire in milliseconds sat invisible
 * until that refetch landed. Sending was worse: a POST, then an invalidate, so
 * two sequential round trips before your own text appeared.
 *
 * Now history arrives in the `conversation:open` ack, incoming messages are
 * appended straight to state, and sends render instantly as a pending bubble
 * that reconciles against the server's copy. The socket is the transport;
 * Postgres is still the source of truth (see `messages.service.createMessage`).
 *
 * Two things the web version doesn't do, both because a phone is not a laptop:
 * sends are optimistic rather than ack-gated (a phone's link is slower and a
 * composer that clears but shows nothing feels broken), and a failed send stays
 * on screen as retryable rather than vanishing.
 */

export type MessageType = 'text' | 'file' | 'system';

export type { Attachment };

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  type: MessageType;
  body: string;
  attachment: Attachment | null;
  escrowId: string | null;
  readAt: string | null;
  createdAt: string;
  /** Client-only: on screen but not yet acknowledged by the server. */
  pending?: boolean;
  /** Client-only: the send was refused or timed out; offer a retry. */
  failed?: boolean;
}

export interface ChatCounterparty {
  username: string;
  avatarUrl: string | null;
  storeName: string | null;
  verified: boolean;
}

interface OpenResult {
  conversationId: string;
  counterparty: ChatCounterparty;
  messages: ChatMessage[];
  incremental: boolean;
  hasMore: boolean;
}

interface HistoryResult {
  messages: ChatMessage[];
  hasMore: boolean;
}

const TYPING_THROTTLE_MS = 2000;

/** Distinguishes an optimistic row from a persisted one. */
const isTemp = (id: string) => id.startsWith('temp:');
let tempSeq = 0;

export function useChat(username: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [counterparty, setCounterparty] = useState<ChatCounterparty | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counterpartyTyping, setCounterpartyTyping] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const conversationId = useRef<string | null>(null);
  /** Newest persisted message — the gap-fill cursor for the next open. */
  const lastMessageId = useRef<string | undefined>(undefined);
  /** Read through a ref so identity changes don't re-subscribe the socket. */
  const meId = useRef<string | undefined>(undefined);
  meId.current = user?.id;

  const oldestMessageId = useRef<string | undefined>(undefined);
  oldestMessageId.current = messages.find((m) => !isTemp(m.id))?.id;
  const hasMoreRef = useRef(false);
  hasMoreRef.current = hasMore;
  const loadingOlderRef = useRef(false);

  const lastTypingSent = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * The inbox lives in React Query and shows this thread's preview, ordering
   * and unread count, so it still has to be told when traffic moves through
   * here. Only the thread itself left the cache.
   */
  const touchInbox = useCallback(() => {
    qc.invalidateQueries({ queryKey: messageKeys.conversations() });
  }, [qc]);

  const appendMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      // Our own sends can arrive twice — once as the send ack, once as the
      // `message:new` broadcast we receive as a member of the room.
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming];
    });
    lastMessageId.current = incoming.id;
  }, []);

  useEffect(() => {
    if (!username) return;
    const socket = getSocket();

    const open = () => {
      socket.emit(
        'conversation:open',
        { username, sinceId: lastMessageId.current },
        (res: Ack<OpenResult>) => {
          setLoading(false);
          if (!res.ok) {
            setError(res.error.message);
            return;
          }
          setError(null);
          conversationId.current = res.data.conversationId;
          setCounterparty(res.data.counterparty);
          setMessages((prev) => {
            // A gap-fill appends; a full load replaces. Either way the pending
            // rows are ours and unacknowledged, so they survive both — dropping
            // them on a reconnect would erase a message still in flight.
            const pending = prev.filter((m) => isTemp(m.id));
            const settled = res.data.incremental
              ? [...prev.filter((m) => !isTemp(m.id)), ...res.data.messages]
              : res.data.messages;
            return [...settled, ...pending];
          });
          // Only meaningful on a full load: a gap-fill answers "what did I miss
          // at the bottom", so its hasMore says nothing about the top.
          if (!res.data.incremental) setHasMore(res.data.hasMore);
          const newest = res.data.messages.at(-1);
          if (newest) lastMessageId.current = newest.id;
          // Opening marks the thread read server-side, so the badge is stale.
          touchInbox();
        },
      );
    };

    const onConnect = () => {
      setConnected(true);
      open(); // also covers reconnects — this is where the gap-fill happens
    };
    const onDisconnect = () => setConnected(false);

    const onMessage = (m: ChatMessage) => {
      if (m.conversationId !== conversationId.current) return;
      appendMessage(m);
      touchInbox();
      // We're looking at the thread, so anything from them is read on arrival.
      if (m.senderId !== meId.current) socket.emit('message:read', { username }, () => {});
    };

    const onRead = (p: { conversationId: string; readerId: string; readAt: string }) => {
      if (p.conversationId !== conversationId.current || p.readerId === meId.current) return;
      setMessages((prev) =>
        prev.map((m) => (m.senderId === meId.current && !m.readAt ? { ...m, readAt: p.readAt } : m)),
      );
    };

    const onTyping = (p: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (p.conversationId !== conversationId.current || p.userId === meId.current) return;
      setCounterpartyTyping(p.isTyping);
      // Safety net: if the trailing "stopped" relay is lost, don't leave the
      // indicator stuck on forever.
      clearTimeout(typingClearTimer.current);
      if (p.isTyping) {
        typingClearTimer.current = setTimeout(() => setCounterpartyTyping(false), 5000);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onMessage);
    socket.on('message:read', onRead);
    socket.on('typing', onTyping);

    if (socket.connected) onConnect();

    return () => {
      socket.emit('conversation:leave');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onMessage);
      socket.off('message:read', onRead);
      socket.off('typing', onTyping);
      clearTimeout(typingStopTimer.current);
      clearTimeout(typingClearTimer.current);
      conversationId.current = null;
      lastMessageId.current = undefined;
      loadingOlderRef.current = false;
      setCounterpartyTyping(false);
      setHasMore(false);
      setLoadingOlder(false);
      setMessages([]);
      setLoading(true);
    };
  }, [username, appendMessage, touchInbox]);

  /**
   * Fetch the page above what we hold. Safe to call on every scroll event: it
   * no-ops while a page is in flight, once the top is reached, and before the
   * first page has landed.
   */
  const loadOlder = useCallback(() => {
    if (loadingOlderRef.current || !hasMoreRef.current) return;
    const before = oldestMessageId.current;
    if (!before) return;

    const socket = getSocket();
    if (!socket.connected) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    socket.emit(
      'conversation:history',
      { username, beforeId: before },
      (res: Ack<HistoryResult>) => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        setHasMore(res.data.hasMore);
        setMessages((prev) => {
          // Guard against a double-fetch racing in with rows we already hold —
          // prepending them would duplicate keys and break the scroll anchor.
          const known = new Set(prev.map((m) => m.id));
          const fresh = res.data.messages.filter((m) => !known.has(m.id));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
      },
    );
  }, [username]);

  const emitTyping = useCallback((isTyping: boolean) => {
    lastTypingSent.current = isTyping ? Date.now() : 0;
    getSocket().emit('typing', { isTyping });
  }, []);

  /**
   * Put the message on screen now, then send it.
   *
   * The optimistic row carries a `temp:` id so it can be told apart from
   * anything persisted — it is excluded from the history cursors, survives a
   * reconnect, and is replaced (not duplicated) once the server's copy arrives.
   */
  const send = useCallback(
    (payload: { body?: string; attachment?: Attachment }) => {
      clearTimeout(typingStopTimer.current);
      emitTyping(false);

      const tempId = `temp:${Date.now()}:${tempSeq++}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId: conversationId.current ?? '',
        senderId: meId.current ?? '',
        senderUsername: user?.username ?? '',
        type: payload.attachment ? 'file' : 'text',
        body: payload.body ?? '',
        attachment: payload.attachment ?? null,
        escrowId: null,
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      getSocket().emit('message:send', { username, ...payload }, (res: Ack<ChatMessage>) => {
        if (!res.ok) {
          // Keep it on screen, marked failed, so nothing typed is silently lost.
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
          );
          setError(res.error.message);
          return;
        }
        // Swap the placeholder for the server's copy in one update, so the row
        // never appears twice even if the broadcast beat this ack.
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === res.data.id)) return withoutTemp;
          return [...withoutTemp, res.data];
        });
        lastMessageId.current = res.data.id;
        touchInbox();
      });

      return tempId;
    },
    [username, emitTyping, user?.username, touchInbox],
  );

  const sendText = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (trimmed) send({ body: trimmed });
    },
    [send],
  );

  const sendFile = useCallback((attachment: Attachment) => send({ attachment }), [send]);

  /** Drop a failed row and send it again. */
  const retry = useCallback(
    (id: string) => {
      const target = messages.find((m) => m.id === id);
      if (!target) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setError(null);
      send(target.attachment ? { attachment: target.attachment } : { body: target.body });
    },
    [messages, send],
  );

  /** Give up on a failed row. */
  const discard = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const markRead = useCallback(() => {
    getSocket().emit('message:read', { username }, () => {});
    touchInbox();
  }, [username, touchInbox]);

  /** Call on each keystroke — throttled, with a trailing "stopped typing". */
  const notifyTyping = useCallback(() => {
    if (Date.now() - lastTypingSent.current > TYPING_THROTTLE_MS) emitTyping(true);
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => emitTyping(false), TYPING_THROTTLE_MS);
  }, [emitTyping]);

  return {
    messages,
    counterparty,
    meId: user?.id,
    connected,
    loading,
    error,
    counterpartyTyping,
    hasMore,
    loadingOlder,
    loadOlder,
    sendText,
    sendFile,
    retry,
    discard,
    markRead,
    notifyTyping,
  };
}
