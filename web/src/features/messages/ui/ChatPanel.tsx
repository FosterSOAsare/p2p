import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  SendHorizonal,
  ShieldCheck,
  Lock,
  Paperclip,
  Loader2,
  Check,
  CheckCheck,
  FileText,
  WifiOff,
  ArrowRight,
} from 'lucide-react'
import { useUploadSingleFile } from '../../upload/data/uploadApi'
import { useChat, type ChatMessage } from '../data/useChat'
import { formatTime } from '../../shared/libs/date'

/**
 * One open conversation. Fills whatever container it's given — the Messages
 * page mounts it as the right-hand pane. `onBack` is only rendered on mobile,
 * where the list and the thread share the screen one at a time.
 */
export function ChatPanel({ username, onBack }: { username: string; onBack?: () => void }) {
  const chat = useChat(username)
  // The conversation:open ack carries everything the header needs, so there's
  // no profile fetch here — which also keeps this off /seller/:username, now
  // that the endpoint is sellers-only.
  const counterparty = chat.counterparty
  const isSeller = counterparty?.verified ?? false
  const uploadSingle = useUploadSingleFile()

  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll the message list itself, not via scrollIntoView on a sentinel —
  // that walks up and scrolls every ancestor container including the window,
  // which dragged the whole page down on each incoming message.
  useEffect(() => {
    const el = scrollRef.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chat.messages.length, chat.counterpartyTyping])

  // Anything that arrived while the tab was hidden is read once we come back.
  // Depends on the stable callback, not the hook result — `chat` is a fresh
  // object every render and would re-bind the listener each time.
  const { markRead } = chat
  useEffect(() => {
    const onFocus = () => markRead()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [markRead])

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // let the same file be picked again after a failure

    // Bytes go over HTTP to Cloudinary; only the resulting URL + metadata
    // travel over the socket.
    uploadSingle.mutate(file, {
      onSuccess: (uploaded) => {
        chat.sendFile({
          url: uploaded.url,
          name: uploaded.originalName,
          mime: file.type || 'application/octet-stream',
          size: uploaded.size,
        })
      },
    })
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    chat.sendText(draft)
    setDraft('')
  }

  const identity = (
    <>
      {counterparty?.avatarUrl ? (
        <img src={counterparty.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-xs font-bold text-white uppercase">
          {username.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`truncate text-sm font-bold text-slate-900 dark:text-white ${
              isSeller ? 'transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400' : ''
            }`}
          >
            {counterparty?.storeName ?? `@${username}`}
          </span>
          {isSeller && <ShieldCheck size={14} className="shrink-0 text-primary-600 dark:text-primary-400" />}
        </div>
        <p className="truncate text-[11px] text-slate-400">
          {chat.counterpartyTyping ? 'typing…' : isSeller ? `@${username} · view store` : `@${username}`}
        </p>
      </div>
    </>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {/* Only sellers have a storefront to link to — /seller/:username 404s
            for a plain buyer, so render their identity as static text. */}
        {isSeller ? (
          <Link to={`/seller/${username}`} className="group flex min-w-0 flex-1 items-center gap-3">
            {identity}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
        )}
      </div>

      {!chat.connected && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-4 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          <WifiOff size={12} />
          Reconnecting…
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40"
      >
        <div className="mx-auto max-w-sm rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <Lock size={11} className="inline mr-1 -mt-0.5" />
          Messages are immutably logged and become dispute evidence for any deal between you two.
        </div>

        {chat.error && (
          <p className="text-center text-xs font-medium text-rose-600 dark:text-rose-400 pt-4">{chat.error}</p>
        )}

        {chat.loading && !chat.error && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-8">
            <Loader2 size={13} className="animate-spin" />
            Loading conversation…
          </p>
        )}

        {!chat.loading && !chat.error && chat.messages.length === 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-8">
            Say hello — ask about a listing or coordinate a delivery.
          </p>
        )}

        {chat.messages.map((m) => (
          <MessageRow key={m.id} message={m} mine={m.senderId === chat.meId} />
        ))}

        {chat.counterpartyTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5">
              <span className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
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
          onChange={(e) => {
            setDraft(e.target.value)
            chat.notifyTyping()
          }}
          placeholder={`Message @${username}...`}
          className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !chat.connected}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-40 shrink-0"
          aria-label="Send message"
        >
          <SendHorizonal size={16} />
        </button>
      </form>
    </div>
  )
}

/** One message — a system chip, a file card, or a chat bubble. */
function MessageRow({ message, mine }: { message: ChatMessage; mine: boolean }) {
  // Deal lifecycle notice: centered, and a link into the deal it refers to.
  if (message.type === 'system') {
    const chipClass =
      'inline-block max-w-sm rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-center text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 whitespace-pre-line'

    return (
      <div className="py-1 text-center">
        {message.escrowId ? (
          <Link
            to={`/escrow/${message.escrowId}`}
            className={`${chipClass} cursor-pointer transition-colors hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-800 dark:hover:bg-primary-950/40`}
          >
            {message.body}
            <span className="mt-1 flex items-center justify-center gap-1 font-semibold text-primary-600 dark:text-primary-400">
              View deal
              <ArrowRight size={11} />
            </span>
          </Link>
        ) : (
          <span className={chipClass}>{message.body}</span>
        )}
        <p className="mt-1 text-[10px] text-slate-400">{formatTime(message.createdAt)}</p>
      </div>
    )
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm shadow-sm ${
          mine
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
        }`}
      >
        {message.attachment && <AttachmentBlock attachment={message.attachment} mine={mine} />}
        {message.body && <p className="leading-relaxed whitespace-pre-line">{message.body}</p>}

        <p className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? 'text-primary-100' : 'text-slate-400'}`}>
          {formatTime(message.createdAt)}
          {/* Read ticks only on your own messages — theirs are read by definition. */}
          {mine && (message.readAt ? <CheckCheck size={12} /> : <Check size={12} />)}
        </p>
      </div>
    </div>
  )
}

function AttachmentBlock({ attachment, mine }: { attachment: NonNullable<ChatMessage['attachment']>; mine: boolean }) {
  if (attachment.mime.startsWith('image/')) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="block mb-1">
        <img src={attachment.url} alt={attachment.name} className="max-h-56 rounded-xl object-cover" />
      </a>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={`mb-1 flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
        mine ? 'bg-primary-700/60 hover:bg-primary-700' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      <FileText size={18} className="shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{attachment.name}</span>
        <span className={`block text-[10px] ${mine ? 'text-primary-100' : 'text-slate-400'}`}>
          {(attachment.size / 1024).toFixed(0)} KB
        </span>
      </span>
    </a>
  )
}
