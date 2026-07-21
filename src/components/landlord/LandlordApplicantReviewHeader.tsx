import { useState } from 'react'
import type { LandlordSafeStudentSnapshot } from './LandlordStudentProfileModal'
import { StudentVerifiedBadge } from '../StudentVerifiedBadge'
import LanguagesSpokenDisplay from '../profile/LanguagesSpokenDisplay'
import { useFitText } from '../../hooks/useFitText'

type Props = {
  student: LandlordSafeStudentSnapshot | null
  displayName: string
  /** Short free-text bio from profile */
  bio?: string | null
  /** Strip outer card chrome — for embedding in the right summary card. */
  embedded?: boolean
  /** Opens the full-profile drawer (commit 7). Hidden when omitted. */
  onOpenFullProfile?: () => void
}

export default function LandlordApplicantReviewHeader({
  student,
  displayName,
  bio,
  embedded = false,
  onOpenFullProfile,
}: Props) {
  const [bioOpen, setBioOpen] = useState(false)
  const uni = student?.universities?.name?.trim()
  const course = student?.course?.trim()
  const year = student?.year_of_study
  const nameFitRef = useFitText(displayName)

  const courseLine = [uni, course, year != null ? `Year ${year}` : null].filter(Boolean).join(' · ')
  const bioText = bio?.trim() ?? ''

  if (embedded) {
    return (
      <>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">Applicant</p>
            {onOpenFullProfile ? (
              <button
                type="button"
                onClick={onOpenFullProfile}
                className="shrink-0 border-0 bg-transparent p-0 text-[13px] font-semibold text-admin-coral hover:text-admin-coral-hover"
              >
                Full profile →
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {student?.avatar_url ? (
              <img
                src={student.avatar_url}
                alt=""
                className="h-[42px] w-[42px] shrink-0 rounded-full object-cover ring-2 ring-[var(--quni-cream)]"
              />
            ) : (
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-admin-navy-tint text-[15px] font-semibold text-admin-navy">
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                ref={nameFitRef}
                className="font-semibold text-admin-ink"
                style={{ fontSize: '15px', whiteSpace: 'nowrap' }}
              >
                {displayName}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <StudentVerifiedBadge student={student} />
                {bioText ? (
                  <button
                    type="button"
                    onClick={() => setBioOpen(true)}
                    className="rounded-admin-md border border-admin-line bg-admin-surface-2 px-2 py-0.5 text-[11px] font-semibold text-admin-ink-3 hover:bg-admin-surface-3"
                  >
                    View bio
                  </button>
                ) : null}
              </div>
              {courseLine ? (
                <p className="mt-1.5 text-[13px] leading-snug text-admin-ink-4">{courseLine}</p>
              ) : null}
            </div>
          </div>
        </div>

        {bioOpen && bioText ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close"
              onClick={() => setBioOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-admin-lg border border-admin-line bg-admin-surface-1 p-5 shadow-admin-modal">
              <h3 className="text-base font-semibold text-admin-ink">Bio — {displayName}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-admin-ink-2">{bioText}</p>
              <button
                type="button"
                onClick={() => setBioOpen(false)}
                className="mt-4 w-full rounded-admin-md border border-admin-line bg-admin-surface-2 px-4 py-2 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-3"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {student?.avatar_url ? (
          <img
            src={student.avatar_url}
            alt=""
            className="mx-auto h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[var(--quni-cream)] sm:mx-0"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold text-gray-600 sm:mx-0">
            {displayName.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
          <div className="mt-1.5 flex justify-center sm:justify-start">
            <StudentVerifiedBadge student={student} />
          </div>
          <div className="mt-2 space-y-0.5 text-sm text-gray-600">
            {uni && <p>{uni}</p>}
            {course && <p>{course}</p>}
            {year != null && <p>Year {year}</p>}
          </div>
          {bioText ? (
            <div className="mt-4 rounded-xl border border-admin-cream-border/80 bg-admin-cream/60 px-4 py-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Bio</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{bioText}</p>
            </div>
          ) : null}
          <LanguagesSpokenDisplay languages={student?.languages_spoken} className="mt-4 text-left" />
        </div>
      </div>
    </section>
  )
}
