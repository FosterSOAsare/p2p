import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  Search,
  Loader2,
  Users as UsersIcon,
  X,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  Wallet,
  ShoppingBag,
  Store,
} from 'lucide-react'
import {
  useAdminUsers,
  useAdminUser,
  useSetUserStatus,
  type AdminUserRow,
} from '../features/admin/data/adminUsersApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { useMe } from '../features/auth/data/authApi'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { useDebouncedValue } from '../features/shared/libs/useDebouncedValue'

type StatusTab = 'all' | 'active' | 'suspended'

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All Users' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
]

function KycBadge({ status }: { status: AdminUserRow['kycStatus'] }) {
  const map: Record<AdminUserRow['kycStatus'], string> = {
    verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    unverified: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${map[status]}`}>
      KYC: {status}
    </span>
  )
}

export function AdminUsersList() {
  const { data: me } = useMe()

  // Filters, role, search and page all live in the URL query.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusTab = (searchParams.get('status') as StatusTab | null) ?? 'all'
  const role = (searchParams.get('role') as 'all' | 'user' | 'admin' | null) ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchQ = searchParams.get('search') ?? ''

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(searchQ)
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400)

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page') // any filter change resets to page 1
    setSearchParams(next)
  }

  // Push the debounced search box into the URL (which drives the query).
  useEffect(() => {
    if (debouncedSearch !== searchQ) setParams({ search: debouncedSearch || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (searchQ) params.set('search', searchQ)
    if (statusTab !== 'all') params.set('status', statusTab)
    if (role !== 'all') params.set('role', role)
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [searchQ, statusTab, role, page])

  const usersQuery = useAdminUsers(query)
  const detailQuery = useAdminUser(selectedId)
  const setStatus = useSetUserStatus()
  const [actionError, setActionError] = useState<string | null>(null)

  const toggleStatus = (user: { id: string; status: 'active' | 'suspended' }) => {
    setActionError(null)
    setStatus.mutate(
      { id: user.id, status: user.status === 'active' ? 'suspended' : 'active' },
      { onError: (err) => setActionError(apiErrorMessage(err)) },
    )
  }

  const data = usersQuery.data

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              <ShieldCheck size={14} />
              Admin Console
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              User Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Search accounts, review activity, and suspend or reinstate users. Suspended users can't log in.
            </p>
          </div>
          <AdminSectionNav />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setParams({ status: tab.id === 'all' ? null : tab.id })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === tab.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <select
            value={role}
            onChange={(e) => setParams({ role: e.target.value === 'all' ? null : e.target.value })}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search username, email, name…"
            className="w-64 max-w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {actionError}
        </div>
      )}

      {/* List */}
      {usersQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : usersQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(usersQuery.error)}
        </div>
      ) : (data?.users ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
          <UsersIcon size={36} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No users found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">No accounts match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.users.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-wrap items-center gap-4 justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white uppercase">
                    {u.username.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate">@{u.username}</span>
                    {u.role === 'admin' && (
                      <span className="rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-[10px] font-bold border border-primary-200 dark:border-primary-800">
                        ADMIN
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {u.status === 'active' ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                      {u.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {u.fullName} · {u.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <KycBadge status={u.kycStatus} />
                    <span className="text-[10px] text-slate-400">Joined {formatDate(u.joinedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedId(u.id)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  View
                </button>
                {me?.id !== u.id && (
                  <button
                    onClick={() => toggleStatus(u)}
                    disabled={setStatus.isPending}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-50 ${
                      u.status === 'active'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {u.status === 'active' ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                    {u.status === 'active' ? 'Suspend' : 'Reinstate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setParams({ page: page - 1 <= 1 ? null : String(page - 1) })}
            disabled={page <= 1}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {data.page} of {data.pages} · {data.total} users
          </span>
          <button
            onClick={() => setParams({ page: String(Math.min(data.pages, page + 1)) })}
            disabled={page >= data.pages}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">User Detail</h2>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            {detailQuery.isLoading ? (
              <div className="py-10 text-center">
                <Loader2 size={22} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
              </div>
            ) : detailQuery.data ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {detailQuery.data.avatarUrl ? (
                    <img src={detailQuery.data.avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white uppercase">
                      {detailQuery.data.username.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">@{detailQuery.data.username}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{detailQuery.data.fullName}</p>
                    <div className="mt-1">
                      <KycBadge status={detailQuery.data.kycStatus} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail size={14} className="text-slate-400" /> {detailQuery.data.email}
                    {detailQuery.data.emailVerified && <CheckCircle2 size={13} className="text-emerald-500" />}
                  </div>
                  {detailQuery.data.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Phone size={14} className="text-slate-400" /> {detailQuery.data.phone}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <ShoppingBag size={16} className="mx-auto text-primary-500" />
                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">{detailQuery.data.dealsAsBuyer}</p>
                    <p className="text-[10px] text-slate-400">Bought</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <Store size={16} className="mx-auto text-primary-500" />
                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">{detailQuery.data.dealsAsSeller}</p>
                    <p className="text-[10px] text-slate-400">Sold</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                    <Wallet size={16} className="mx-auto text-primary-500" />
                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">{detailQuery.data.listingsCount}</p>
                    <p className="text-[10px] text-slate-400">Listings</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wallet balances</span>
                  {detailQuery.data.wallets.length === 0 ? (
                    <p className="text-xs text-slate-500">No wallet</p>
                  ) : (
                    detailQuery.data.wallets.map((w) => (
                      <p key={w.currency} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatMoney(w.balance, w.currency)}
                      </p>
                    ))
                  )}
                </div>

                {me?.id !== detailQuery.data.id && (
                  <button
                    onClick={() => toggleStatus(detailQuery.data!)}
                    disabled={setStatus.isPending}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white cursor-pointer disabled:opacity-50 ${
                      detailQuery.data.status === 'active'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {setStatus.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : detailQuery.data.status === 'active' ? (
                      <Ban size={15} />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    {detailQuery.data.status === 'active' ? 'Suspend Account' : 'Reinstate Account'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
