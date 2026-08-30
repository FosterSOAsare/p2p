import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
   * A round trip here costs the best part of a second, and a heart that doesn't
   * fill until the server answers reads as a broken button — you tap again, and
   * the second tap undoes the first. This records the intended state
   * immediately.
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

  const drop = useCallback((id: string) => {
    setPending((p) => {
      if (!(id in p)) return p;
      const { [id]: _dropped, ...rest } = p;
      return rest;
    });
  }, []);

  /**
   * Retire each override only once the refetched list actually agrees with it.
   *
   * It used to be dropped in `onSettled`, which fires the moment the mutation
   * returns — but the refetch it triggers is a *second* round trip, and until
   * that lands `serverIds` still holds the old answer. So the heart filled on
   * tap, emptied again when the mutation returned, and re-filled a second later
   * when the list arrived. Waiting for agreement removes the bounce; a failure
   * is handled below, where the override is dropped at once.
   */
  useEffect(() => {
    for (const [id, want] of Object.entries(pending)) {
      if (serverIds.has(id) === want) drop(id);
    }
  }, [serverIds, pending, drop]);

  const toggleSaved = useCallback(
    (id: string) => {
      const next = !isSaved(id);
      setPending((p) => ({ ...p, [id]: next }));

      const mutation = next ? saveListing : unsaveListing;
      mutation.mutate(id, {
        // Only on failure. Success is retired by the effect above, once the
        // server's own list confirms it.
        onError: () => drop(id),
      });
    },
    [isSaved, saveListing, unsaveListing, drop],
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
