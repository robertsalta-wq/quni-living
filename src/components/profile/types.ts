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
  title: string
  fraction: string
  fractionLabel: string
  steps: ReadinessDriverStep[]
  /** 0–1; clamped and rounded before rendering bar width. */
  progress: number
  line: ReactNode
  tone?: 'default' | 'positive'
  /** px offset for `position: sticky`; default 0. */
  stickyTop?: number
}
