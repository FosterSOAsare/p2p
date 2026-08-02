import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react'
import { useConversations, type ConversationSummary } from '../features/messages/data/messagesApi'
import { ChatPanel } from '../features/messages/ui/ChatPanel'
import { formatTime } from '../features/shared/libs/date'

/**
 * The inbox: conversation list on the left, the open thread on the right.
 *
 * The open thread is chosen by `?u=<username>` — the single entry point, used
 * by the list itself and by every "Message" button (seller profile, listing,
 * deal). On mobile the two panes share the screen: list until you pick someone.
 */
export function Messages() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const active = searchParams.get('u') ?? ''

  const conversationsQuery = useConversations()
  const conversations = conversationsQuery.data ?? []

  // Fills the height Layout hands it — the page itself never scrolls.
  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm md:grid-cols-[19rem_1fr]">
      {/* ---- Conversation list ---- */}
      <aside
        className={`flex min-h-0 flex-col border-slate-100 dark:border-slate-800 md:border-r ${
          active ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversations</span>
          {conversations.length > 0 && (
            <span className="text-[11px] font-semibold text-slate-400">{conversations.length}</span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* isLoading, not isPending — the query is disabled while logged out,
              which would otherwise leave this spinner up forever. */}
          {conversationsQuery.isLoading && (
            <p className="flex items-center justify-center gap-1.5 pt-10 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" />
              Loading…
            </p>
          )}

          {conversationsQuery.isError && (
            <p className="px-4 pt-10 text-center text-xs text-rose-600 dark:text-rose-400">
              Couldn't load your conversations.
            </p>
          )}

          {conversationsQuery.isSuccess && conversations.length === 0 && (
            <div className="px-6 pt-12 text-center">
              <MessageSquare size={22} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">No conversations yet</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Message a seller from a listing, or start a deal — updates land here.
              </p>
            </div>
          )}

          {conversations.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={c.counterparty.username === active}
              onSelect={() => navigate(`/messages?u=${c.counterparty.username}`)}
            />
          ))}
        </div>
      </aside>

      {/* ---- Open thread ---- */}
      <section className={`min-h-0 ${active ? 'flex flex-col' : 'hidden md:flex md:flex-col'}`}>
        {active ? (
          <ChatPanel username={active} onBack={() => navigate('/messages')} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <MessageSquare size={20} className="text-slate-400" />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">Select a conversation</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Pick someone on the left to read the thread and pick up where you left off.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationSummary
  active: boolean
  onSelect: () => void
}) {
  const { counterparty: other, lastMessage, unreadCount } = conversation

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-slate-50 dark:border-slate-800/60 px-4 py-3 text-left transition-colors cursor-pointer ${
        active
          ? 'bg-primary-50 dark:bg-primary-950/40'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {other.avatarUrl ? (
        <img src={other.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-xs font-bold text-white uppercase">
          {other.username.charAt(0)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
            {other.storeName ?? `@${other.username}`}
          </span>
          {other.verified && <ShieldCheck size={12} className="shrink-0 text-primary-600 dark:text-primary-400" />}
        </div>
        <p
          className={`mt-0.5 truncate text-[11px] ${
            unreadCount > 0 ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'
          }`}
        >
          {previewOf(lastMessage)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[10px] text-slate-400">{lastMessage ? shortWhen(lastMessage.createdAt) : ''}</span>
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  )
}

/** File messages carry an optional caption, so preview the kind instead of "". */
function previewOf(last: ConversationSummary['lastMessage']): string {
  if (!last) return 'No messages yet'
  if (last.type === 'system') return last.body.split('\n')[0]
  if (last.type === 'file') return `${last.mine ? 'You: ' : ''}📎 Attachment`
  return `${last.mine ? 'You: ' : ''}${last.body}`
}

/** Clock time for today, a short date before that. */
function shortWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday ? formatTime(date) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
