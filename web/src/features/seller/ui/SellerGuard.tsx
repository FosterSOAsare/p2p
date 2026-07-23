import { Link, Outlet } from 'react-router-dom'
import { Loader2, Store, ArrowRight } from 'lucide-react'
import { useMe } from '../../auth/data/authApi'

/** Layout route for seller-only pages: admins and KYC-verified sellers get <Outlet/>; buyers are sent to /sell. */
export function SellerGuard() {
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  const isAllowed = me && (me.role === 'admin' || me.kycStatus === 'verified')

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
          <Store size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Sellers only</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {me
            ? 'Listing management is for verified sellers. Complete seller verification to start listing goods.'
            : 'Sign in with a verified seller account to manage listings.'}
        </p>
        <Link
          to={me ? '/sell' : '/login'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all"
        >
          {me ? 'Become a Seller' : 'Sign In'} <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return <Outlet />
}
