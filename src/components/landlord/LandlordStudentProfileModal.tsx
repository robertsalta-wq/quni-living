import { useEffect, useId, useRef, useState } from 'react'
import { isRoomType, ROOM_TYPE_LABELS } from '../../lib/listings'
import { buildLandlordVerificationFromProfile } from './LandlordApplicantVerificationBadges'
import LandlordApplicantVerificationSection from './LandlordApplicantVerificationSection'
import LandlordApplicantAIAssessmentPanel from './LandlordApplicantAIAssessmentPanel'
import { supabase } from '../../lib/supabase'
import { StudentVerifiedBadge } from '../StudentVerifiedBadge'

/** Fields landlords may load for applicants (no email, phone, DOB, emergency, document URLs). */
export type LandlordSafeStudentSnapshot = {
  id: string
  verification_type: 'student' | 'identity' | 'none' | null
  accommodation_verification_route: 'student' | 'non_student' | null
  full_name: string | null
  avatar_url: string | null
  course: string | null
  year_of_study: number | null
  study_level: string | null
  student_type: string | null
  nationality: string | null
  room_type_preference: string | null
  budget_min_per_week: number | null
  budget_max_per_week: number | null
  universities: { name: string } | null
  uni_email_verified: boolean | null
  uni_email_verified_at: string | null
  work_email_verified: boolean | null
  work_email_verified_at: string | null
  id_submitted_at: string | null
  enrolment_submitted_at: string | null
  identity_supporting_submitted_at: string | null
  is_smoker: boolean | null
  bio: string | null
  occupancy_type: string | null
  move_in_flexibility: string | null
  has_pets: boolean | null
  needs_parking: boolean | null
  bills_preference: string | null
  furnishing_preference: string | null
  has_guarantor: boolean | null
  guarantor_name: string | null
}

function formatStudyLevel(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStudentType(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  if (lower === 'domestic') return 'Domestic'
  if (lower === 'international') return 'International'
  return formatStudyLevel(t)
}

function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string | null {
  const hasMin = min != null && !Number.isNaN(Number(min))
  const hasMax = max != null && !Number.isNaN(Number(max))
  if (!hasMin && !hasMax) return null
  if (hasMin && hasMax) {
    return `$${Number(min).toLocaleString('en-AU', { maximumFractionDigits: 0 })} – $${Number(max).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
  }
  if (hasMin) return `From $${Number(min).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
  return `Up to $${Number(max).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
}

function roomPreferenceLabel(pref: string | null | undefined): string | null {
  const t = pref?.trim()
  if (!t) return null
  if (isRoomType(t)) return ROOM_TYPE_LABELS[t]
  return formatStudyLevel(t)
}

function splitDisplayName(full: string): { firstName: string; lastName: string } {
  const t = full.trim().replace(/\s+/g, ' ')
  if (!t) return { firstName: '', lastName: '' }
  const i = t.indexOf(' ')
  if (i < 0) return { firstName: t, lastName: '' }
  return { firstName: t.slice(0, i), lastName: t.slice(i + 1) }
}

type Props = {
  open: boolean
  onClose: () => void
  student: LandlordSafeStudentSnapshot | null
  /** When profile row missing (e.g. RLS) but we know display name from booking. */
  fallbackName: string
  scrollToVerification: boolean
  /** Open scrolled to the AI Assessment block (e.g. from booking card nudge). */
  scrollToAiAssessment: boolean
  /** When this changes, in-modal AI assessment state is cleared (dashboard applicant session key). */
  assessmentIdentityKey: string
  /** When set (e.g. opened from a booking card), assessment uses server booking context so rent/location are not guessed. */
  assessmentBookingId?: string | null
  /** Called after a successful AI assessment so the parent can update UI (e.g. link label). */
  onAiAssessmentGenerated?: () => void
  /** Landlord given name for AI context; server prefers `landlord_profiles` from the session JWT. */
  landlordFirstName?: string | null
}

export default function LandlordStudentProfileModal({
  open,
  onClose,
  student,
  fallbackName,
  scrollToVerification,
  scrollToAiAssessment,
  assessmentIdentityKey,
  assessmentBookingId = null,
  onAiAssessmentGenerated,
  landlordFirstName,
}: Props) {
  const titleId = useId()
  const verificationAnchorId = 'landlord-student-modal-verification'
  const aiAssessmentAnchorId = 'landlord-student-modal-ai-assessment'
  const [aiAssessment, setAiAssessment] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)
  const assessmentIdentityRef = useRef<string | undefined>(undefined)

  const displayName =
    student?.full_name?.trim() || fallbackName.trim() || 'Student'
  const verification = buildLandlordVerificationFromProfile(student)

  useEffect(() => {
    if (!open) {
      setAiLoading(false)
      return
    }
    if (assessmentIdentityRef.current !== assessmentIdentityKey) {
      assessmentIdentityRef.current = assessmentIdentityKey
      setAiAssessment(null)
      setAiError(false)
      setAiLoading(false)
    }
  }, [open, assessmentIdentityKey])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      if (scrollToAiAssessment) {
        document.getElementById(aiAssessmentAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (scrollToVerification) {
        document.getElementById(verificationAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [open, scrollToAiAssessment, scrollToVerification])

  async function requestAiAssessment() {
    setAiLoading(true)
    setAiError(false)
    setAiAssessment(null)
    const { firstName, lastName } = splitDisplayName(displayName)
    const uni = student?.universities?.name?.trim() ?? ''
    const courseStr = student?.course?.trim() ?? ''
    const yearVal = student?.year_of_study
    const stTypeRaw = formatStudentType(student?.student_type)
    const roomPrefStr =
      roomPreferenceLabel(student?.room_type_preference) ?? student?.room_type_preference?.trim() ?? ''
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setAiError(true)
      setAiLoading(false)
      return
    }

    const landlordFn = landlordFirstName?.trim()
    const bookingId = assessmentBookingId?.trim() ?? ''
    if (!bookingId && (!student?.id || student.verification_type !== 'student')) {
      setAiError(true)
      setAiLoading(false)
      return
    }

    const payload = bookingId
      ? {
          bookingId,
          ...(landlordFn ? { landlordFirstName: landlordFn } : {}),
        }
      : {
          applicantProfileId: student!.id,
          firstName,
          lastName,
          university: uni,
          course: courseStr,
          yearOfStudy: yearVal != null && Number.isFinite(Number(yearVal)) ? Number(yearVal) : null,
          studentType: stTypeRaw ?? '',
          uniEmailVerified: verification?.uni_email_verified === true,
          workEmailVerified: verification?.work_email_verified === true,
          idProvided: Boolean(verification?.id_provided),
          enrolmentProvided: Boolean(verification?.enrolment_provided),
          roomTypePreference: roomPrefStr,
          budgetMin: student?.budget_min_per_week ?? null,
          budgetMax: student?.budget_max_per_week ?? null,
          isSmoker: student?.is_smoker ?? null,
          occupancyType: student?.occupancy_type ?? null,
          moveInFlexibility: student?.move_in_flexibility ?? null,
          hasPets: student?.has_pets ?? null,
          needsParking: student?.needs_parking ?? null,
          billsPreference: student?.bills_preference ?? null,
          furnishingPreference: student?.furnishing_preference ?? null,
          hasGuarantor: student?.has_guarantor ?? null,
          guarantorName: student?.guarantor_name ?? null,
          ...(landlordFn ? { landlordFirstName: landlordFn } : {}),
        }
    try {
      const res = await fetch('/api/ai/student-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { assessment?: string; error?: string }
      if (!res.ok || typeof data.assessment !== 'string' || !data.assessment.trim()) {
        setAiError(true)
        return
      }
      setAiAssessment(data.assessment.trim())
      onAiAssessmentGenerated?.()
    } catch {
      setAiError(true)
    } finally {
      setAiLoading(false)
    }
  }

  if (!open) return null

  const uni = student?.universities?.name?.trim()
  const course = student?.course?.trim()
  const year = student?.year_of_study
  const studyLevel = formatStudyLevel(student?.study_level)
  const stType = formatStudentType(student?.student_type)
  const nationality = student?.nationality?.trim()
  const roomPref = roomPreferenceLabel(student?.room_type_preference)
  const budget = formatBudgetRange(student?.budget_min_per_week, student?.budget_max_per_week)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="overflow-y-auto overscroll-contain px-6 pb-6 pt-6">
          <div className="flex flex-col items-center text-center">
            {student?.avatar_url ? (
              <img
                src={student.avatar_url}
                alt=""
                className="h-24 w-24 rounded-full object-cover ring-4 ring-gray-100"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-600">
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <h2 id={titleId} className="mt-4 text-xl font-bold text-gray-900">
              {displayName}
            </h2>
            <div className="mt-2 flex justify-center">
              <StudentVerifiedBadge student={student} />
            </div>
            <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-gray-500">
              Review this student&apos;s profile and verification status before responding to their booking request.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <section className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Study</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {uni && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">University</dt>
                    <dd className="font-medium text-gray-900">{uni}</dd>
                  </div>
                )}
                {course && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Course</dt>
                    <dd className="font-medium text-gray-900">{course}</dd>
                  </div>
                )}
                {year != null && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Year of study</dt>
                    <dd className="font-medium text-gray-900">{year}</dd>
                  </div>
                )}
                {studyLevel && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Study level</dt>
                    <dd className="font-medium text-gray-900">{studyLevel}</dd>
                  </div>
                )}
                {stType && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Student type</dt>
                    <dd className="font-medium text-gray-900">{stType}</dd>
                  </div>
                )}
                {nationality && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Nationality</dt>
                    <dd className="font-medium text-gray-900">{nationality}</dd>
                  </div>
                )}
                {!uni && !course && year == null && !studyLevel && !stType && !nationality && (
                  <p className="text-sm text-gray-500">No study details shared yet.</p>
                )}
              </dl>
            </section>

            <section className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Housing preferences</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {roomPref && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Room type</dt>
                    <dd className="font-medium text-gray-900">{roomPref}</dd>
                  </div>
                )}
                {budget && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Budget</dt>
                    <dd className="font-medium text-gray-900">{budget}</dd>
                  </div>
                )}
                {student?.occupancy_type?.trim() && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Occupancy</dt>
                    <dd className="font-medium text-gray-900">{student.occupancy_type.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {student?.move_in_flexibility?.trim() && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Move-in flexibility</dt>
                    <dd className="font-medium text-gray-900">{student.move_in_flexibility.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {student?.has_pets != null && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Pets</dt>
                    <dd className="font-medium text-gray-900">{student.has_pets ? 'Yes' : 'No'}</dd>
                  </div>
                )}
                {student?.needs_parking != null && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Parking</dt>
                    <dd className="font-medium text-gray-900">{student.needs_parking ? 'Needs parking' : 'No requirement'}</dd>
                  </div>
                )}
                {student?.bills_preference?.trim() && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Bills</dt>
                    <dd className="font-medium text-gray-900">{student.bills_preference.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {student?.furnishing_preference?.trim() && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Furnishing</dt>
                    <dd className="font-medium text-gray-900">{student.furnishing_preference.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {student?.has_guarantor === true && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Guarantor</dt>
                    <dd className="font-medium text-gray-900">{student.guarantor_name?.trim() || 'Yes'}</dd>
                  </div>
                )}
                {!roomPref &&
                  !budget &&
                  !student?.occupancy_type?.trim() &&
                  !student?.move_in_flexibility?.trim() &&
                  student?.has_pets == null &&
                  student?.needs_parking == null &&
                  !student?.bills_preference?.trim() &&
                  !student?.furnishing_preference?.trim() &&
                  student?.has_guarantor !== true && (
                  <p className="text-sm text-gray-500">No housing preferences shared yet.</p>
                )}
              </dl>
            </section>

            <LandlordApplicantVerificationSection student={student} verificationAnchorId={verificationAnchorId} />

            {student?.verification_type === 'student' && (
              <LandlordApplicantAIAssessmentPanel
                anchorId={aiAssessmentAnchorId}
                assessment={aiAssessment}
                assessmentAt={null}
                loading={aiLoading}
                error={aiError}
                onGenerate={() => void requestAiAssessment()}
                onRefresh={() => void requestAiAssessment()}
                refreshDisabled={false}
                showGenerate
              />
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto sm:px-6"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
