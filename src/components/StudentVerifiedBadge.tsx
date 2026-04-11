import type { LandlordSafeStudentSnapshot } from './landlord/LandlordStudentProfileModal'

type StudentTrustFields = Pick<
  LandlordSafeStudentSnapshot,
  'uni_email_verified' | 'work_email_verified' | 'id_submitted_at' | 'identity_supporting_submitted_at'
>

export function studentIsVerifiedForTrust(student: StudentTrustFields | null | undefined): boolean {
  if (!student) return false
  if (student.uni_email_verified === true || student.work_email_verified === true) return true
  if (student.id_submitted_at?.trim()) return true
  if (student.identity_supporting_submitted_at?.trim()) return true
  return false
}

/** Trust pill when the student has completed email or ID-style verification. */
export function StudentVerifiedBadge({
  student,
  className = '',
}: {
  student: LandlordSafeStudentSnapshot | null | undefined
  className?: string
}) {
  if (!studentIsVerifiedForTrust(student)) return null
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold leading-tight text-emerald-700 ${className}`.trim()}
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Student Verified
    </span>
  )
}
