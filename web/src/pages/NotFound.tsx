import { Link } from 'react-router-dom'
import { Compass, Home, Store } from 'lucide-react'

export function NotFound() {
  return (
    <div className="py-20 sm:py-28 flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
        <Compass size={30} />
      </div>
      <p className="font-display text-6xl font-bold tracking-tight text-slate-900 dark:text-white mt-6">404</p>
      <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">
        This page doesn't exist
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
        The link may be broken or the page may have moved. Let's get you back on track.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-700 transition-all"
        >
          <Home size={15} /> Go Home
        </Link>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          <Store size={15} /> Browse Marketplace
        </Link>
      </div>
    </div>
  )
}
