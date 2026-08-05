/**
 * Auth context for the P2P mobile app.
 * Frontend-only: uses mock data and in-memory state.
 * Swap in real API + secure storage when backend is ready.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { mockCurrentUser, mockSellerUser, mockAdminUser, type User } from '@/constants/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  /** Dev helper: switch between mock user roles */
  switchRole: (role: 'buyer' | 'seller' | 'admin') => void;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = useCallback(async (identifier: string, _password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    setState({
      user: resolveMockUser(identifier),
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const signup = useCallback(async (_data: { username: string; email: string; password: string }) => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 800));
    setState({
      user: mockCurrentUser,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const switchRole = useCallback((role: 'buyer' | 'seller' | 'admin') => {
    setState({
      user: roleUsers[role] ?? mockCurrentUser,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

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
