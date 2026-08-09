import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  useSavedListings,
  useSaveListing,
  useUnsaveListing,
  type SavedListingCard,
} from '@/features/user/data/usersApi';

/**
 * Saved listings ("bookmarks") shared across the app.
 *
 * Without this, the heart on a marketplace card, the Save button on a listing,
 * the Bookmarks screen and the dashboard tile each kept their own state and
 * none of them agreed. One source feeds all four.
 *
 * That source is now the server — `GET /api/users/me/saved` and its two
 * mutations — rather than a `Set` seeded from mock products. The old version
 * forgot everything on reload and, worse, was seeded with four listings nobody
 * had actually saved, so the dashboard's saved count was fiction.
 *
 * The interface is unchanged on purpose: every consumer keeps working as-is.
 */

interface SavedContextValue {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  count: number;
  /** The full rows, for the Bookmarks screen — ids alone can't render a card. */
  saved: SavedListingCard[];
  isLoading: boolean;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const savedQuery = useSavedListings(isAuthenticated);
  const saveListing = useSaveListing();
  const unsaveListing = useUnsaveListing();

  /**
   * Optimistic overrides, keyed by listing id.
   *
   * A round trip here costs seconds, and a heart that doesn't fill until the
   * server answers reads as a broken button — you tap again, and the second tap
   * undoes the first. This records the intended state immediately and drops the
   * entry once the mutation settles and the refetched list agrees.
   */
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const serverIds = useMemo(
    () => new Set((savedQuery.data ?? []).map((s) => s.id)),
    [savedQuery.data],
  );

  const isSaved = useCallback(
    (id: string) => pending[id] ?? serverIds.has(id),
    [pending, serverIds],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const next = !isSaved(id);
      setPending((p) => ({ ...p, [id]: next }));

      const clear = () =>
        setPending((p) => {
          const { [id]: _dropped, ...rest } = p;
          return rest;
        });

      const mutation = next ? saveListing : unsaveListing;
      // `onSettled`, not `onSuccess`: a failed save must also drop the override,
      // or the heart would stay filled for something the server never stored.
      mutation.mutate(id, { onSettled: clear });
    },
    [isSaved, saveListing, unsaveListing],
  );

  const savedIds = useMemo(() => {
    const ids = new Set(serverIds);
    for (const [id, on] of Object.entries(pending)) {
      if (on) ids.add(id);
      else ids.delete(id);
    }
    return ids;
  }, [serverIds, pending]);

  const value = useMemo(
    () => ({
      savedIds,
      isSaved,
      toggleSaved,
      count: savedIds.size,
      saved: savedQuery.data ?? [],
      isLoading: savedQuery.isLoading,
    }),
    [savedIds, isSaved, toggleSaved, savedQuery.data, savedQuery.isLoading],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within a SavedProvider');
  return ctx;
}
