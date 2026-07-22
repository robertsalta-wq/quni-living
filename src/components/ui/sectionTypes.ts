import type { ReactNode } from 'react'

export type SectionStatus = 'todo' | 'done' | 'optional' | 'locked'

/** `ai` = purple chrome (AI assessment only — design-system rule). */
export type SectionTone = 'default' | 'warning' | 'danger' | 'ai'

export type SectionProps = {
  id: string
  icon?: ReactNode
  title: string
  /** Optional coral section index shown before the title (e.g. renter profile "01"). */
  sectionNum?: string
  subtitle?: string
  /** Omit to hide the status pill (e.g. booking history). */
  status?: SectionStatus
  summary?: ReactNode
  /** Ignored when `collapsible={false}` — body always shown when children are present. */
  expanded?: boolean
  onToggle?: () => void
  editLabel?: string
  /** Default true. When false: same chrome, no chevron, no toggle, body always open when children are present. */
  collapsible?: boolean
  tone?: SectionTone
  /** Omit or pass null to hide the body (e.g. locked placeholder with no content). */
  children?: ReactNode
}

/** @deprecated Use `SectionProps`. Alias kept for profile barrel consumers. */
export type CollapsibleProfileSectionProps = SectionProps
