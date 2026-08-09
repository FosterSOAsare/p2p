import React, { createContext, useCallback, useContext, useMemo } from 'react';

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

  const blocked = useMemo(() => {
    const map = new Map<string, BlockedVendor>();
    for (const v of blockedQuery.data ?? []) map.set(v.username, v);
    return map;
  }, [blockedQuery.data]);

  const block = useCallback(
    (username: string, reason: string) => blockVendor.mutate({ username, reason }),
    [blockVendor],
  );

  const unblock = useCallback(
    (username: string) => unblockVendor.mutate(username),
    [unblockVendor],
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
