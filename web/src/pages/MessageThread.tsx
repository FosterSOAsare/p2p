import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, SendHorizonal, ShieldCheck, Lock, Paperclip, Loader2 } from 'lucide-react'
import { useSellerProfile } from '../features/user/data/usersApi'
import { useUploadSingleFile } from '../features/upload/data/uploadApi'

interface LocalMessage {
  id: number
  body: string
  mine: boolean
  at: string
}

export function MessageThread() {
  const { username = '' } = useParams()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const backTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : `/seller/${username}`

  const profileQuery = useSellerProfile(username)
  const counterparty = profileQuery.data
  const uploadSingle = useUploadSingleFile()

  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    uploadSingle.mutate(file, {
      onSuccess: (uploaded) => {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            body: `📷 Attached Evidence / Proof File:\n${uploaded.url}`,
            mine: true,
            at: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          },
        ])
      },
    })
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, body, mine: true, at: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) },
    ])
    setDraft('')
  }

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-6 space-y-4">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col" style={{ height: '65vh' }}>
        {/* Thread header */}
        <Link
          to={`/seller/${username}`}
          className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          {counterparty?.avatarUrl ? (
            <img src={counterparty.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-xs font-bold text-white uppercase">
              {username.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {counterparty?.storeName ?? `@${username}`}
              </span>
              {counterparty?.verified && <ShieldCheck size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-400">@{username} · view profile</p>
          </div>
        </Link>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="mx-auto max-w-sm rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
            <Lock size={11} className="inline mr-1 -mt-0.5" />
            Messages are immutably logged and become dispute evidence for any deal between you two.
          </div>

          {messages.length === 0 && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-8">
              Say hello — ask about a listing or coordinate a delivery.
            </p>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm shadow-sm ${
                  m.mine
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-line">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${m.mine ? 'text-primary-100' : 'text-slate-400'}`}>{m.at}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
          {/* Cloudinary File Attachment Button */}
          <label className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0" title="Attach Photo or Document Proof">
            {uploadSingle.isPending ? (
              <Loader2 size={16} className="animate-spin text-primary-600" />
            ) : (
              <Paperclip size={16} />
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={uploadSingle.isPending}
              onChange={handleChatFileUpload}
            />
          </label>

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message @${username}...`}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-40 shrink-0"
            aria-label="Send message"
          >
            <SendHorizonal size={16} />
          </button>
        </form>
      </div>

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        UI preview — messages are local until the realtime (WebSocket) integration lands.
      </p>
    </div>
  )
}
