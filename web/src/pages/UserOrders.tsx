import { ShoppingBag, Store } from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import { DealsListView } from '../features/escrow/ui/DealsListView'

/**
 * Role-aware orders page. Sellers (KYC-verified) see "My Sales" (deals where
 * they're the seller); everyone else sees "My Orders" (their purchases).
 */
export function UserOrders() {
  const { data: me } = useMe()
  const isSeller = me?.role !== 'admin' && me?.kycStatus === 'verified'

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          {isSeller ? <Store size={14} /> : <ShoppingBag size={14} />}
          {isSeller ? 'Seller Console' : 'Buyer Portal'}
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isSeller ? 'My Sales' : 'My Orders'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {isSeller
            ? 'Orders buyers have placed with you. Mark items delivered to release your payout.'
            : 'Items you have purchased. Confirm receipt to release escrow to the seller.'}
        </p>
      </div>

      <DealsListView
        role={isSeller ? 'seller' : 'buyer'}
        emptyLabel={isSeller ? 'No sales yet.' : 'No orders yet — browse the marketplace to get started.'}
      />
    </div>
  )
}
