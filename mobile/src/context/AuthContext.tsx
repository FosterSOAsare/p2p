/**
 * Auth context for the P2P mobile app.
 *
 * Sessions are real: `login` goes to `/api/auth/login`, stores the token pair
 * in the device keychain, and reads the account back from `/api/auth/me`. A
 * rejected login throws so the screen can say why.
 *
 * There used to be a mock fallback here — a failed sign-in quietly became a
 * fake `mockCurrentUser` session. It made every authenticated request 401 while
 * the app looked signed in, which reads as broken screens rather than a bad
 * password. Screens still on mock data don't need a session at all, so nothing
 * depended on it.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@/constants/mockData';
import { tokenStore } from '@/features/shared/data/tokenStore';
import { api, setSessionExpiredHandler } from '@/features/shared/data/api';
import { dashboardKeys, type DashboardResponse } from '@/features/dashboard/data/dashboardApi';
import { runTeardown } from '@/features/shared/data/teardown';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Kept for screens that gate on a server-backed session (AdminDashboard).
   * Every session is server-backed now, so this tracks `isAuthenticated`.
   */
  isRealSession: boolean;
}

interface AuthContextValue extends AuthState {
  /** Throws on failure — the screen renders the message. */
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

/** Shape of `/api/auth/me` — the fields the app actually consumes. */
interface ServerMe {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'user' | 'admin';
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

/**
 * The server tracks `user | admin`; the app's screens branch on
 * `buyer | seller | admin`. A verified KYC profile is what makes someone a
 * seller — the same rule the web uses.
 *
 * Note this is why signing in takes two calls: `/api/auth/login` returns the
 * user but not `kycStatus`, and `kycStatus` is what decides the persona.
 */
function toAppUser(me: ServerMe): User {
  return {
    id: me.id,
    username: me.username,
    fullName: me.fullName,
    email: me.email,
    phone: me.phone ?? undefined,
    avatarUrl: me.avatarUrl ?? undefined,
    role: me.role === 'admin' ? 'admin' : me.kycStatus === 'verified' ? 'seller' : 'buyer',
    kycStatus: me.kycStatus,
    createdAt: me.createdAt,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isRealSession: false,
  });

  /**
   * The app always starts signed out. Credentials are required every launch.
   *
   * This used to restore a session from the keychain on cold start, which is
   * the usual convenience — but it meant the login screen appeared and then
   * signed itself in a few seconds later, with nobody typing anything. That
   * behaviour is not wanted here, so any leftover tokens are dropped on
   * startup rather than used: no token can outlive the process.
   *
   * Tokens are still written during a session — `api()` needs them to
   * authenticate requests and to refresh on a 401 — they simply don't survive a
   * restart.
   */
  useEffect(() => {
    void tokenStore.clear();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { tokens } = await api<{ tokens: { accessToken: string; refreshToken: string } }>(
        '/api/auth/login',
        { method: 'POST', body: { identifier, password } },
      );
      await tokenStore.set(tokens.accessToken, tokens.refreshToken);

      /**
       * Warm every tab NOW, in parallel with `/me`, rather than letting each
       * screen start its own fetch when you first tap it.
       *
       * A single DB-backed request against this database costs 1–4.5 seconds
       * measured *on the server*, before the phone's network is involved at all.
       * Fetched lazily that is a multi-second stall the first time you open each
       * tab, which is exactly what "the tabs take time to show up" is. Started
       * here they overlap with each other and with the rest of sign-in, so by the
       * time a tab is tapped its data is usually already in cache and the screen
       * paints immediately.
       *
       * Deliberately NOT awaited: sign-in must not block on any of them, and a
       * failure is harmless — each screen's own query retries it. They are also
       * fired together rather than in sequence, since the cost here is latency,
       * not bandwidth.
       */
      void queryClient.prefetchQuery({
        queryKey: dashboardKeys.data,
        queryFn: () => api<DashboardResponse>('/api/users/me/dashboard'),
      });
      // My Deals
      void queryClient.prefetchQuery({
        queryKey: ['deals', 'list', 'all'],
        queryFn: () => api('/api/escrows?limit=48'),
      });
      // My Listings
      void queryClient.prefetchQuery({
        queryKey: ['listings', 'mine'],
        queryFn: () => api('/api/listings/mine?limit=48'),
      });
      // Marketplace — the unfiltered first page, which is what it opens on.
      void queryClient.prefetchQuery({
        queryKey: ['listings', 'browse', '', ''],
        queryFn: () => api('/api/listings?limit=48'),
      });

      // Second call on purpose: `me` carries kycStatus, which decides persona.
      const me = await api<ServerMe>('/api/auth/me');
      setState({
        user: toAppUser(me),
        isAuthenticated: true,
        isLoading: false,
        isRealSession: true,
      });
    } catch (err) {
      // Leave no half-session behind before handing the error to the screen.
      await tokenStore.clear();
      setState({ user: null, isAuthenticated: false, isLoading: false, isRealSession: false });
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    queryClient.clear(); // never show one account's data to the next
    // Closes the chat socket if one was ever opened. It authenticates once at
    // handshake and stays open, so clearing the tokens isn't enough — left
    // connected it would keep delivering the previous account's messages to
    // whoever signs in next.
    runTeardown();
    setState({ user: null, isAuthenticated: false, isLoading: false, isRealSession: false });
    void tokenStore.clear();
  }, [queryClient]);

  // A spent refresh token signs the user out rather than leaving screens
  // retrying against a dead session.
  useEffect(() => {
    setSessionExpiredHandler(() => logout());
    return () => setSessionExpiredHandler(null);
  }, [logout]);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
