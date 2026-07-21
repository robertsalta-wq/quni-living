import { useEffect, useId, useRef, useState } from 'react'
import { isRoomType, ROOM_TYPE_LABELS } from '../../lib/listings'
import { LEASE_LENGTH_OPTIONS } from '../../lib/studentOnboarding'
import { formatStudentOccupancyType } from '../../lib/studentOccupancyOptions'
import { buildLandlordVerificationFromProfile } from './LandlordApplicantVerificationBadges'
import LandlordApplicantVerificationSection from './LandlordApplicantVerificationSection'
import LandlordApplicantAIAssessmentPanel from './LandlordApplicantAIAssessmentPanel'
import { supabase } from '../../lib/supabase'
import { StudentVerifiedBadge } from '../StudentVerifiedBadge'
import LanguagesSpokenDisplay from '../profile/LanguagesSpokenDisplay'
import { studentDisplayName } from '../../lib/nameResolution'

/** Fields landlords may load for applicants (no email, phone, DOB, emergency, document URLs). */
export type LandlordSafeStudentSnapshot = {
  id: string
  verification_type: 'student' | 'identity' | 'none' | null
  accommodation_verification_route: 'student' | 'non_student' | null
  full_name: string | null
  preferred_name?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url: string | null
  course: string | null
  year_of_study: number | null
  study_level: string | null
  student_type: string | null
  languages_spoken: string[] | null
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
  preferred_lease_length: string | null
  preferred_move_in_date: string | null
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

function formatEnumPreference(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatLeaseLengthPref(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  const opt = LEASE_LENGTH_OPTIONS.find((o) => o.value === t)
  return opt?.label ?? formatEnumPreference(t)
}

function formatMoveInDatePref(iso: string | null | undefined): string | null {
  const t = iso?.trim().slice(0, 10)
  if (!t) return null
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(iso!)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

function formatMoveInFlexibility(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  if (t === 'exact') return 'Exact date'
  if (t === 'one_week') return '± 1 week'
  if (t === 'two_weeks') return '± 2 weeks'
  return formatEnumPreference(t)
}

function formatBooleanPref(
  value: boolean | null | undefined,
  yesLabel: string,
  noLabel: string,
): string {
  if (value === true) return yesLabel
  if (value === false) return noLabel
  return 'Not specified'
}

function formatGuarantor(has: boolean | null | undefined, name: string | null | undefined): string {
  if (has === true) return name?.trim() || 'Yes'
  if (has === false) return 'No'
  return 'Not specified'
}

function preferenceOrNeutral(raw: string | null | undefined): string {
  return formatEnumPreference(raw) ?? 'Not specified'
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

  const displayName = student
    ? studentDisplayName(student, fallbackName.trim() || 'Student')
    : fallbackName.trim() || 'Student'
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
    if (!bookingId && !student?.id) {
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
          identitySupportingProvided: Boolean(verification?.identity_supporting_provided),
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

  const bio = student?.bio?.trim()
  const isStudentRoute = student?.accommodation_verification_route !== 'non_student'
  const uni = student?.universities?.name?.trim()
  const course = student?.course?.trim()
  const year = student?.year_of_study
  const studyLevel = formatStudyLevel(student?.study_level)
  const stType = formatStudentType(student?.student_type)
  const roomPref = roomPreferenceLabel(student?.room_type_preference)
  const budget = formatBudgetRange(student?.budget_min_per_week, student?.budget_max_per_week)
  const preferredMoveIn = formatMoveInDatePref(student?.preferred_move_in_date)
  const preferredLease = formatLeaseLengthPref(student?.preferred_lease_length)
  const moveInFlex = formatMoveInFlexibility(student?.move_in_flexibility)
  const occupancyLabel = formatStudentOccupancyType(student?.occupancy_type)
  const hasStudyDetails = Boolean(uni || course || year != null || studyLevel || stType)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="quni-modal relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col"
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
            {bio && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-500">About</h3>
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{bio}</p>
              </section>
            )}

            {isStudentRoute && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-500">Study</h3>
                <dl className="mt-2 space-y-2 text-sm">
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
                  {!hasStudyDetails && (
                    <p className="text-sm text-gray-500">No study details shared yet.</p>
                  )}
                </dl>
              </section>
            )}

            <LanguagesSpokenDisplay languages={student?.languages_spoken} />

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-500">Housing preferences</h3>
              <dl className="mt-2 space-y-2 text-sm">
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
                {occupancyLabel && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Who will live there</dt>
                    <dd className="font-medium text-gray-900">{occupancyLabel}</dd>
                  </div>
                )}
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Preferred move-in</dt>
                  <dd className={`font-medium ${preferredMoveIn ? 'text-gray-900' : 'text-gray-500'}`}>
                    {preferredMoveIn ?? 'Not specified'}
                  </dd>
                </div>
                {moveInFlex && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="text-gray-500 shrink-0 sm:w-36">Move-in flexibility</dt>
                    <dd className="font-medium text-gray-900">{moveInFlex}</dd>
                  </div>
                )}
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Preferred lease</dt>
                  <dd className={`font-medium ${preferredLease ? 'text-gray-900' : 'text-gray-500'}`}>
                    {preferredLease ?? 'Not specified'}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Smoking</dt>
                  <dd
                    className={`font-medium ${student?.is_smoker == null ? 'text-gray-500' : 'text-gray-900'}`}
                  >
                    {formatBooleanPref(student?.is_smoker, 'Smoker', 'Non-smoker')}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Pets</dt>
                  <dd className={`font-medium ${student?.has_pets == null ? 'text-gray-500' : 'text-gray-900'}`}>
                    {formatBooleanPref(student?.has_pets, 'Has pets', 'No pets')}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Parking</dt>
                  <dd
                    className={`font-medium ${student?.needs_parking == null ? 'text-gray-500' : 'text-gray-900'}`}
                  >
                    {formatBooleanPref(student?.needs_parking, 'Needs parking', 'No requirement')}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Bills</dt>
                  <dd
                    className={`font-medium ${student?.bills_preference?.trim() ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    {preferenceOrNeutral(student?.bills_preference)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Furnishing</dt>
                  <dd
                    className={`font-medium ${student?.furnishing_preference?.trim() ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    {preferenceOrNeutral(student?.furnishing_preference)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="text-gray-500 shrink-0 sm:w-36">Guarantor</dt>
                  <dd
                    className={`font-medium ${student?.has_guarantor == null ? 'text-gray-500' : 'text-gray-900'}`}
                  >
                    {formatGuarantor(student?.has_guarantor, student?.guarantor_name)}
                  </dd>
                </div>
              </dl>
            </section>

            <LandlordApplicantVerificationSection
              student={student}
              verificationAnchorId={verificationAnchorId}
              embedded
            />

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
              embedded
            />
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
