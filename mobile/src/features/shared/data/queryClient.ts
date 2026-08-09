import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Shared query client. Tuned for a phone on mobile data: don't hammer the
 * network on every focus, and never retry a request the server has already
 * answered definitively (4xx) — only genuine transport failures.
 *
 * `staleTime` is deliberately long. Every request here is a multi-second round
 * trip to a database on another continent, so the default 30s meant leaving a
 * screen and coming back a minute later paid that cost again for data that had
 * not changed. Five minutes makes navigation within a session feel immediate;
 * `gcTime` keeps the answers in memory well past that so returning to a screen
 * reads from cache instead of the network.
 *
 * Anything that *does* change is invalidated explicitly by its mutation, so a
 * long stale time never shows a stale write.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
