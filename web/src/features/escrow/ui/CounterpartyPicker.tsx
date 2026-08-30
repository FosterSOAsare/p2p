import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, ShieldCheck, User, X } from 'lucide-react'
import { useCounterpartySearch, type CounterpartyMatch } from '../../user/data/usersApi'

/**
 * Who the other side of a deal is — suggest-as-you-type, like adding a
 * collaborator on GitHub.
 *
 * Three states matter, and they are not the same thing:
 *
 * - **empty** — valid. The deal is created one-sided and handed over by share
 *   link, which is the whole point of the invite QR on the deal page. Nothing
 *   here may treat "no username" as an error.
 * - **picked** — a confirmed account, shown as a chip. Only this counts as a
 *   counterparty.
 * - **typed but unconfirmed** — invalid, and the reason this component exists.
 *   Free text used to go straight to the server, which rejected it *after* the
 *   round trip with the form already gone.
 *
 * The server applies the same exclusions when the deal is created (admins,
 * yourself, suspended accounts), so a suggestion here can never be one the
 * create call would refuse.
 */

interface CounterpartyPickerProps {
  /** The confirmed selection, or null. Owned by the parent. */
  value: CounterpartyMatch | null
  onChange: (value: CounterpartyMatch | null) => void
  /**
   * Raw text currently in the box. Lifted so the parent can tell "empty" from
   * "typed something that was never confirmed" and block submission on the
   * second — the picker itself has no business deciding whether a form submits.
   */
  query: string
  onQueryChange: (query: string) => void
  disabled?: boolean
}

export function CounterpartyPicker({
  value,
  onChange,
  query,
  onQueryChange,
  disabled,
}: CounterpartyPickerProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const search = useCounterpartySearch(query)
  const matches = search.data ?? []

  // Close on an outside click, or the list hangs over the rest of the form.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // A shrinking list must not leave the highlight past its end.
  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, matches.length - 1)))
  }, [matches.length])

  const pick = (match: CounterpartyMatch) => {
    onChange(match)
    onQueryChange(match.username)
    setOpen(false)
  }

  const clear = () => {
    onChange(null)
    onQueryChange('')
    setOpen(false)
  }

  // A confirmed pick is a chip, not an editable field — editing it would put
  // the form back in the ambiguous "typed but unconfirmed" state silently.
  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900">
          {value.avatarUrl ? (
            <img src={value.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={14} className="text-emerald-700 dark:text-emerald-300" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
              @{value.username}
            </span>
            {value.verified && (
              <ShieldCheck size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
          </span>
          {value.storeName && (
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              {value.storeName}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          aria-label={`Remove @${value.username}`}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  const showList = open && query.replace(/^@/, '').trim().length >= 2

  return (
    <div ref={boxRef} className="relative">
      <User
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        id="deal-counterparty"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList || matches.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => (h + 1) % matches.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => (h - 1 + matches.length) % matches.length)
          } else if (e.key === 'Enter') {
            // Selecting from the list must not also submit the form.
            e.preventDefault()
            pick(matches[highlight])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder="Search a username, or leave blank"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />
      {search.isFetching && (
        <Loader2
          size={14}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
        />
      )}

      {showList && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {matches.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
              {search.isFetching ? 'Searching…' : 'No matching account. Check the spelling, or leave it blank to invite by link.'}
            </p>
          ) : (
            matches.map((m, i) => (
              <button
                key={m.username}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(m)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                  i === highlight ? 'bg-slate-100 dark:bg-slate-800' : ''
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={14} className="text-slate-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      @{m.username}
                    </span>
                    {m.verified && (
                      <ShieldCheck
                        size={12}
                        className="shrink-0 text-emerald-600 dark:text-emerald-400"
                      />
                    )}
                  </span>
                  {m.storeName && (
                    <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {m.storeName}
                    </span>
                  )}
                </span>
                {i === highlight && <Check size={13} className="shrink-0 text-slate-400" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
