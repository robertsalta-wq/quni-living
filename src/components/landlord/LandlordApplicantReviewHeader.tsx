import type { LandlordSafeStudentSnapshot } from './LandlordStudentProfileModal'

type Props = {
  student: LandlordSafeStudentSnapshot | null
  displayName: string
  /** Short free-text bio from profile */
  bio?: string | null
}

export default function LandlordApplicantReviewHeader({ student, displayName, bio }: Props) {
  const uni = student?.universities?.name?.trim()
  const course = student?.course?.trim()
  const year = student?.year_of_study

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        {student?.avatar_url ? (
          <img
            src={student.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-[#FEF9E4] shrink-0 mx-auto sm:mx-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600 shrink-0 mx-auto sm:mx-0">
            {displayName.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
          <div className="mt-2 space-y-0.5 text-sm text-gray-600">
            {uni && <p>{uni}</p>}
            {course && <p>{course}</p>}
            {year != null && <p>Year {year}</p>}
          </div>
          {bio?.trim() && (
            <div className="mt-4 rounded-xl bg-[#FEF9E4]/60 border border-[#e8e0cc]/80 px-4 py-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Bio</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{bio.trim()}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
