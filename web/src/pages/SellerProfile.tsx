import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  Store,
  MessageCircle,
  Package,
  Trophy,
  Star,
  MapPin,
  CalendarDays,
  Loader2,
  UserX,
  XCircle,
} from 'lucide-react'
import { useSellerProfile, useBlockedVendors, useBlockVendor, useUnblockVendor } from '../features/user/data/usersApi'
import { useMe } from '../features/auth/data/authApi'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'
import { useSeo } from '../features/shared/ui/Seo'
import { sellerSeo } from '../features/shared/libs/seo'

export function SellerProfile() {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const profileQuery = useSellerProfile(username)
  const { data: me } = useMe()

  // Vendor blocking (with a stated reason)
  const blockedQuery = useBlockedVendors()
  const blockVendor = useBlockVendor()
  const unblockVendor = useUnblockVendor()
  const blockEntry = (blockedQuery.data?.blocked ?? []).find((b) => b.username === username)
  const [blockFormOpen, setBlockFormOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [blockReasonError, setBlockReasonError] = useState('')

  const submitBlock = () => {
    if (blockReason.trim().length < 3) {
      setBlockReasonError('Give a short reason for the block')
      return
    }
    setBlockReasonError('')
    blockVendor.mutate(
      { username, reason: blockReason.trim() },
      {
        onSuccess: () => {
          setBlockFormOpen(false)
          setBlockReason('')
        },
      },
    )
  }

  // Above the early returns — hooks can't be conditional. Falls back to the
  // route default until the profile resolves.
  useSeo(sellerSeo(profileQuery.data))

  if (profileQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  const profile = profileQuery.data

  if (profileQuery.isError || !profile) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Profile Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {profileQuery.error ? apiErrorMessage(profileQuery.error) : 'This user may have been removed.'}
        </p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>
      </div>
    )
  }

  const isOwnProfile = me?.username === profile.username

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Marketplace
      </Link>

      {/* Profile header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover shrink-0" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white uppercase shrink-0">
              {profile.username.charAt(0)}
            </span>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {profile.storeName ?? `@${profile.username}`}
              </h1>
              {profile.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck size={12} /> Verified Seller
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span>@{profile.username}</span>
              {profile.country && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {profile.country}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> Joined {formatDate(profile.joinedAt)}
              </span>
            </div>
          </div>

          {!isOwnProfile && !blockEntry && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(me ? `/messages?u=${profile.username}` : '/login')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all cursor-pointer"
              >
                <MessageCircle size={16} />
                Message Seller
              </button>
              {me && (
                <button
                  onClick={() => setBlockFormOpen(true)}
                  title="Block this vendor"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                >
                  <UserX size={16} />
                  Block
                </button>
              )}
            </div>
          )}
        </div>

        {/* Blocked banner */}
        {blockEntry && (
          <div className="mt-5 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <UserX size={15} /> You've blocked this vendor
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              <span className="font-semibold">Your reason:</span> {blockEntry.reason}
            </p>
            <button
              onClick={() => unblockVendor.mutate(username)}
              disabled={unblockVendor.isPending}
              className="text-xs font-semibold text-rose-700 dark:text-rose-300 underline cursor-pointer disabled:opacity-50"
            >
              {unblockVendor.isPending ? 'Unblocking...' : `Unblock @${username}`}
            </button>
          </div>
        )}


        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 sm:max-w-lg">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <Package size={16} />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{profile.stats.activeListings}</div>
              <div className="text-[10px] font-semibold uppercase text-slate-400">Active Listings</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Trophy size={16} />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{profile.stats.salesCompleted}</div>
              <div className="text-[10px] font-semibold uppercase text-slate-400">Completed Sales</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
              <Star size={16} fill="currentColor" />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {profile.stats.rating !== null ? profile.stats.rating.toFixed(1) : '—'}
                {profile.stats.reviewCount > 0 && (
                  <span className="text-[10px] font-normal text-slate-400"> ({profile.stats.reviewCount})</span>
                )}
              </div>
              <div className="text-[10px] font-semibold uppercase text-slate-400">Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings (hidden while the vendor is blocked) */}
      {blockEntry ? null : (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Store size={18} className="text-primary-600 dark:text-primary-400" />
          Listings by {profile.storeName ?? `@${profile.username}`}
        </h2>

        {profile.listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-10 text-center">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No active listings right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {profile.listings.map((l) => (
              <Link
                key={l.id}
                to={`/marketplace/${l.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all"
              >
                <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 mb-2.5">
                  {l.image ? (
                    <img src={l.image} alt={l.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">No image</div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-white">
                    {l.category}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-xs line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {l.title}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{l.short}</p>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-white">{formatMoney(l.price)}</span>
                  {l.condition && (
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {l.condition}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Block Vendor Modal */}
      {blockFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={() => setBlockFormOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <UserX size={20} />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Block {profile.storeName ?? `@${profile.username}`}?
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Their listings will be hidden from your feed and contact disabled.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="block-reason">
                Why are you blocking this vendor?
              </label>
              <textarea
                id="block-reason"
                rows={3}
                autoFocus
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Kept pushing me to pay outside escrow..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none resize-none"
              />
              {blockReasonError && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{blockReasonError}</p>
              )}
              {blockVendor.isError && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{apiErrorMessage(blockVendor.error)}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setBlockFormOpen(false)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <XCircle size={13} /> Cancel
              </button>
              <button
                onClick={submitBlock}
                disabled={blockVendor.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <UserX size={14} /> {blockVendor.isPending ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
