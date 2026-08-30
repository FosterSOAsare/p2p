import { AppState } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { ApiError } from './api';

/*
  Tell React Query when the app is in front.

  `refetchOnWindowFocus` is on by default and does nothing at all on React
  Native: there is no window, so without this the event never fires. Combined
  with the long `staleTime` below, that meant backgrounding the app and coming
  back showed whatever was last fetched, with a pull-to-refresh as the only way
  forward — which is the complaint this addresses.

  Registered at module scope, next to the client it configures, so it is
  impossible to import one without the other.

  It stays gated by `staleTime`, so this is not a refetch on every app switch:
  glancing at another app and coming straight back re-reads nothing. The
  reconnect handler in `useLiveBadges` covers the case this cannot — a change
  made by somebody else while we were away, which may be newer than our cache
  yet still inside the stale window.
*/
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

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
 * Anything *you* change is invalidated explicitly by its mutation, so a long
 * stale time never shows back your own stale write.
 *
 * What it cannot cover is a change somebody else made — an admin completing
 * your payout, a counterparty accepting your deal. Those arrive over the socket
 * (`useLiveBadges`), and the focus listener above plus the reconnect handler
 * there are what catch the ones that landed while this client wasn't listening.
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
