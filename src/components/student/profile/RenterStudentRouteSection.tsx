import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import UniversityCampusSelect from '../../UniversityCampusSelect'
import { fetchCampusesForUniversityId } from '../../../lib/universityCampusReference'
import { useUniversityCampusReference } from '../../../hooks/useUniversityCampusReference'
import { StudentVerificationDocPick } from '../StudentVerificationDocPick'
import { docStepComplete } from '../../../lib/verificationDocSlot'
import { verificationDocRowSlot } from '../../../lib/verificationItemState'
import { STUDY_LEVEL_OPTIONS } from '../../../lib/studentOnboarding'
import type { useStudentVerificationDocUpload } from '../../../hooks/useStudentVerificationDocUpload'
import { isStudentRouteSectionComplete } from '../../../lib/renterRouteSection'
import { WEEKLY_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import {
  renterFieldClass,
  RENTER_SAVE_WRITE_FAILURE,
  studentRouteSectionFieldErrors,
} from '../../../lib/renterProfileFieldValidation'
import { RenterProfileVerificationRow } from './RenterProfileVerificationRow'
import {
  RenterProfileFieldErrorMsg,
  RenterProfileSaveHint,
  RenterProfileSectionErrorBanner,
  RenterProfileWriteError,
} from './RenterProfileValidationUi'
import {
  renterFieldWrapClass,
  renterFormActionsColumnClass,
  renterFormGridClass,
  renterFullWidthClass,
  renterInputClass,
  renterLabelClass,
  renterSaveBtnClass,
  renterSelectClass,
  renterSuccessFlashClass,
} from '../../../lib/renterProfileFormClasses'
import type { RenterSectionChromeActionsProps } from './renterSectionChromeActions'

const STUDENT_ROUTE_HINT_LABELS = {
  universityId: 'university',
  course: 'course or degree',
  studyLevel: 'year of study',
  incomeBand: 'weekly income band',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type DocUploadApi = ReturnType<typeof useStudentVerificationDocUpload>

function studyLevelToYear(level: string): number | null {
  const m: Record<string, number> = {
    year_1: 1,
    year_2: 2,
    year_3: 3,
    year_4: 4,
    postgraduate: 5,
    phd: 6,
  }
  return m[level] ?? null
}

type Props = {
  profile: StudentRow
  userId: string
  onRefresh: () => Promise<void>
  docUpload: DocUploadApi
} & RenterSectionChromeActionsProps

type StudentRouteDraft = {
  universityId: string
  campusId: string
  course: string
  studyLevel: string
  incomeBand: string
}

function fieldsFromProfile(prof: StudentRow): StudentRouteDraft {
  return {
    universityId: prof.university_id ?? '',
    campusId: prof.campus_id ?? '',
    course: prof.course?.trim() ?? '',
    studyLevel: prof.study_level?.trim() ?? '',
    incomeBand: prof.income_band ?? '',
  }
}

export function RenterStudentRouteSection({
  profile,
  userId,
  onRefresh,
  docUpload,
  actionsInChrome = false,
  onSaveAttemptEnd,
}: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'student-route')
  const { universities: refUniversities } = useUniversityCampusReference('full')
  const { enrolDoc, enrolUploading, enrolUploadError, pickEnrolFile } = docUpload

  const [universityId, setUniversityId] = useState(profile.university_id ?? '')
  const [campusId, setCampusId] = useState(profile.campus_id ?? '')
  const [course, setCourse] = useState(profile.course?.trim() ?? '')
  const [studyLevel, setStudyLevel] = useState(profile.study_level?.trim() ?? '')
  const [incomeBand, setIncomeBand] = useState(profile.income_band ?? '')
  const [saving, setSaving] = useState(false)
  const {
    fieldErrors,
    sectionError,
    sectionSaveHint,
    saveError,
    setSaveError,
    applyValidationErrors,
    clearFieldError,
    beginSaveAttempt,
  } = useRenterProfileSectionValidation(STUDENT_ROUTE_HINT_LABELS)

  const enrolInputRef = useRef<HTMLInputElement>(null)

  const applyFields = (fields: StudentRouteDraft) => {
    setUniversityId(fields.universityId)
    setCampusId(fields.campusId)
    setCourse(fields.course)
    setStudyLevel(fields.studyLevel)
    setIncomeBand(fields.incomeBand)
  }

  useEffect(() => {
    if (restoreDraft<StudentRouteDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({ universityId, campusId, course, studyLevel, incomeBand })
  }, [universityId, campusId, course, studyLevel, incomeBand, syncDraft])

  const bindEnrolPick = useCallback(() => {
    const el = enrolInputRef.current
    if (!el) return
    const handler = () => {
      const file = el.files?.[0]
      el.value = ''
      if (file) pickEnrolFile(file)
    }
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [pickEnrolFile])

  useEffect(() => bindEnrolPick(), [bindEnrolPick])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()

    const errors = studentRouteSectionFieldErrors({ universityId, course, studyLevel, incomeBand })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      onSaveAttemptEnd?.(false)
      return
    }

    let selectedCampusValid = !campusId
    if (campusId && universityId.trim()) {
      const slug = refUniversities.find((u) => u.id === universityId.trim())?.slug
      const rows = await fetchCampusesForUniversityId(universityId.trim(), slug ?? null, {
        onlyWithActiveListings: false,
      })
      selectedCampusValid = rows.some((c) => c.id === campusId)
    }

    const yearNum = studyLevelToYear(studyLevel)

    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterStudentRouteSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            university_id: universityId.trim(),
            campus_id: universityId && selectedCampusValid ? campusId || null : null,
            course: course.trim(),
            study_level: studyLevel,
            year_of_study: yearNum,
            income_band: incomeBand.trim(),
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: StudentRouteDraft = {
        universityId: universityId.trim(),
        campusId: campusId,
        course: course.trim(),
        studyLevel,
        incomeBand: incomeBand.trim(),
      }
      clearDraft()
      setBaseline(savedFields)
      await onRefresh()
      onSaveAttemptEnd?.(true)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE)
      onSaveAttemptEnd?.(false)
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isStudentRouteSectionComplete(profile)
  const enrolComplete = docStepComplete(enrolDoc)
  const enrolFileName = enrolDoc?.displayFileName?.trim()
  const enrolSlot = enrolComplete && enrolFileName ? verificationDocRowSlot(profile, 'enrolment') : null

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridClass}>
      <RenterProfileSectionErrorBanner message={sectionError} />
      <div className={renterFullWidthClass}>
        <UniversityCampusSelect
          universityId={universityId || null}
          campusId={campusId || null}
          onUniversityChange={(id) => {
            setUniversityId(id)
            setCampusId('')
            clearFieldError('universityId')
          }}
          onCampusChange={setCampusId}
          referenceScope="full"
          required
          showState
          labelClassName={renterLabelClass}
          universitySelectClassName={renterFieldClass(renterSelectClass, Boolean(fieldErrors.universityId))}
          campusSelectClassName={renterSelectClass}
          universityIdAttr="rs-uni"
          campusIdAttr="rs-campus"
        />
        <RenterProfileFieldErrorMsg id="rs-uni-error" message={fieldErrors.universityId} />
      </div>

      <div className={renterFieldWrapClass}>
        <label htmlFor="rs-course" className={renterLabelClass}>
          Course / degree
        </label>
        <input
          id="rs-course"
          value={course}
          onChange={(e) => {
            setCourse(e.target.value)
            clearFieldError('course')
          }}
          placeholder="e.g. Bachelor of Commerce"
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.course))}
          aria-invalid={fieldErrors.course ? true : undefined}
          aria-describedby={fieldErrors.course ? 'rs-course-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rs-course-error" message={fieldErrors.course} />
      </div>

      <div className={renterFieldWrapClass}>
        <label htmlFor="rs-study" className={renterLabelClass}>
          Year of study
        </label>
        <select
          id="rs-study"
          value={studyLevel}
          onChange={(e) => {
            setStudyLevel(e.target.value)
            clearFieldError('studyLevel')
          }}
          className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.studyLevel))}
          aria-invalid={fieldErrors.studyLevel ? true : undefined}
          aria-describedby={fieldErrors.studyLevel ? 'rs-study-error' : undefined}
        >
          <option value="">Select</option>
          {STUDY_LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RenterProfileFieldErrorMsg id="rs-study-error" message={fieldErrors.studyLevel} />
      </div>

      <div className={renterFieldWrapClass}>
        <label htmlFor="rs-income" className={renterLabelClass}>
          Income band
        </label>
        <select
          id="rs-income"
          value={incomeBand}
          onChange={(e) => {
            setIncomeBand(e.target.value)
            clearFieldError('incomeBand')
          }}
          className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.incomeBand))}
          aria-invalid={fieldErrors.incomeBand ? true : undefined}
          aria-describedby={fieldErrors.incomeBand ? 'rs-income-error' : undefined}
        >
          <option value="">Select income band</option>
          {WEEKLY_INCOME_BAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RenterProfileFieldErrorMsg id="rs-income-error" message={fieldErrors.incomeBand} />
      </div>

      <div className={`${renterFieldWrapClass} ${renterFullWidthClass}`}>
        <span id="rs-enrol-label" className={renterLabelClass}>
          Proof of enrolment
        </span>
        <input
          ref={enrolInputRef}
          id="rs-enrol-input"
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          aria-label="Upload proof of enrolment"
        />
        {enrolComplete && enrolFileName && enrolSlot ? (
          <div role="group" aria-labelledby="rs-enrol-label">
            <RenterProfileVerificationRow
              value={enrolFileName}
              rightSlot={enrolSlot}
              onAction={enrolSlot.kind === 'action' ? () => enrolInputRef.current?.click() : undefined}
              actionDisabled={enrolUploading}
            />
          </div>
        ) : (
          <StudentVerificationDocPick
            busy={enrolUploading}
            label="Upload file"
            onPickClick={() => enrolInputRef.current?.click()}
            error={enrolUploadError}
            variant="renter-profile"
            pickId="rs-enrol-pick"
            ariaLabelledBy="rs-enrol-label"
          />
        )}
      </div>

      <RenterProfileWriteError message={saveError} />

      {routeComplete ? (
        <p className={renterSuccessFlashClass} role="status">
          Study section complete.
        </p>
      ) : null}

      <div className={renterFormActionsColumnClass}>
        <RenterProfileSaveHint message={sectionSaveHint} />
        {!actionsInChrome ? (
          <button type="submit" disabled={saving} className={renterSaveBtnClass}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
        ) : null}
      </div>
    </form>
  )
}
