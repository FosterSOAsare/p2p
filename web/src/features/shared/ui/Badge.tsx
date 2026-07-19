import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-primary-100 text-primary-700',
  danger: 'bg-red-100 text-red-700',
}

const dotClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-500',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  success: 'bg-primary-500',
  danger: 'bg-red-500',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      {children}
    </span>
  )
}
