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
  const match = [mockCurrentUser, mockSellerUser, mockAdminUser].find(
    (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id,
  );
  return match ?? mockCurrentUser;
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
