import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import { UserDashboard } from './UserDashboard'
import { SellerDashboard } from './SellerDashboard'

/**
 * Single /dashboard route — renders the right dashboard for the signed-in persona:
 * admin → admin console · KYC-verified seller → seller dashboard · everyone else → buyer dashboard.
 */
export function Dashboard() {
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />
  if (me.role === 'admin') return <Navigate to="/admin/kyc" replace />
  if (me.kycStatus === 'verified') return <SellerDashboard />
  return <UserDashboard />
}
