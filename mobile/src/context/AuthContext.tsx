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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = useCallback(async (_email: string, _password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    setState({
      user: mockCurrentUser,
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
