import type { ReactNode } from 'react'

export type SectionStatus = 'todo' | 'done' | 'optional'

export type CollapsibleProfileSectionProps = {
  ordinal?: number
  icon: ReactNode
  title: string
  subtitle?: string
  status: SectionStatus
  summary?: ReactNode
  expanded: boolean
  onToggle: () => void
  editLabel?: string
  children: ReactNode
}

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
