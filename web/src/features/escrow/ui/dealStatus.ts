import type { EscrowStatus } from '../data/ordersApi'

type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

/** Badge tone + human label per escrow status. */
export function statusBadge(status: EscrowStatus): { tone: BadgeTone; label: string } {
  switch (status) {
    case 'created':
      return { tone: 'warning', label: 'Awaiting Funding' }
    case 'funded':
      return { tone: 'info', label: 'Funded — In Progress' }
    case 'delivered':
      return { tone: 'info', label: 'Delivered — Confirm Receipt' }
    case 'disbursed':
      return { tone: 'success', label: 'Completed' }
    case 'disputed':
      return { tone: 'danger', label: 'Disputed' }
    case 'cancelled':
      return { tone: 'neutral', label: 'Cancelled — Refunded' }
    default:
      return { tone: 'neutral', label: status }
  }
}

/** Ordered stepper for the detail timeline. */
export const HAPPY_PATH: { status: EscrowStatus; label: string }[] = [
  { status: 'created', label: 'Created' },
  { status: 'funded', label: 'Funded' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'disbursed', label: 'Released' },
]

export const ACTION_META: Record<string, { label: string; tone: 'primary' | 'success' | 'danger' }> = {
  FUND: { label: 'Fund Escrow', tone: 'primary' },
  DELIVER: { label: 'Mark as Delivered', tone: 'primary' },
  RELEASE: { label: 'Confirm Receipt & Release', tone: 'success' },
  CANCEL: { label: 'Cancel Order', tone: 'danger' },
  DISPUTE: { label: 'Open Dispute', tone: 'danger' },
}
