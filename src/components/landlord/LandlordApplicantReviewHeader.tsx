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
}

export default function LandlordApplicantReviewHeader({
  student,
  displayName,
  bio,
  embedded = false,
}: Props) {
  const uni = student?.universities?.name?.trim()
  const course = student?.course?.trim()
  const year = student?.year_of_study
  const nameFitRef = useFitText(displayName)

  const courseLine = [uni, course, year != null ? `Year ${year}` : null].filter(Boolean).join(' · ')

  if (embedded) {
    return (
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">Applicant</p>
        <div className="flex items-start gap-3">
          {student?.avatar_url ? (
            <img
              src={student.avatar_url}
              alt=""
              className="h-[42px] w-[42px] shrink-0 rounded-full object-cover ring-2 ring-[#FEF9E4]"
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
            <div className="mt-0.5">
              <StudentVerifiedBadge student={student} />
            </div>
            {courseLine ? (
              <p className="mt-3 text-[13px] leading-snug text-admin-ink-4">{courseLine}</p>
            ) : null}
            {bio?.trim() ? (
              <div className="mt-3 rounded-lg border border-admin-cream-border bg-[#FEF9E4]/60 px-3 py-2 text-left">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-admin-ink-5">Bio</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-admin-ink-2">{bio.trim()}</p>
              </div>
            ) : null}
            <LanguagesSpokenDisplay languages={student?.languages_spoken} className="mt-3 text-left" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {student?.avatar_url ? (
          <img
            src={student.avatar_url}
            alt=""
            className="mx-auto h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[#FEF9E4] sm:mx-0"
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
          {bio?.trim() && (
            <div className="mt-4 rounded-xl border border-[#e8e0cc]/80 bg-[#FEF9E4]/60 px-4 py-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Bio</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{bio.trim()}</p>
            </div>
          )}
          <LanguagesSpokenDisplay languages={student?.languages_spoken} className="mt-4 text-left" />
        </div>
      </div>
    </section>
  )
}
