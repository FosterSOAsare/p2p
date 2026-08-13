import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../realtime/socket';
import { messageKeys, type Message } from './messagesApi';

/**
 * Keeps an open thread live — the mobile counterpart of the web's `useChat`.
 *
 * Without this the socket would be a write-only pipe: you could send an image
 * but the other side wouldn't see it until they pulled to refresh, and neither
 * would you see theirs. The thread screen already renders from the React Query
 * cache, so the cheapest correct thing an incoming event can do is invalidate
 * that cache and let the existing query refetch.
 *
 * Joining the conversation room is also what marks it read server-side (see
 * `conversation:open` in messages.gateway.ts), so opening a chat clears its
 * unread badge without a separate call.
 */
export function useChatSocket(username: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!username) return;

    const socket = getSocket();

    // `connect` fires only if the socket wasn't already up, so joining is done
    // both on the event and immediately — otherwise navigating between threads
    // on an established connection would never join the second one.
    const join = () => socket.emit('conversation:open', { username }, () => {});

    if (socket.connected) join();
    socket.on('connect', join);

    const onMessage = (m: Message) => {
      qc.invalidateQueries({ queryKey: messageKeys.thread(username) });
      // The inbox shows the preview line, the ordering and the unread count.
      qc.invalidateQueries({ queryKey: messageKeys.conversations() });
      // Someone else's message arriving while you're looking at the thread is
      // already read — tell the server so the badge doesn't reappear.
      if (!m.mine) socket.emit('message:read', { username }, () => {});
    };

    /**
     * The counterparty opened the thread, so your messages are now read.
     *
     * Without this the second tick would only appear on a manual refresh — the
     * server broadcasts this precisely so the sender's open thread can flip its
     * ticks, and ignoring it would waste the one event that makes them live.
     */
    const onRead = () => {
      qc.invalidateQueries({ queryKey: messageKeys.thread(username) });
      qc.invalidateQueries({ queryKey: messageKeys.conversations() });
    };

    socket.on('message:new', onMessage);
    socket.on('message:read', onRead);

    return () => {
      socket.off('connect', join);
      socket.off('message:new', onMessage);
      socket.off('message:read', onRead);
      // Leave the room, or a user who has moved on keeps receiving this
      // thread's traffic and re-invalidating a cache nothing is showing.
      socket.emit('conversation:leave');
    };
  }, [username, qc]);
}
