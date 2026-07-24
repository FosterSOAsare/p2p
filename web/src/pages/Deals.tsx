import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import { AdminDealsList } from './AdminDealsList'
import { Escrow } from './Escrow'

/**
 * Single `/deals` route — role decides what you see, no user-specific routing:
 *  - admin → every deal on the platform (oversight console)
 *  - buyer / seller → their own escrow deals (scoped server-side)
 * A logged-out visitor is bounced to login; the admin view's data endpoint is
 * admin-only server-side, so role is enforced in two places, not just here.
 */
export function Deals() {
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />
  if (me.role === 'admin') return <AdminDealsList />
  return <Escrow />
}
