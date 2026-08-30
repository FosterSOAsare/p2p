import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  useBlockedVendors,
  useBlockVendor,
  useUnblockVendor,
  type BlockedVendor,
} from '@/features/user/data/usersApi';

/**
 * Vendors this account has blocked.
 *
 * Backed by the server — `GET /api/users/me/blocked` and its two mutations —
 * exactly as the web does it. It used to be a `Map` in React state, so blocking
 * someone lasted until the next reload and then quietly undid itself.
 *
 * The marketplace filters on this:
 *
 *   data.listings.filter((p) => !blocked.has(p.sellerUsername))
 *
 * which is the only thing making one shopper's feed differ from another's — the
 * catalogue itself is identical for buyers and sellers.
 *
 * The interface is unchanged so every consumer keeps working; `block` is now
 * async-backed but still fire-and-forget from the caller's point of view.
 */

export type { BlockedVendor };

interface BlockedContextValue {
  blocked: Map<string, BlockedVendor>;
  isBlocked: (username: string) => boolean;
  block: (username: string, reason: string) => void;
  unblock: (username: string) => void;
  isPending: boolean;
}

const BlockedContext = createContext<BlockedContextValue | null>(null);

export function BlockedProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const blockedQuery = useBlockedVendors(isAuthenticated);
  const blockVendor = useBlockVendor();
  const unblockVendor = useUnblockVendor();

  /**
   * Optimistic overrides, keyed by username — `true` blocked, `false` not.
   *
   * Blocking is the one action here whose whole point is immediate: you block a
   * vendor to stop seeing them, and the marketplace filters on this map. Waiting
   * out a round trip meant their listings stayed on screen for the best part of
   * a second after you'd asked for them to go, which reads as the button having
   * missed. Same pattern as `SavedContext`, including retiring an override only
   * once the server's own list agrees rather than when the mutation returns —
   * the refetch is a second round trip, and dropping it early makes the row
   * reappear in between.
   */
  const [pending, setPending] = useState<Record<string, BlockedVendor | null>>({});

  const serverBlocked = useMemo(() => {
    const map = new Map<string, BlockedVendor>();
    for (const v of blockedQuery.data ?? []) map.set(v.username, v);
    return map;
  }, [blockedQuery.data]);

  const blocked = useMemo(() => {
    const map = new Map(serverBlocked);
    for (const [username, row] of Object.entries(pending)) {
      if (row) map.set(username, row);
      else map.delete(username);
    }
    return map;
  }, [serverBlocked, pending]);

  const drop = useCallback((username: string) => {
    setPending((p) => {
      if (!(username in p)) return p;
      const { [username]: _dropped, ...rest } = p;
      return rest;
    });
  }, []);

  useEffect(() => {
    for (const [username, row] of Object.entries(pending)) {
      if (serverBlocked.has(username) === Boolean(row)) drop(username);
    }
  }, [serverBlocked, pending, drop]);

  const block = useCallback(
    (username: string, reason: string) => {
      // A placeholder row until the server sends the real one. `storeName` and
      // the avatar are unknown here; the list screen renders the handle, and
      // the refetch fills the rest in a moment.
      setPending((p) => ({
        ...p,
        [username]: {
          username,
          avatarUrl: null,
          storeName: null,
          reason,
          blockedAt: new Date().toISOString(),
        },
      }));
      blockVendor.mutate({ username, reason }, { onError: () => drop(username) });
    },
    [blockVendor, drop],
  );

  const unblock = useCallback(
    (username: string) => {
      setPending((p) => ({ ...p, [username]: null }));
      unblockVendor.mutate(username, { onError: () => drop(username) });
    },
    [unblockVendor, drop],
  );

  const value = useMemo(
    () => ({
      blocked,
      isBlocked: (u: string) => blocked.has(u),
      block,
      unblock,
      isPending: blockVendor.isPending || unblockVendor.isPending,
    }),
    [blocked, block, unblock, blockVendor.isPending, unblockVendor.isPending],
  );

  return <BlockedContext.Provider value={value}>{children}</BlockedContext.Provider>;
}

export function useBlocked(): BlockedContextValue {
  const ctx = useContext(BlockedContext);
  if (!ctx) throw new Error('useBlocked must be used within a BlockedProvider');
  return ctx;
}
