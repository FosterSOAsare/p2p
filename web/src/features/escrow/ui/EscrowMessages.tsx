import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MessageCircle,
  Send,
  Paperclip,
  ShieldCheck,
  ArrowLeft,
  User,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react'
import { initialDeals, type EscrowDeal, type EscrowChatMessage } from '../data/deals'
import { Badge } from '../../shared/ui/Badge'

export function EscrowMessages() {
  const { id } = useParams()
  const foundDeal = initialDeals.find((d) => d.id === id) || initialDeals[0]

  const [deal, setDeal] = useState<EscrowDeal>(foundDeal)
  const [inputText, setInputText] = useState('')
  const [attachment, setAttachment] = useState<string | null>(null)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() && !attachment) return

    const newMsg: EscrowChatMessage = {
      id: `msg-${Date.now()}`,
      sender: deal.creatorUsername,
      timestamp: 'Just now',
      message: attachment ? `${inputText} [Attachment: ${attachment}]` : inputText.trim(),
    }

    setDeal((prev) => ({
      ...prev,
      chat: [...prev.chat, newMsg],
    }))
    setInputText('')
    setAttachment(null)
  }

  const handleSimulateAttachment = () => {
    setAttachment('deliverable_final_v2.pdf')
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Link
          to={`/escrow/${deal.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Deal Details ({deal.id})
        </Link>
        <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 self-start sm:self-auto">
          <LockKeyhole size={12} /> Manual Confirmation Log
        </span>
      </div>

      {/* Main Chat Workspace Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{deal.title}</h1>
            <Badge tone={deal.status === 'released' ? 'success' : 'info'}>
              {deal.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escrow Contract: <strong className="text-slate-800 dark:text-slate-200">{deal.id}</strong> • Counterparty:{' '}
            <strong className="text-slate-800 dark:text-slate-200">@{deal.counterpartyUsername}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <span className="text-slate-400 block font-medium">Locked Value</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              ${deal.amount.toLocaleString()} {deal.currency}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <Link
            to={`/escrow/${deal.id}`}
            className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            Deal Details →
          </Link>
        </div>
      </div>

      {/* Chat Messages Workspace */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
        {/* Left Side: Context & Evidence Info */}
        <div className="lg:col-span-4 p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              Evidence Protection Policy
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              All messages, files, and timestamps exchanged in this channel are immutably logged and auto-attached as primary evidence if a dispute is opened.
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Participants</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <User size={14} className="text-primary-600 dark:text-primary-400" /> @{deal.creatorUsername}
                </span>
                <span className="text-[10px] bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded font-medium">Creator</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <User size={14} className="text-emerald-600 dark:text-emerald-400" /> @{deal.counterpartyUsername}
                </span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-medium">Counterparty</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" /> Manual Release Active
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              Funds remain held in escrow until manual release confirmation is performed on the deal detail page.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Chat Box */}
        <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col justify-between space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageCircle size={16} className="text-primary-600 dark:text-primary-400" />
              Contract Direct Messaging Channel
            </span>
            <span className="text-slate-400 font-medium">{deal.chat.length} messages logged</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-3.5 p-3.5 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[260px] max-h-[380px]">
            {deal.chat.length > 0 ? (
              deal.chat.map((msg) => {
                const isMine = msg.sender === deal.creatorUsername || msg.sender === 'current_user'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">@{msg.sender}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`p-3 sm:p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed shadow-sm ${
                        isMine
                          ? 'bg-primary-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic space-y-2">
                <MessageCircle size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p>No messages exchanged yet. Send a message to start communicating with @{deal.counterpartyUsername}.</p>
              </div>
            )}
          </div>

          {/* Attachment Indicator */}
          {attachment && (
            <div className="flex items-center justify-between rounded-xl bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 px-3.5 py-2 text-xs font-semibold text-sky-800 dark:text-sky-300 animate-fade-in">
              <span className="flex items-center gap-1.5">
                <Paperclip size={14} /> Attached File: {attachment}
              </span>
              <button onClick={() => setAttachment(null)} className="text-sky-600 dark:text-sky-400 hover:text-sky-800 cursor-pointer">
                ✕ Remove
              </button>
            </div>
          )}

          {/* Send Input Bar */}
          <form onSubmit={handleSend} className="flex gap-2">
            <button
              type="button"
              onClick={handleSimulateAttachment}
              title="Attach deliverable file or receipt"
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Send message to @${deal.counterpartyUsername}...`}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all shrink-0 cursor-pointer"
            >
              <Send size={16} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
