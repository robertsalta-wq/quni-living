import { useEffect } from 'react'
import type { LandlordSafeStudentSnapshot } from './LandlordStudentProfileModal'
import LandlordApplicantVerificationSection from './LandlordApplicantVerificationSection'
import { StudentVerifiedBadge } from '../StudentVerifiedBadge'
import { formatStudentOccupancyType } from '../../lib/studentOccupancyOptions'

/**
 * "Full profile →" right-edge overlay drawer (commit 7). PRIVACY: content is built only from
 * `LandlordSafeStudentSnapshot` fields — never widen this to email / phone / DOB / emergency
 * contact / document URLs. If a section would need one of those, omit the field instead.
 */
type Props = {
  open: boolean
  onClose: () => void
  student: LandlordSafeStudentSnapshot | null
  displayName: string
  onMessage: () => void
}

function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string | null {
  const hasMin = min != null && !Number.isNaN(Number(min))
  const hasMax = max != null && !Number.isNaN(Number(max))
  if (!hasMin && !hasMax) return null
  if (hasMin && hasMax) {
    return `$${Number(min).toLocaleString('en-AU', { maximumFractionDigits: 0 })} – $${Number(max).toLocaleString('en-AU', { maximumFractionDigits: 0 })}/wk`
  }
  if (hasMin) return `From $${Number(min).toLocaleString('en-AU', { maximumFractionDigits: 0 })}/wk`
  return `Up to $${Number(max).toLocaleString('en-AU', { maximumFractionDigits: 0 })}/wk`
}

function formatMoveInDate(iso: string | null | undefined): string | null {
  const t = iso?.trim().slice(0, 10)
  if (!t) return null
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(iso!)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return null
  }
}

function ordinalYear(year: number | null | undefined): string | null {
  if (year == null || !Number.isFinite(Number(year))) return null
  const n = Number(year)
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix} year`
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-admin-ink-5">{label}</span>
      <span className="text-right font-medium text-admin-ink-2">{value}</span>
    </div>
  )
}

function DrawerDivider() {
  return <div className="my-5 h-px bg-admin-line-soft" aria-hidden />
}

export default function LandlordApplicantProfileDrawer({ open, onClose, student, displayName, onMessage }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const uni = student?.universities?.name?.trim() || null
  const course = student?.course?.trim() || null
  const year = ordinalYear(student?.year_of_study)
  const bio = student?.bio?.trim() || null
  const budget = formatBudgetRange(student?.budget_min_per_week, student?.budget_max_per_week)
  const moveIn = formatMoveInDate(student?.preferred_move_in_date)
  const occupancy = formatStudentOccupancyType(student?.occupancy_type)
  const firstName = displayName.split(' ')[0] || displayName

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/[0.28]" aria-label="Close" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName} — applicant profile`}
        className="animate-booking-drawer-slide relative flex h-full w-[420px] max-w-[92vw] flex-col bg-white shadow-admin-modal"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-line px-[22px] py-[18px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
            Applicant profile
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="border-0 bg-transparent px-0.5 text-2xl leading-none text-admin-ink-4 hover:text-admin-ink-2"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-[22px] py-[22px]">
          <div className="flex items-center gap-3.5">
            {student?.avatar_url ? (
              <img
                src={student.avatar_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#FEF9E4]"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-admin-navy-tint text-lg font-semibold text-admin-navy">
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 text-xl font-bold tracking-[-0.01em] text-admin-ink">{displayName}</p>
              <div className="mt-1">
                <StudentVerifiedBadge student={student} />
              </div>
            </div>
          </div>

          <DrawerDivider />
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
            Student details
          </p>
          <div className="flex flex-col gap-2.5">
            <DetailRow label="University" value={uni} />
            <DetailRow label="Course" value={course} />
            <DetailRow label="Year" value={year} />
            {!uni && !course && !year ? <p className="text-sm text-admin-ink-5">Not shared yet.</p> : null}
          </div>

          <DrawerDivider />
          <div id="applicant-profile-drawer-verification">
            <LandlordApplicantVerificationSection student={student} embedded />
          </div>

          {bio ? (
            <>
              <DrawerDivider />
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
                About {firstName}
              </p>
              <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-admin-ink-2">{bio}</p>
            </>
          ) : null}

          <DrawerDivider />
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
            Booking preferences
          </p>
          <div className="flex flex-col gap-2.5">
            <DetailRow label="Preferred move-in" value={moveIn} />
            <DetailRow label="Budget" value={budget} />
            <DetailRow label="Occupancy" value={occupancy} />
            {!moveIn && !budget && !occupancy ? (
              <p className="text-sm text-admin-ink-5">Not shared yet.</p>
            ) : null}
          </div>
        </div>

        <footer className="flex shrink-0 gap-2.5 border-t border-admin-line px-[22px] py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-admin-md border border-admin-line bg-transparent px-4 py-2.5 text-sm font-semibold text-admin-ink-3 hover:bg-admin-surface-2"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onMessage}
            className="flex-1 rounded-admin-md border-0 bg-admin-navy-tint px-4 py-2.5 text-sm font-semibold text-admin-navy hover:bg-admin-navy/15"
          >
            Message {firstName}
          </button>
        </footer>
      </aside>
    </div>
  )
}
