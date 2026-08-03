import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BellOff,
  Handshake,
  Loader2,
  Package,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { SidePanel } from '../../shared/ui/SidePanel'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useUnreadNotifications,
  type AppNotification,
  type NotificationCategory,
} from '../data/notificationsApi'
import { formatRelative } from '../../shared/libs/date'
import { apiErrorMessage } from '../../shared/libs/api'

/** Category drives only the icon and accent — the copy carries the specifics. */
const CATEGORY_STYLE: Record<NotificationCategory, { icon: LucideIcon; className: string }> = {
  deal: { icon: Handshake, className: 'bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400' },
  listing: { icon: Package, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  dispute: { icon: Scale, className: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400' },
  kyc: { icon: ShieldCheck, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  wallet: { icon: Wallet, className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  system: { icon: Bell, className: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification
  onOpen: (n: AppNotification) => void
}) {
  const { icon: Icon, className } = CATEGORY_STYLE[notification.category]
  const unread = notification.readAt === null

  return (
    <button
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900 cursor-pointer ${
        unread ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${className}`}>
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start gap-2">
          <p className={`min-w-0 flex-1 text-xs ${unread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
            {notification.title}
          </p>
          {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-label="Unread" />}
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{notification.body}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {formatRelative(notification.createdAt)}
        </p>
      </div>
    </button>
  )
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const query = useNotifications()
  const unread = useUnreadNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = query.data?.pages.flatMap((p) => p.notifications) ?? []

  const onOpenRow = (n: AppNotification) => {
    if (n.readAt === null) markRead.mutate(n.id)
    if (n.link) {
      onClose()
      navigate(n.link)
    }
  }

  return (
    <SidePanel
      open={open}
      title="Notifications"
      action={
        unread > 0 ? (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-950/50 cursor-pointer"
          >
            Mark all read
          </button>
        ) : null
      }
      onClose={onClose}
    >
      {query.isLoading && (
        <div className="py-16 text-center">
          <Loader2 size={22} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {query.isError && (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          {apiErrorMessage(query.error)}
        </div>
      )}

      {query.isSuccess && notifications.length === 0 && (
        <div className="space-y-2 px-6 py-16 text-center">
          <BellOff size={26} className="mx-auto text-slate-400" />
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">You're all caught up</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Updates about your deals, listings and disputes will show up here.
          </p>
        </div>
      )}

      {notifications.map((n) => (
        <NotificationRow key={n.id} notification={n} onOpen={onOpenRow} />
      ))}

      {query.hasNextPage && (
        <div className="p-4">
          <button
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 cursor-pointer"
          >
            {query.isFetchingNextPage && <Loader2 size={13} className="animate-spin" />}
            Load older
          </button>
        </div>
      )}
    </SidePanel>
  )
}
