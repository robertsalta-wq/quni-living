import { useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Check, ProfileSectionIcon, type ProfileSectionIconKind } from './profileSectionIcons'

export type ProfileSectionStatus = 'done' | 'todo' | 'optional' | 'locked'

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
  /** Single-column field grid (ProfileSection.dc.html `stack`). */
  stack?: boolean
  /** When true, header is not clickable (e.g. locked placeholder). */
  staticHeader?: boolean
}

function StatusPill({ status }: { status: ProfileSectionStatus }) {
  if (status === 'done') {
    return (
      <span className="renter-profile-pill renter-profile-pill-done">
        <Check size={13} strokeWidth={3} aria-hidden />
        Done
      </span>
    )
  }
  if (status === 'todo') {
    return <span className="renter-profile-pill renter-profile-pill-todo">To do</span>
  }
  if (status === 'optional') {
    return <span className="renter-profile-pill renter-profile-pill-optional">Optional</span>
  }
  return <span className="renter-profile-pill renter-profile-pill-locked">Locked</span>
}

function SectionHeaderInner({
  sectionNum,
  icon,
  title,
  status,
  summary,
  showSummary,
  staticHeader,
  open,
}: {
  sectionNum?: string
  icon: ProfileSectionIconKind
  title: string
  status: ProfileSectionStatus
  summary?: string
  showSummary: boolean
  staticHeader: boolean
  open: boolean
}) {
  return (
    <>
      <div className="renter-profile-icon-wrap">
        <ProfileSectionIcon kind={icon} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
          {sectionNum ? <span className="renter-profile-section-num">{sectionNum}</span> : null}
          <span className="renter-profile-section-title">{title}</span>
        </div>
        {showSummary && summary ? <div className="renter-profile-section-summary">{summary}</div> : null}
      </div>
      <StatusPill status={status} />
      {!staticHeader ? (
        <span className="renter-profile-chevron" aria-hidden>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      ) : null}
    </>
  )
}

export function ProfileSetupSection({
  id,
  sectionNum,
  icon,
  title,
  status,
  summary,
  note,
  stack = false,
  children,
  staticHeader = false,
}: Props) {
  const defaultOpen = status === 'todo'
  const [open, setOpen] = useState(defaultOpen)
  const headingId = useId()

  useEffect(() => {
    if (status === 'done') setOpen(false)
    if (status === 'todo') setOpen(true)
  }, [status])

  const showSummary = status !== 'todo' && !open && Boolean(summary)
  const headerClass = staticHeader
    ? 'renter-profile-card-header renter-profile-card-header-static'
    : 'renter-profile-card-header'

  const bodyInnerClass = stack
    ? 'renter-profile-section-body-inner renter-profile-section-body-inner--stack'
    : 'renter-profile-section-body-inner'

  const headerInner = (
    <SectionHeaderInner
      sectionNum={sectionNum}
      icon={icon}
      title={title}
      status={status}
      summary={summary}
      showSummary={showSummary}
      staticHeader={staticHeader}
      open={open}
    />
  )

  return (
    <section id={id} className="quni-card overflow-hidden font-sans scroll-mt-below-header" aria-labelledby={headingId}>
      {staticHeader ? (
        <div className={headerClass} id={headingId}>
          {headerInner}
        </div>
      ) : (
        <button
          type="button"
          id={headingId}
          className={headerClass}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((v) => !v)}
        >
          {headerInner}
        </button>
      )}
      {open && !staticHeader ? (
        <div id={`${id}-panel`} className="renter-profile-section-body">
          <div className={bodyInnerClass}>
            {children}
            {note ? (
              <div className="renter-profile-note" role="note">
                {note}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
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
  const headingId = useId()

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="renter-profile-section-title">{title}</span>
        </div>
        <StatusPill status={status} />
        <span className="renter-profile-chevron" aria-hidden>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open ? (
        <div id={`${id}-panel`} className="renter-profile-nested-body">
          {children}
          {note ? (
            <div className="renter-profile-note" role="note">
              {note}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
