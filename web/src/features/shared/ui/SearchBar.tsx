import { Search, SlidersHorizontal, X } from 'lucide-react'

export interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  placeholder?: string
  onFilterToggle?: () => void
  filterCount?: number
  showFilterButton?: boolean
}

export function SearchBar({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search listings by title, seller, or keyword...',
  onFilterToggle,
  filterCount = 0,
  showFilterButton = true,
}: SearchBarProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm transition-all"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showFilterButton && (
        <button
          type="button"
          onClick={onFilterToggle}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm shrink-0 cursor-pointer"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {filterCount > 0 && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
