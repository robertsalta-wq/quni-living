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
import { RenterProfileVerificationRow } from './RenterProfileVerificationRow'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type DocUploadApi = ReturnType<typeof useStudentVerificationDocUpload>

const labelClass = 'renter-profile-field-label'
const inputClass = 'renter-profile-input'
const selectClass = 'renter-profile-select'

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
}

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

export function RenterStudentRouteSection({ profile, userId, onRefresh, docUpload }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'student-route')
  const { universities: refUniversities } = useUniversityCampusReference('full')
  const { enrolDoc, enrolUploading, enrolUploadError, pickEnrolFile } = docUpload

  const [universityId, setUniversityId] = useState(profile.university_id ?? '')
  const [campusId, setCampusId] = useState(profile.campus_id ?? '')
  const [course, setCourse] = useState(profile.course?.trim() ?? '')
  const [studyLevel, setStudyLevel] = useState(profile.study_level?.trim() ?? '')
  const [incomeBand, setIncomeBand] = useState(profile.income_band ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    setSaveError(null)

    if (!universityId.trim()) {
      setSaveError('Please select your university.')
      return
    }
    if (!course.trim()) {
      setSaveError('Please enter your course or degree.')
      return
    }
    if (!studyLevel) {
      setSaveError('Please select your year of study.')
      return
    }
    if (!incomeBand.trim()) {
      setSaveError('Please select your weekly income band.')
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
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save study details.')
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isStudentRouteSectionComplete(profile)
  const enrolComplete = docStepComplete(enrolDoc)
  const enrolFileName = enrolDoc?.displayFileName?.trim()
  const enrolSlot = enrolComplete && enrolFileName ? verificationDocRowSlot(profile, 'enrolment') : null

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid">
      <div style={{ gridColumn: '1 / -1' }}>
        <UniversityCampusSelect
          universityId={universityId || null}
          campusId={campusId || null}
          onUniversityChange={(id) => {
            setUniversityId(id)
            setCampusId('')
          }}
          onCampusChange={setCampusId}
          referenceScope="full"
          required
          showState
          labelClassName={labelClass}
          universitySelectClassName={selectClass}
          campusSelectClassName={selectClass}
          universityIdAttr="rs-uni"
          campusIdAttr="rs-campus"
        />
      </div>

      <div className="renter-profile-field">
        <label htmlFor="rs-course" className={labelClass}>
          Course / degree
        </label>
        <input
          id="rs-course"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="e.g. Bachelor of Commerce"
          className={inputClass}
        />
      </div>

      <div className="renter-profile-field">
        <label htmlFor="rs-study" className={labelClass}>
          Year of study
        </label>
        <select
          id="rs-study"
          value={studyLevel}
          onChange={(e) => setStudyLevel(e.target.value)}
          className={selectClass}
        >
          <option value="">Select</option>
          {STUDY_LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="renter-profile-field">
        <label htmlFor="rs-income" className={labelClass}>
          Income band
        </label>
        <select
          id="rs-income"
          value={incomeBand}
          onChange={(e) => setIncomeBand(e.target.value)}
          className={selectClass}
        >
          <option value="">Select income band</option>
          {WEEKLY_INCOME_BAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="renter-profile-field" style={{ gridColumn: '1 / -1' }}>
        <span className={labelClass}>Proof of enrolment</span>
        <input ref={enrolInputRef} type="file" accept="image/*,application/pdf" className="sr-only" />
        {enrolComplete && enrolFileName && enrolSlot ? (
          <RenterProfileVerificationRow
            value={enrolFileName}
            rightSlot={enrolSlot}
            onAction={enrolSlot.kind === 'action' ? () => enrolInputRef.current?.click() : undefined}
            actionDisabled={enrolUploading}
          />
        ) : (
          <StudentVerificationDocPick
            busy={enrolUploading}
            label="Upload file"
            onPickClick={() => enrolInputRef.current?.click()}
            error={enrolUploadError}
            variant="renter-profile"
          />
        )}
      </div>

      {saveError ? (
        <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
          {saveError}
        </p>
      ) : null}

      {routeComplete ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          Study section complete.
        </p>
      ) : null}

      <div className="renter-profile-form-actions" style={{ gridColumn: '1 / -1' }}>
        <button type="submit" disabled={saving} className="renter-profile-btn-primary">
          {saving ? 'Saving…' : 'Save section'}
        </button>
      </div>
    </form>
  )
}
