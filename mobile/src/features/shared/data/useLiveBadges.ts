import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/features/messages/realtime/socket';
import { messageKeys } from '@/features/messages/data/messagesApi';
import { notificationKeys } from '@/features/notifications/data/notificationsApi';

/**
 * Keeps the two header badges live. Mount **once, app-level** — mounting it on
 * a screen would mean the counts only update while you're already looking at
 * the thing they count, which is exactly when you don't need them.
 *
 * The mobile counterpart of the web's `useMessageNotifications` +
 * `useNotificationEvents`, combined because the phone has one place to mount it.
 *
 * Refetching rather than patching the cache keeps the server authoritative: it
 * already excludes your own messages from the count and zeroes a thread the
 * moment you read it, so there is no client-side "is this mine / am I looking at
 * it / did I count it already" logic here to get wrong.
 *
 * Deliberately plain: a static import and one effect. An earlier version tried
 * to defer this with `InteractionManager` and a dynamic `import()`; the dynamic
 * import puts an async module boundary in front of the socket, which under Metro
 * costs more than the connection it was trying to move off the critical path.
 * Straight-line code is faster here and easier to reason about.
 */
export function useLiveBadges(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    // No socket before sign-in: the handshake would be rejected, and the
    // reconnect loop would keep retrying against a session that doesn't exist.
    if (!enabled) return;

    const socket = getSocket();

    const refreshMessages = () => qc.invalidateQueries({ queryKey: messageKeys.conversations() });
    const refreshNotifications = () =>
      qc.invalidateQueries({ queryKey: notificationKeys.list() });

    // A message landed in some thread — not necessarily the one you're viewing.
    socket.on('notify:message', refreshMessages);
    // You read one, here or on another device.
    socket.on('message:read', refreshMessages);

    socket.on('notify:new', refreshNotifications);
    socket.on('notify:read', refreshNotifications);

    return () => {
      socket.off('notify:message', refreshMessages);
      socket.off('message:read', refreshMessages);
      socket.off('notify:new', refreshNotifications);
      socket.off('notify:read', refreshNotifications);
    };
  }, [enabled, qc]);
}
