import type { ReactNode } from 'react'

export type SectionStatus = 'todo' | 'done' | 'optional' | 'locked'

/** `ai` = purple chrome (AI assessment only — design-system rule). */
export type SectionTone = 'default' | 'warning' | 'danger' | 'ai'

export type SectionProps = {
  id: string
  ordinal?: number
  icon?: ReactNode
  title: string
  subtitle?: string
  /** Omit to hide the status pill (e.g. booking history). */
  status?: SectionStatus
  summary?: ReactNode
  /** Ignored when `collapsible={false}` — body always shown. */
  expanded?: boolean
  onToggle?: () => void
  editLabel?: string
  /** Default true. When false: same chrome, no chevron, no toggle, body always open. */
  collapsible?: boolean
  tone?: SectionTone
  children: ReactNode
}

/** @deprecated Use `SectionProps`. Alias kept for profile barrel consumers. */
export type CollapsibleProfileSectionProps = SectionProps
