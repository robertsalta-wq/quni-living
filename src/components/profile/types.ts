import type { ReactNode } from 'react'

/** Re-export canonical types from `ui/Section`. Prefer importing from `../ui/sectionTypes`. */
export type {
  SectionStatus,
  SectionTone,
  SectionProps,
  CollapsibleProfileSectionProps,
} from '../ui/sectionTypes'

export type ReadinessStepState = 'done' | 'active' | 'todo'

export type ReadinessDriverStep = {
  label: string
  state: ReadinessStepState
}

export type ProfileReadinessDriverProps = {
  eyebrow: string
  /** Display title — string or node (e.g. renter coral %). */
  title: ReactNode
  fraction: string
  fractionLabel: string
  steps: ReadinessDriverStep[]
  /** 0–1; clamped and rounded before rendering bar width. */
  progress: number
  line: ReactNode
  tone?: 'default' | 'positive'
  /**
   * Sticky `top` offset. Number = px; string allows CSS vars
   * (renter: `var(--quni-fixed-header-offset, 0px)`). Default 0.
   */
  stickyTop?: number | string
  /**
   * When set, overrides step-derived completion (needed when `steps` is empty —
   * e.g. renter S1 — so the collapse-when-complete row still works).
   */
  complete?: boolean
  /** Collapsed-complete subtitle. Landlord default: listing copy. */
  completeSubtitle?: string
  /** Collapsed-incomplete title. Default: Finish your profile. */
  incompleteTitle?: string
  /** Collapsed-incomplete subtitle — next required action. */
  incompleteSubtitle?: string
}
