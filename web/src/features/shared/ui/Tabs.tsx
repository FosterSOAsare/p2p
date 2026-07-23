export interface TabItem {
  id: string
  label: string
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="inline-flex rounded-md bg-slate-100 dark:bg-slate-800 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            value === item.id
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
