import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getSocket } from '@/features/messages/realtime/socket';
import { messageKeys } from '@/features/messages/data/messagesApi';
import {
  notificationKeys,
  type AppNotification,
  type NotificationCategory,
} from '@/features/notifications/data/notificationsApi';
import { dealKeys } from '@/features/escrow/data/dealsApi';
import { walletKeys } from '@/features/wallet/data/walletApi';
import { dashboardKeys } from '@/features/dashboard/data/dashboardApi';
import { kycKeys } from '@/features/seller/data/kycApi';
import { listingKeys } from '@/features/listings/data/listingsApi';
import { promotionKeys } from '@/features/seller/data/promotions';

/**
 * Keeps the header badges — and any open deal — live. Mount **once,
 * app-level**: mounting it on a screen would mean things only update while
 * you're already looking at them, which is exactly when you don't need it. The
 * deal listener depends on that too, since the creator of a shared deal is
 * often sitting on the deal page when the other party joins.
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
/**
 * What each kind of notification means for the cache.
 *
 * A notification is not only something to show in the bell — it is the server
 * saying a thing changed, and it is usually the *only* thing that says so,
 * because the change was somebody else's doing. An admin completing a payout
 * writes to the seller's wallet; nothing on the seller's phone knows unless
 * this does. Refreshing the notification list and stopping there is what left
 * the wallet needing a pull-to-refresh.
 *
 * The dashboard is refreshed for every category rather than listed each time:
 * it aggregates balances, deal counts and KYC state, so any of these moves it.
 */
/**
 * Every admin queue is keyed under this prefix, so one entry refreshes the
 * whole console. It belongs on the categories admins are notified about —
 * a new KYC submission, a listing appeal or report, a new dispute — because
 * those notifications go to admins, and without this an admin sitting on the
 * queue saw the bell move while the list behind it did not.
 *
 * Harmless on a non-admin receiving the same category: they have no admin
 * queries mounted, so nothing refetches.
 */
const ADMIN = ['admin'] as const;

const CATEGORY_KEYS: Record<NotificationCategory, readonly (readonly unknown[])[]> = {
  wallet: [walletKeys.all, ADMIN],
  // Disputes are argued on a deal and resolving one moves its money and status.
  deal: [dealKeys.all, walletKeys.all, ADMIN],
  dispute: [dealKeys.all, walletKeys.all, ADMIN],
  // Approval flips the account to seller, which changes which tabs exist.
  kyc: [kycKeys.all, listingKeys.all, ADMIN],
  listing: [listingKeys.all, ADMIN],
  promotion: [promotionKeys.all, listingKeys.all],
  // Account-level: status changes, announcements. Nothing narrower to hit.
  system: [],
};

function refreshForCategory(qc: QueryClient, category: NotificationCategory) {
  for (const key of CATEGORY_KEYS[category] ?? []) {
    qc.invalidateQueries({ queryKey: key });
  }
  qc.invalidateQueries({ queryKey: dashboardKeys.data });
}

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

    /**
     * A new notification: refresh the bell, and whatever it is telling us about.
     *
     * The category comes on the payload already — it was simply being ignored.
     * An unrecognised one falls back to refreshing everything rather than
     * nothing, because a category this build doesn't know about is still the
     * server saying something changed, and a stale screen is the worse failure.
     */
    const onNotification = (payload: AppNotification | undefined) => {
      refreshNotifications();
      const category = payload?.category;
      if (category && category in CATEGORY_KEYS) refreshForCategory(qc, category);
      else qc.invalidateQueries();
    };

    /**
     * Reconnected — so we were disconnected, and anything emitted in that
     * window reached nobody. That is the normal case, not an edge one: a phone
     * drops the socket whenever the app is backgrounded, so this fires on the
     * way back in.
     *
     * Everything goes, deliberately. There is no way to know what was missed,
     * and invalidation only *refetches* what is currently mounted — the rest is
     * marked stale and re-read whenever it is next shown. So the cost is the
     * screen in front of the user, not the whole cache.
     */
    const onReconnect = () => qc.invalidateQueries();

    /**
     * A deal you're party to changed — someone joined it, funded it, shipped
     * it, ruled on it.
     *
     * This is the event that was missing. Joining a deal by share code posts a
     * chat message to the creator, and that message's `notify:message` was the
     * only thing reaching them — which refreshed the *inbox* and left the deal
     * page showing an invite panel for a deal that already had both parties.
     * The same gap applied to every transition: correct data, one manual
     * refresh away.
     *
     * The payload is just an id, because the two parties see different views of
     * the same row (`myRole`, `availableActions`, `share` are all per-viewer),
     * so each client re-reads its own rather than being handed the other's.
     * Both the detail and the lists are invalidated: a status change moves the
     * row's badge on My Deals too.
     */
    const refreshDeal = (payload: { id?: string }) => {
      if (payload?.id) qc.invalidateQueries({ queryKey: dealKeys.detail(payload.id) });
      qc.invalidateQueries({ queryKey: dealKeys.all });
    };

    // A message landed in some thread — not necessarily the one you're viewing.
    socket.on('notify:message', refreshMessages);
    // You read one, here or on another device.
    socket.on('message:read', refreshMessages);

    socket.on('notify:new', onNotification);
    socket.on('notify:read', refreshNotifications);

    socket.on('deal:updated', refreshDeal);

    socket.on('connect', onReconnect);

    return () => {
      socket.off('notify:message', refreshMessages);
      socket.off('message:read', refreshMessages);
      socket.off('notify:new', onNotification);
      socket.off('notify:read', refreshNotifications);
      socket.off('deal:updated', refreshDeal);
      socket.off('connect', onReconnect);
    };
  }, [enabled, qc]);
}
