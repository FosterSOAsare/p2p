import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileText,
  LockKeyhole,
} from 'lucide-react'
import { initialDeals, type EscrowDeal } from '../features/escrow/data/deals'
import { Badge } from '../features/shared/ui/Badge'

export function EscrowDetail() {
  const { id } = useParams()
  const foundDeal = initialDeals.find((d) => d.id === id) || initialDeals[0]

  const [deal, setDeal] = useState<EscrowDeal>(foundDeal)
  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const msg = {
      id: `m-${Date.now()}`,
      sender: 'current_user',
      timestamp: 'Just now',
      message: newMessage.trim(),
    }
    setDeal((prev) => ({
      ...prev,
      chat: [...prev.chat, msg],
    }))
    setNewMessage('')
  }

  const handleReleaseFunds = () => {
    setDeal((prev) => ({
      ...prev,
      status: 'released',
    }))
  }

  const handleOpenDispute = () => {
    setDeal((prev) => ({
      ...prev,
      status: 'disputed',
    }))
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <Link
        to="/escrow"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Escrow Deals
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge
              tone={
                deal.status === 'released'
                  ? 'success'
                  : deal.status === 'funded'
                  ? 'info'
                  : deal.status === 'disputed'
                  ? 'danger'
                  : 'warning'
              }
            >
              {deal.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-xs text-slate-500 font-semibold">{deal.id}</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <LockKeyhole size={12} /> Manual Confirmation Protocol
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
            {deal.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Created on {deal.createdAt} • Off-Platform Contract
          </p>
        </div>

        <div className="text-left md:text-right bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block font-medium">Locked Escrow Amount</span>
          <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            ${deal.amount.toLocaleString()} <span className="text-xs text-slate-400">{deal.currency}</span>
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12">
        {/* Left Column: Contract Terms & Evidence Chat */}
        <div className="lg:col-span-7 space-y-6">
          {/* Contract Overview Box */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              Contract Terms & Deliverables
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {deal.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-medium mb-0.5">Creator Account</span>
                <span className="font-bold text-slate-900 dark:text-white">@{deal.creatorUsername}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-medium mb-0.5">Counterparty Account</span>
                <span className="font-bold text-slate-900 dark:text-white">@{deal.counterpartyUsername}</span>
              </div>
            </div>
          </div>

          {/* Built-in Counterparty Chat Thread */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-primary-600 dark:text-primary-400 shrink-0" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Contract Evidence Chat</h3>
              </div>
              <Link
                to={`/escrow/${deal.id}/messages`}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                Open Full Screen Chat →
              </Link>
            </div>

            {/* Chat Box Messages List */}
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {deal.chat.length > 0 ? (
                deal.chat.map((msg) => {
                  const isMine = msg.sender === 'current_user' || msg.sender === deal.creatorUsername
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">@{msg.sender}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl max-w-[90%] leading-relaxed ${
                          isMine
                            ? 'bg-primary-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  No messages yet. Send a message to coordinate deliverables with @{deal.counterpartyUsername}.
                </div>
              )}
            </div>

            {/* Send Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message or delivery update..."
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all cursor-pointer shrink-0"
              >
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Escrow Actions & Audit Timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action Box */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Escrow Contract Actions</h3>

            {deal.status === 'funded' && (
              <div className="space-y-3">
                <button
                  onClick={handleReleaseFunds}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={18} /> Manual Release Funds (${deal.amount})
                </button>

                <button
                  onClick={handleOpenDispute}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 py-3 px-4 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <AlertTriangle size={15} /> Open Dispute / Request Moderation
                </button>
              </div>
            )}

            {deal.status === 'released' && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 sm:p-4 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                Funds have been successfully released to counterparty account!
              </div>
            )}

            {deal.status === 'disputed' && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3.5 sm:p-4 border border-rose-200 dark:border-rose-800 space-y-2 text-xs text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle size={16} /> Dispute Active — Senior Admin Review
                </div>
                <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                  Senior moderators are reviewing contract terms, ledger entries, and evidence chat logs.
                </p>
              </div>
            )}

            {/* Escrow Guarantee Policy */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Lock size={15} className="text-emerald-600 dark:text-emerald-400" /> Manual Release Protocol
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Funds remain locked in escrow until you explicitly click "Manual Release Funds". Neither party can unilaterally withdraw funds.
              </p>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Audit Status Timeline</h3>
            <div className="space-y-4 border-l-2 border-slate-200 dark:border-slate-800 pl-4 text-xs relative">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Contract Created</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Initiated by @{deal.creatorUsername}</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Terms Accepted & Funded</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Locked ${deal.amount} in {deal.currency}</p>
              </div>

              {deal.status === 'released' && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">Funds Released</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Manual buyer release confirmed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
