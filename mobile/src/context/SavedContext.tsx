import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { mockProducts } from '@/constants/mockData';

/**
 * Saved listings ("bookmarks") shared across the app.
 *
 * Without this, the heart on a marketplace card, the Save button on a listing
 * and the Bookmarks screen each kept their own state, so nothing agreed with
 * anything else. One set of ids feeds all three plus the dashboard tile.
 *
 * Seeded with a few listings so the buyer dashboard's saved count isn't zero
 * on a fresh start. Swap the seed and the toggles for
 * `useSavedListings` / `useSaveListing` / `useUnsaveListing` (web
 * `features/user/data/usersApi`) when the API client lands.
 */

interface SavedContextValue {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  count: number;
}

const SavedContext = createContext<SavedContextValue | null>(null);

/** A handful of active listings, so bookmarks isn't empty on first run. */
const SEED = mockProducts
  .filter((p) => p.status === 'active')
  .slice(0, 4)
  .map((p) => p.id);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(SEED));

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      savedIds,
      isSaved: (id: string) => savedIds.has(id),
      toggleSaved,
      count: savedIds.size,
    }),
    [savedIds, toggleSaved],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within a SavedProvider');
  return ctx;
}
