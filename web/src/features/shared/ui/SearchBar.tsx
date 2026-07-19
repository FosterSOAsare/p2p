import { Search, SlidersHorizontal } from 'lucide-react'

export function SearchBar({ placeholder = 'Search listings…' }: { placeholder?: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <button className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
        <SlidersHorizontal size={16} />
        Filters
      </button>
    </div>
  )
}
