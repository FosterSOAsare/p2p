import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Shared query client. Tuned for a phone on mobile data: don't hammer the
 * network on every focus, and never retry a request the server has already
 * answered definitively (4xx) — only genuine transport failures.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
