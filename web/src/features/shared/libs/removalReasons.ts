/**
 * Mirrors the server's removal-reasons module — keep the wording in step.
 *
 * Shared rather than admin-owned because buyers pick from the same list when
 * they report a listing: a report is an accusation of exactly what a takedown
 * is a finding of, so the reported reason carries into the removal unchanged.
 */

export type RemovalReason =
  | 'prohibited_item'
  | 'duplicate'
  | 'misleading'
  | 'spam'
  | 'guidelines'
  | 'fraud'
  | 'other'

export const REMOVAL_REASONS: { id: RemovalReason; label: string }[] = [
  { id: 'prohibited_item', label: 'Prohibited or restricted item' },
  { id: 'duplicate', label: 'Duplicate listing' },
  { id: 'misleading', label: 'Misleading or inaccurate information' },
  { id: 'spam', label: 'Spam or low-quality content' },
  { id: 'guidelines', label: 'Violates community guidelines' },
  { id: 'fraud', label: 'Fraudulent or suspicious activity' },
  { id: 'other', label: 'Other' },
]
