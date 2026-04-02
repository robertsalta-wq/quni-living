import { useEffect, useId, useRef, useState } from 'react'
import { isRoomType, ROOM_TYPE_LABELS } from '../../lib/listings'
import {
  buildLandlordVerificationFromProfile,
  LandlordApplicantVerificationBadges,
  LandlordApplicantVerificationDetail,
} from './LandlordApplicantVerificationBadges'
import AiSparkleIcon from '../AiSparkleIcon'
import { supabase } from '../../lib/supabase'

/** Fields landlords may load for applicants (no email, phone, DOB, emergency, document URLs). */
export type LandlordSafeStudentSnapshot = {
  id: string
  verification_type: 'student' | 'identity' | 'none' | null
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
  id_submitted_at: string | null
  enrolment_submitted_at: string | null
  identity_supporting_submitted_at: string | null
  is_smoker: boolean | null
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
    if (!student?.id || student.verification_type !== 'student') {
      setAiError(true)
      setAiLoading(false)
      return
    }

    const payload = {
      applicantProfileId: student.id,
      firstName,
      lastName,
      university: uni,
      course: courseStr,
      yearOfStudy: yearVal != null && Number.isFinite(Number(yearVal)) ? Number(yearVal) : null,
      studentType: stTypeRaw ?? '',
      uniEmailVerified: verification?.uni_email_verified === true,
      idProvided: Boolean(verification?.id_provided),
      enrolmentProvided: Boolean(verification?.enrolment_provided),
      roomTypePreference: roomPrefStr,
      budgetMin: student?.budget_min_per_week ?? null,
      budgetMax: student?.budget_max_per_week ?? null,
      isSmoker: student?.is_smoker ?? null,
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
                {!roomPref && !budget && (
                  <p className="text-sm text-gray-500">No housing preferences shared yet.</p>
                )}
              </dl>
            </section>

            <section
              id={verificationAnchorId}
              className="scroll-mt-4 rounded-xl border border-emerald-100/80 bg-emerald-50/40 px-4 py-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">Verification</h3>
              <p className="mt-1 text-xs text-gray-600">
                Document files are not shared; you only see whether each step was completed.
              </p>
              <div className="mt-3">
                <LandlordApplicantVerificationBadges verification={verification} />
              </div>
              <div className="mt-4 rounded-lg border border-white/80 bg-white/70 px-3 py-2">
                <LandlordApplicantVerificationDetail verification={verification} />
              </div>
            </section>

            {student?.verification_type === 'student' && (
              <section
                id={aiAssessmentAnchorId}
                className="scroll-mt-4 rounded-xl border border-gray-100 bg-white px-4 py-4"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <AiSparkleIcon className="h-4 w-4 shrink-0 text-[#FF6F61]" />
                  AI Assessment
                </h3>
                <button
                  type="button"
                  onClick={() => void requestAiAssessment()}
                  disabled={aiLoading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6F61] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e85d52] disabled:opacity-60"
                >
                  {aiLoading ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      Assessing student profile…
                    </span>
                  ) : (
                    <>
                      <AiSparkleIcon className="h-4 w-4 shrink-0 text-white" />
                      Get AI assessment
                    </>
                  )}
                </button>
                {aiError && (
                  <p className="mt-2 text-center text-xs text-gray-500">Assessment unavailable. Please try again.</p>
                )}
                {aiAssessment && (
                  <div className="mt-3 rounded-xl border border-stone-200/90 bg-[#FFF8F0] px-3 py-3 text-left text-sm leading-relaxed text-gray-800">
                    <p className="whitespace-pre-wrap">{aiAssessment}</p>
                    <p className="mt-3 text-[11px] leading-snug text-gray-500">
                      This assessment is AI-generated and is intended as a guide only. The landlord is responsible for
                      making their own decision.
                    </p>
                  </div>
                )}
              </section>
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
