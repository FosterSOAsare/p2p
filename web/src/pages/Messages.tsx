import { Link } from 'react-router-dom'
import { MessageCircle, Inbox } from 'lucide-react'

/**
 * Conversation list — UI shell only.
 * TODO(websocket): wire to GET /api/messages + live updates over Socket.IO.
 * One conversation per counterparty (Binance-style) — all deals with that
 * user happen alongside the single thread.
 */
export function Messages() {
  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          <MessageCircle size={14} />
          Direct Messages
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          One thread per counterparty — your chats, offers, and order updates all live in the same place.
        </p>
      </div>

      {/* Empty state (real conversations arrive with the WebSocket integration) */}
      <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          <Inbox size={22} />
        </div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">No conversations yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Message a seller from any listing or their profile page and your conversation will appear here.
        </p>
        <Link
          to="/marketplace"
          className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
        >
          Browse Marketplace
        </Link>
      </div>

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        Live messaging arrives with the realtime (WebSocket) integration.
      </p>
    </div>
  )
}
