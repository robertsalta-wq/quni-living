import { Check, ChevronLeft, ChevronRight, X, type LucideIcon } from 'lucide-react'

/**
 * Listing drill-in chrome icons follow the item id, not `primary`.
 * Next is the primary action on drafts, so a primary→Check map showed a tick.
 */
export function listingChromeActionIcon(spec: { id: string; primary?: boolean }): LucideIcon {
  if (spec.id === 'prev') return ChevronLeft
  if (spec.id === 'next') return ChevronRight
  if (spec.id === 'save' || spec.primary) return Check
  return X
}
