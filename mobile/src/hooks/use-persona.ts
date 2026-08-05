import { useAuth } from '@/context/AuthContext';

/**
 * Which face of the app the signed-in account sees.
 *
 * One place decides this, so screens can't drift apart — the phone equivalent
 * of the web's `Layout.tsx`:
 *
 *   const isAdmin  = me?.role === 'admin'
 *   const isSeller = !isAdmin && me?.kycStatus === 'verified'
 *
 * Note the two data models this bridges. The server has only **two** roles,
 * `user` and `admin`; "seller" is not a role there, it's a user whose KYC was
 * approved. The mobile mock instead carries a literal `role: 'seller'`. Both
 * are accepted below, so wiring the real API changes this file and nothing
 * else — at which point the mock's `'seller'` role can go away.
 */

export type Persona = 'buyer' | 'seller' | 'admin';

export function usePersona(): Persona {
  const { user } = useAuth();

  if (!user) return 'buyer';
  // Admin wins: an admin with verified KYC is still an admin.
  if (user.role === 'admin') return 'admin';
  if (user.role === 'seller' || user.kycStatus === 'verified') return 'seller';
  return 'buyer';
}
