import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * The signed-in account's own profile — `PATCH /api/users/me` and its
 * notification preferences. Mirrors `web/src/features/user/data/usersApi.ts`.
 *
 * Note what is NOT here: username and email. The server doesn't accept changes
 * to either (`updateMe` takes only fullName, phone and avatarUrl), so those
 * fields are read-only on the profile screen rather than silently discarded.
 */

export interface UpdateMeInput {
  fullName?: string;
  /** Null clears it. */
  phone?: string | null;
  /** Must be a URL the server can resolve — not an on-device file path. */
  avatarUrl?: string | null;
}

export interface NotificationPrefs {
  emailShipmentUpdates: boolean;
  smsReleaseAlerts: boolean;
}

/** A row of the Bookmarks screen. `savedAt`, not the listing's own createdAt. */
export interface SavedListingCard {
  id: string;
  title: string;
  price: number;
  currency: 'GHS' | 'TRX';
  category: string;
  condition: string | null;
  status: string;
  image: string | null;
  sellerUsername: string;
  savedAt: string;
}

export interface BlockedVendor {
  username: string;
  avatarUrl: string | null;
  storeName: string | null;
  reason: string;
  blockedAt: string;
}

export const userKeys = {
  saved: ['users', 'saved'] as const,
  blocked: ['users', 'blocked'] as const,
};

/* ------------------------------------------------------------ saved listings */

/**
 * `GET /api/users/me/saved` — the hearts, server-side rather than on device.
 *
 * `enabled` matters: this is read by a provider mounted above every screen, so
 * without the gate a signed-out app would fire a guaranteed 401 on launch.
 */
export function useSavedListings(enabled = true) {
  return useQuery({
    queryKey: userKeys.saved,
    queryFn: () => api<{ saved: SavedListingCard[] }>('/api/users/me/saved').then((r) => r.saved),
    enabled,
    retry: false,
  });
}

/**
 * Saving changes three things, which is why all three are invalidated: the
 * bookmarks list itself, and the `savedItemsCount` stat that appears on the
 * dashboard. The web invalidates its cached `/auth/me` for the same stat;
 * mobile keeps the user in AuthContext, so there's no such key here.
 */
function useSavedMutation(method: 'POST' | 'DELETE') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) =>
      api<{ ok: true }>(`/api/users/me/saved/${listingId}`, { method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.saved });
      qc.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}

export const useSaveListing = () => useSavedMutation('POST');
export const useUnsaveListing = () => useSavedMutation('DELETE');

/* ----------------------------------------------------------- blocked vendors */

/**
 * `GET /api/users/me/blocked` — survives a reload, unlike the old local state.
 *
 * Gated like the saved list: read by a provider above every screen, so without
 * `enabled` a signed-out launch fires a guaranteed 401.
 */
export function useBlockedVendors(enabled = true) {
  return useQuery({
    queryKey: userKeys.blocked,
    queryFn: () =>
      api<{ blocked: BlockedVendor[] }>('/api/users/me/blocked').then((r) => r.blocked),
    enabled,
    retry: false,
  });
}

export function useBlockVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, reason }: { username: string; reason: string }) =>
      api<{ ok: true }>(`/api/users/${username}/block`, { method: 'POST', body: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.blocked }),
  });
}

export function useUnblockVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api<{ ok: true }>(`/api/users/${username}/block`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.blocked }),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMeInput) =>
      api<{ user: unknown }>('/api/users/me', { method: 'PATCH', body: input }),
    onSuccess: () => {
      // The dashboard greets by name and shows the avatar, so it goes stale too.
      qc.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}

/**
 * `PUT /api/users/me/notification-prefs`.
 *
 * A PUT, not a PATCH: the server requires **both** flags every time, so a
 * toggle has to send the other one's current value alongside it.
 */
export function useUpdateNotificationPrefs() {
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) =>
      api<{ ok: true }>('/api/users/me/notification-prefs', { method: 'PUT', body: prefs }),
  });
}
