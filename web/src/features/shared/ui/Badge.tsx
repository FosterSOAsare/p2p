import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  success: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const dotClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-500 dark:bg-slate-400',
  info: 'bg-sky-500 dark:bg-sky-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  success: 'bg-primary-500 dark:bg-primary-400',
  danger: 'bg-red-500 dark:bg-red-400',
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
