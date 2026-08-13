import type { DealStatus } from '../data/dealsApi';

/**
 * Status badge tones and labels — the phone port of
 * `web/src/features/escrow/ui/dealStatus.ts`, now matching it exactly.
 *
 * These are the SERVER's five states: created · funded · delivered ·
 * disbursed · disputed · cancelled. They used to be the mock's vocabulary
 * (`shipped`, `released`, `refunded`), which meant every screen reading a real
 * deal had to translate first — and a missed translation silently emptied a
 * filter tab. Using the server's names removes that whole class of bug.
 */

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export type { DealStatus };

export function statusBadge(status: DealStatus): { tone: BadgeTone; label: string } {
  switch (status) {
    case 'created':
      return { tone: 'warning', label: 'Awaiting Funding' };
    case 'funded':
      return { tone: 'info', label: 'Funded — In Progress' };
    case 'delivered':
      return { tone: 'info', label: 'Delivered — Confirm Receipt' };
    case 'disbursed':
      return { tone: 'success', label: 'Completed' };
    case 'disputed':
      return { tone: 'danger', label: 'Disputed' };
    case 'cancelled':
      return { tone: 'neutral', label: 'Cancelled — Refunded' };
    default:
      return { tone: 'neutral', label: status };
  }
}

/** Background / text pairs per tone, matching the web's Badge component. */
export const TONE_COLORS: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: '#f1f5f9', text: '#475569' },
  info: { bg: '#e0e7ff', text: '#3730a3' },
  warning: { bg: '#fef9c3', text: '#854d0e' },
  success: { bg: '#dcfce7', text: '#166534' },
  danger: { bg: '#fee2e2', text: '#991b1b' },
};

/** Ordered stepper for the deal detail timeline (web's HAPPY_PATH). */
export const HAPPY_PATH: { status: DealStatus; label: string }[] = [
  { status: 'created', label: 'Created' },
  { status: 'funded', label: 'Funded' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'disbursed', label: 'Released' },
];
