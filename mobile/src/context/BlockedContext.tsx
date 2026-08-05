import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Vendors this account has blocked.
 *
 * The web keeps this server-side (`GET /api/users/me/blocked`) and filters the
 * marketplace with it:
 *
 *   data.listings.filter((p) => !blockedSellers.has(p.sellerUsername))
 *
 * so a blocked vendor's listings disappear from your feed. That's the only
 * thing that makes one shopper's marketplace differ from another's — the
 * catalogue itself is identical for buyers and sellers.
 *
 * Blocking lived as local state inside the seller profile, so it changed
 * nothing. One shared set fixes that. Swap for `useBlockedVendors` /
 * `useBlockVendor` / `useUnblockVendor` when the API client is wired.
 */

export interface BlockedVendor {
  username: string;
  reason: string;
  blockedAt: string;
}

interface BlockedContextValue {
  blocked: Map<string, BlockedVendor>;
  isBlocked: (username: string) => boolean;
  block: (username: string, reason: string) => void;
  unblock: (username: string) => void;
}

const BlockedContext = createContext<BlockedContextValue | null>(null);

export function BlockedProvider({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState<Map<string, BlockedVendor>>(new Map());

  const block = useCallback((username: string, reason: string) => {
    setBlocked((prev) => {
      const next = new Map(prev);
      next.set(username, { username, reason, blockedAt: new Date().toISOString() });
      return next;
    });
  }, []);

  const unblock = useCallback((username: string) => {
    setBlocked((prev) => {
      const next = new Map(prev);
      next.delete(username);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ blocked, isBlocked: (u: string) => blocked.has(u), block, unblock }),
    [blocked, block, unblock],
  );

  return <BlockedContext.Provider value={value}>{children}</BlockedContext.Provider>;
}

export function useBlocked(): BlockedContextValue {
  const ctx = useContext(BlockedContext);
  if (!ctx) throw new Error('useBlocked must be used within a BlockedProvider');
  return ctx;
}
