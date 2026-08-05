/**
 * Auth context for the P2P mobile app.
 *
 * Mid-migration: a login attempt hits the REAL `/api/auth/login` first, and
 * only falls back to the mock accounts when the server can't authenticate it
 * (wrong credentials, or the API isn't running). That keeps the existing demo
 * logins working while the admin screens — which read live data — get a genuine
 * JWT session.
 *
 * `isRealSession` tells a screen which world it's in: admin screens require a
 * real session because there's no mock backing for them.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mockCurrentUser, mockSellerUser, mockAdminUser, type User } from '@/constants/mockData';
import { API_URL } from '@/features/shared/data/config';
import { tokenStore } from '@/features/shared/data/tokenStore';
import { api, setSessionExpiredHandler } from '@/features/shared/data/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when the session is backed by real server tokens, not a mock user. */
  isRealSession: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  /** Dev helper: switch between mock user roles */
  switchRole: (role: 'buyer' | 'seller' | 'admin') => void;
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

const roleUsers: Record<string, User> = {
  buyer: mockCurrentUser,
  seller: mockSellerUser,
  admin: mockAdminUser,
};

/**
 * Resolves the mock account from whatever was typed into the login field, so
 * all three home dashboards are reachable without a role-switch control:
 *
 *   kofi_buyer  / kofi@example.com     -> buyer
 *   kwame_tech  / kwame@example.com    -> seller
 *   admin_ama   / ama@p2p-admin.com    -> admin
 *
 * Anything else falls back to the buyer, so a random login still works.
 * Replace this whole function with the real POST /api/auth/login.
 */
function resolveMockUser(identifier: string): User {
  const id = identifier.trim().toLowerCase();
  if (!id) return mockCurrentUser;

  const accounts = [mockCurrentUser, mockSellerUser, mockAdminUser];

  // 1. Exact username or email — what a real login would match on.
  const exact = accounts.find(
    (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id,
  );
  if (exact) return exact;

  // 2. Testing conveniences, mock-only: the role word on its own ("seller",
  //    "admin"), or any fragment of a username/email. Exact matching alone
  //    meant a near-miss like "kwame" silently signed you in as the buyer,
  //    which is confusing when you're trying to view a specific persona.
  if (id === 'seller' || id === 'admin' || id === 'buyer') {
    return roleUsers[id] ?? mockCurrentUser;
  }

  const partial = accounts.find(
    (u) => u.username.toLowerCase().includes(id) || u.email.toLowerCase().startsWith(id),
  );
  return partial ?? mockCurrentUser;
}

/**
 * Try a genuine sign-in. Returns the app user on success, or null when the
 * server rejects the credentials / can't be reached — the caller then falls
 * back to the mock accounts.
 */
async function realLogin(identifier: string, password: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      tokens?: { accessToken: string; refreshToken: string };
    };
    if (!body.tokens?.accessToken || !body.tokens?.refreshToken) return null;

    await tokenStore.set(body.tokens.accessToken, body.tokens.refreshToken);
    // `me` carries kycStatus, which login's payload doesn't.
    const me = await api<ServerMe>('/api/auth/me');
    return toAppUser(me);
  } catch {
    return null; // offline / API down — mock path still works
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isRealSession: false,
  });

  // Restore a real session on cold start: the tokens outlive the process, so
  // without this the app would bounce a signed-in admin back to the login
  // screen every launch. A mock session has no tokens and is simply not
  // restored — the demo user signs in again, as before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const access = await tokenStore.getAccess();
      if (!access) return;
      try {
        const me = await api<ServerMe>('/api/auth/me');
        if (!cancelled) {
          setState({
            user: toAppUser(me),
            isAuthenticated: true,
            isLoading: false,
            isRealSession: true,
          });
        }
      } catch {
        // Expired or revoked — drop the tokens and stay signed out.
        await tokenStore.clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));

    const realUser = await realLogin(identifier, password);
    if (realUser) {
      setState({ user: realUser, isAuthenticated: true, isLoading: false, isRealSession: true });
      return;
    }

    // Fall back to the mock accounts (demo logins, offline dev).
    await tokenStore.clear();
    await new Promise((r) => setTimeout(r, 400));
    setState({
      user: resolveMockUser(identifier),
      isAuthenticated: true,
      isLoading: false,
      isRealSession: false,
    });
  }, []);

  const signup = useCallback(async (_data: { username: string; email: string; password: string }) => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 800));
    setState({
      user: mockCurrentUser,
      isAuthenticated: true,
      isLoading: false,
      isRealSession: false,
    });
  }, []);

  const logout = useCallback(() => {
    void tokenStore.clear();
    queryClient.clear(); // never show one account's data to the next
    setState({ user: null, isAuthenticated: false, isLoading: false, isRealSession: false });
  }, [queryClient]);

  const switchRole = useCallback(
    (role: 'buyer' | 'seller' | 'admin') => {
      void tokenStore.clear();
      queryClient.clear();
      setState({
        user: roleUsers[role] ?? mockCurrentUser,
        isAuthenticated: true,
        isLoading: false,
        isRealSession: false,
      });
    },
    [queryClient],
  );

  // A spent refresh token signs the user out rather than leaving screens
  // retrying against a dead session.
  useEffect(() => {
    setSessionExpiredHandler(() => logout());
    return () => setSessionExpiredHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({ ...state, login, signup, logout, switchRole }),
    [state, login, signup, logout, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
