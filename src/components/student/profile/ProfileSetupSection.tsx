import type { ReactNode } from 'react'
import Section, { StatusPill } from '../../ui/Section'
import type { SectionStatus } from '../../ui/sectionTypes'
import { ChevronDown, ChevronUp, ProfileSectionIcon, type ProfileSectionIconKind } from './profileSectionIcons'
import {
  renterIconWrapClass,
  renterNestedBodyClass,
  renterNestedHeaderClass,
  renterNestedSectionClass,
  renterNoteClass,
} from '../../../lib/renterProfileFormClasses'

export type ProfileSectionStatus = SectionStatus

type SharedProps = {
  id: string
  icon: ProfileSectionIconKind
  title: string
  status: ProfileSectionStatus
  summary?: string
  note?: string
  children?: ReactNode
}

type Props = SharedProps & {
  sectionNum?: string
  subtitle?: string
  expanded: boolean
  onToggle: () => void
  /** When false, header is not clickable (e.g. locked placeholder). */
  collapsible?: boolean
}

/** Controlled wrapper around shared `Section` — open-state owned by RenterProfileSetup. */
export function ProfileSetupSection({
  id,
  sectionNum,
  icon,
  title,
  subtitle,
  status,
  summary,
  note,
  children,
  expanded,
  onToggle,
  collapsible = true,
}: Props) {
  return (
    <Section
      id={id}
      sectionNum={sectionNum}
      icon={<ProfileSectionIcon kind={icon} />}
      title={title}
      subtitle={subtitle}
      status={status}
      summary={summary}
      expanded={expanded}
      onToggle={onToggle}
      collapsible={collapsible}
      editLabel="Edit"
    >
      {collapsible ? (
        <div>
          {children}
          {note ? (
            <div className={renterNoteClass} role="note">
              {note}
            </div>
          ) : null}
        </div>
      ) : null}
    </Section>
  )
}

type NestedProps = SharedProps & {
  expanded: boolean
  onToggle: () => void
}

/** Nested chrome inside a route section (guarantor). Not a second `Section` card. */
export function ProfileNestedSection({
  id,
  icon,
  title,
  status,
  note,
  children,
  expanded,
  onToggle,
}: NestedProps) {
  const headingId = `${id}-heading`

  return (
    <div id={id} className={renterNestedSectionClass} aria-labelledby={headingId}>
      <button
        type="button"
        id={headingId}
        className={renterNestedHeaderClass}
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <div className={renterIconWrapClass}>
          <ProfileSectionIcon kind={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[var(--text-body-size)] font-semibold tracking-[-0.01em] text-[var(--quni-ink)]">
            {title}
          </span>
        </div>
        <StatusPill status={status} />
        <span className="shrink-0 text-[var(--quni-ink-5)]" aria-hidden>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {expanded ? (
        <div id={`${id}-panel`} className={renterNestedBodyClass}>
          {children}
          {note ? (
            <div className={renterNoteClass} role="note">
              {note}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
