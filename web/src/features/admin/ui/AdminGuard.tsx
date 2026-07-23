import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useMe } from '../../auth/data/authApi'

/** Wraps admin pages: spinner while auth resolves, block for non-admins. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me || me.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Admin access required</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {me ? 'Your account does not have administrator permissions.' : 'Sign in with an administrator account to continue.'}
        </p>
        <Link
          to={me ? '/' : '/login'}
          className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all"
        >
          {me ? 'Back to Home' : 'Sign In'}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
