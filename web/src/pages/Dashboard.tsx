import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import { useDashboard } from '../features/user/data/usersApi'
import { UserDashboard } from './UserDashboard'
import { SellerDashboard } from './SellerDashboard'

/**
 * Single /dashboard route — renders the right dashboard for the signed-in persona:
 * admin → admin console · KYC-verified seller → seller dashboard · everyone else → buyer dashboard.
 */
export function Dashboard() {
  const { data: me, isLoading: meLoading } = useMe()
  const { data: dashboard, isLoading: dashLoading } = useDashboard()

  if (meLoading || dashLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />
  if (me.role === 'admin') return <Navigate to="/admin/kyc" replace />
  if (dashboard?.persona === 'seller' || me.kycStatus === 'verified') {
    return <SellerDashboard dashboardData={dashboard} />
  }
  return <UserDashboard dashboardData={dashboard} />
}

