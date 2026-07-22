import { useEffect, useState, type ReactNode } from 'react'
import Section, { StatusPill } from '../../ui/Section'
import type { SectionStatus } from '../../ui/sectionTypes'
import { ChevronDown, ChevronUp, ProfileSectionIcon, type ProfileSectionIconKind } from './profileSectionIcons'
import {
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
  children: ReactNode
}

type Props = SharedProps & {
  sectionNum?: string
  /** When true, header is not clickable (e.g. locked placeholder). */
  staticHeader?: boolean
}

export function ProfileSetupSection({
  id,
  sectionNum,
  icon,
  title,
  status,
  summary,
  note,
  children,
  staticHeader = false,
}: Props) {
  const defaultOpen = status === 'todo'
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (status === 'done') setOpen(false)
    if (status === 'todo') setOpen(true)
  }, [status])

  return (
    <Section
      id={id}
      sectionNum={sectionNum}
      icon={<ProfileSectionIcon kind={icon} />}
      title={title}
      status={status}
      summary={summary}
      expanded={open}
      onToggle={() => setOpen((v) => !v)}
      collapsible={!staticHeader}
      editLabel="Edit"
    >
      {staticHeader ? null : (
        <div>
          {children}
          {note ? (
            <div className={renterNoteClass} role="note">
              {note}
            </div>
          ) : null}
        </div>
      )}
    </Section>
  )
}

/** Tighter nested block inside a route section (e.g. guarantor). Uses `stack` single-column grid. */
export function ProfileNestedSection({
  id,
  icon,
  title,
  status,
  note,
  children,
}: SharedProps) {
  const defaultOpen = status === 'todo'
  const [open, setOpen] = useState(defaultOpen)
  const headingId = `${id}-heading`

  useEffect(() => {
    if (status === 'done') setOpen(false)
    if (status === 'todo') setOpen(true)
  }, [status])

  return (
    <div id={id} className="renter-profile-nested-section" aria-labelledby={headingId}>
      <button
        type="button"
        id={headingId}
        className="renter-profile-nested-header"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="renter-profile-icon-wrap">
          <ProfileSectionIcon kind={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[var(--text-body-size)] font-semibold tracking-[-0.01em] text-[var(--quni-ink)]">
            {title}
          </span>
        </div>
        <StatusPill status={status} />
        <span className="shrink-0 text-[var(--quni-ink-5)]" aria-hidden>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open ? (
        <div id={`${id}-panel`} className="renter-profile-nested-body">
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
