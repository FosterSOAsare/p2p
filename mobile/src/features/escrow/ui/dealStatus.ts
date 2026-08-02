import type { EscrowDeal } from '@/constants/mockData';

/**
 * Status badge tones and labels — the phone port of
 * `web/src/features/escrow/ui/dealStatus.ts`.
 *
 * The web models 5 states (created · funded · delivered · disbursed · disputed).
 * The mobile mock adds three more (shipped, released, refunded), so those are
 * mapped onto the nearest web tone and given labels in the same voice.
 */

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export type DealStatus = EscrowDeal['status'];

export function statusBadge(status: DealStatus): { tone: BadgeTone; label: string } {
  switch (status) {
    case 'created':
      return { tone: 'warning', label: 'Awaiting Funding' };
    case 'funded':
      return { tone: 'info', label: 'Funded — In Progress' };
    case 'shipped':
      return { tone: 'info', label: 'Shipped — In Transit' };
    case 'delivered':
      return { tone: 'info', label: 'Delivered — Confirm Receipt' };
    case 'released':
      return { tone: 'success', label: 'Completed' };
    case 'disputed':
      return { tone: 'danger', label: 'Disputed' };
    case 'refunded':
      return { tone: 'neutral', label: 'Refunded' };
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
  { status: 'released', label: 'Released' },
];
