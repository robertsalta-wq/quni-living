import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { geocodeFirstMatch } from '../../../lib/geocodeClient'
import { isWorkingRouteSectionComplete } from '../../../lib/renterRouteSection'
import { WEEKLY_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import { AU_WORKPLACE_STATES, workplaceGeocodeQueries } from '../../../lib/workplaceLocation'
import {
  workplaceLocationFieldsTouched,
  workplaceLocationUpdatePayload,
  type WorkplaceLocationFields,
} from '../../../lib/workplaceLocationSave'
import {
  renterFieldClass,
  RENTER_SAVE_WRITE_FAILURE,
  workingRouteSectionFieldErrors,
} from '../../../lib/renterProfileFieldValidation'
import {
  RenterProfileFieldErrorMsg,
  RenterProfileSaveHint,
  RenterProfileSectionErrorBanner,
  RenterProfileWriteError,
} from './RenterProfileValidationUi'
import {
  renterFieldGroupHeadingClass,
  renterFieldWrapClass,
  renterFormActionsColumnClass,
  renterFormGridClass,
  renterFullWidthClass,
  renterInputClass,
  renterLabelClass,
  renterNoteClass,
  renterSaveBtnClass,
  renterSelectClass,
  renterSuccessFlashClass,
} from '../../../lib/renterProfileFormClasses'

const WORKING_ROUTE_HINT_LABELS = {
  employmentStatus: 'employment status',
  employerName: 'employer name',
  jobTitle: 'job title',
  employmentType: 'employment type',
  incomeBand: 'weekly income band',
  workplaceSuburb: 'work location suburb',
  workplaceState: 'work location state',
  workplacePostcode: 'work location postcode',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'casual', label: 'Casual' },
  { value: 'contract', label: 'Contract / fixed term' },
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contract', label: 'Contract' },
]

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
}

type WorkingRouteDraft = {
  employmentStatus: string
  employerName: string
  jobTitle: string
  employmentType: string
  incomeBand: string
  workplaceLabel: string
  workplaceAddress: string
  workplaceSuburb: string
  workplaceState: string
  workplacePostcode: string
}

function fieldsFromProfile(prof: StudentRow): WorkingRouteDraft {
  return {
    employmentStatus: prof.employment_status ?? '',
    employerName: prof.employer_name ?? '',
    jobTitle: prof.job_title ?? '',
    employmentType: prof.employment_type ?? '',
    incomeBand: prof.income_band ?? '',
    workplaceLabel: prof.workplace_label ?? '',
    workplaceAddress: prof.workplace_address ?? '',
    workplaceSuburb: prof.workplace_suburb ?? '',
    workplaceState: prof.workplace_state ?? 'NSW',
    workplacePostcode: prof.workplace_postcode ?? '',
  }
}

export function RenterWorkingRouteSection({ profile, userId, onSaved }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'working-route')
  const [employmentStatus, setEmploymentStatus] = useState(profile.employment_status ?? '')
  const [employerName, setEmployerName] = useState(profile.employer_name ?? '')
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? '')
  const [employmentType, setEmploymentType] = useState(profile.employment_type ?? '')
  const [incomeBand, setIncomeBand] = useState(profile.income_band ?? '')
  const [workplaceLabel, setWorkplaceLabel] = useState(profile.workplace_label ?? '')
  const [workplaceAddress, setWorkplaceAddress] = useState(profile.workplace_address ?? '')
  const [workplaceSuburb, setWorkplaceSuburb] = useState(profile.workplace_suburb ?? '')
  const [workplaceState, setWorkplaceState] = useState(profile.workplace_state ?? 'NSW')
  const [workplacePostcode, setWorkplacePostcode] = useState(profile.workplace_postcode ?? '')
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
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
  } = useRenterProfileSectionValidation(WORKING_ROUTE_HINT_LABELS)

  const applyFields = (fields: WorkingRouteDraft) => {
    setEmploymentStatus(fields.employmentStatus)
    setEmployerName(fields.employerName)
    setJobTitle(fields.jobTitle)
    setEmploymentType(fields.employmentType)
    setIncomeBand(fields.incomeBand)
    setWorkplaceLabel(fields.workplaceLabel)
    setWorkplaceAddress(fields.workplaceAddress)
    setWorkplaceSuburb(fields.workplaceSuburb)
    setWorkplaceState(fields.workplaceState)
    setWorkplacePostcode(fields.workplacePostcode)
  }

  useEffect(() => {
    if (restoreDraft<WorkingRouteDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({
      employmentStatus,
      employerName,
      jobTitle,
      employmentType,
      incomeBand,
      workplaceLabel,
      workplaceAddress,
      workplaceSuburb,
      workplaceState,
      workplacePostcode,
    })
  }, [
    employmentStatus,
    employerName,
    jobTitle,
    employmentType,
    incomeBand,
    workplaceLabel,
    workplaceAddress,
    workplaceSuburb,
    workplaceState,
    workplacePostcode,
    syncDraft,
  ])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()
    setSaveNotice(null)

    const workplaceFields: WorkplaceLocationFields = {
      label: workplaceLabel,
      address: workplaceAddress,
      suburb: workplaceSuburb,
      state: workplaceState,
      postcode: workplacePostcode,
    }

    const errors = workingRouteSectionFieldErrors(
      { employmentStatus, employerName, jobTitle, employmentType, incomeBand },
      workplaceFields,
    )
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      return
    }

    setSaving(true)
    try {
      const employmentPatch = {
        employment_status: employmentStatus.trim(),
        employer_name: employerName.trim(),
        job_title: jobTitle.trim(),
        employment_type: employmentType.trim(),
        income_band: incomeBand.trim(),
      }

      const { error: employmentError } = await withSentryMonitoring('RenterWorkingRouteSection/save', () =>
        supabase.from('student_profiles').update(employmentPatch).eq('user_id', userId),
      )
      if (employmentError) throw employmentError

      if (workplaceLocationFieldsTouched(workplaceFields)) {
        const sub = workplaceSuburb.trim()
        const st = workplaceState.trim().toUpperCase()
        const pc = workplacePostcode.trim()
        const queries = workplaceGeocodeQueries({
          address: workplaceAddress.trim() || null,
          suburb: sub,
          state: st,
          postcode: pc,
        })
        if (queries.length === 0) {
          setSaveError('Enter a valid Australian suburb, state and postcode.')
          return
        }

        const pt = await geocodeFirstMatch(queries)
        const nowIso = new Date().toISOString()
        const workplacePatch = workplaceLocationUpdatePayload(
          { label: workplaceLabel, address: workplaceAddress, suburb: sub, state: st, postcode: pc },
          pt,
          nowIso,
        )

        const { error: workplaceError } = await supabase
          .from('student_profiles')
          .update(workplacePatch)
          .eq('user_id', userId)

        if (workplaceError) {
          if (/column|schema cache/i.test(workplaceError.message)) {
            setSaveError(
              'Work location needs a database update. Run supabase/migrations/20260602120000_workplace_location_and_near_point.sql in Supabase.',
            )
          } else {
            setSaveError(workplaceError.message)
          }
          return
        }

        if (!pt) {
          setSaveNotice(
            'Work location saved. We could not place it on the map — distance sorting may be limited until the address can be verified.',
          )
        }
      }

      const savedFields: WorkingRouteDraft = {
        employmentStatus: employmentPatch.employment_status,
        employerName: employmentPatch.employer_name,
        jobTitle: employmentPatch.job_title,
        employmentType: employmentPatch.employment_type,
        incomeBand: employmentPatch.income_band,
        workplaceLabel: workplaceLabel.trim(),
        workplaceAddress: workplaceAddress.trim(),
        workplaceSuburb: workplaceSuburb.trim(),
        workplaceState: workplaceState.trim().toUpperCase(),
        workplacePostcode: workplacePostcode.trim(),
      }
      clearDraft()
      setBaseline(savedFields)
      await onSaved()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE)
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isWorkingRouteSectionComplete(profile)

  return (
    <>
      <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridClass}>
        <RenterProfileSectionErrorBanner message={sectionError} />
        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-status" className={renterLabelClass}>
            Employment status
          </label>
          <select
            id="rw-status"
            value={employmentStatus}
            onChange={(e) => {
              setEmploymentStatus(e.target.value)
              clearFieldError('employmentStatus')
            }}
            className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.employmentStatus))}
            aria-invalid={fieldErrors.employmentStatus ? true : undefined}
            aria-describedby={fieldErrors.employmentStatus ? 'rw-status-error' : undefined}
          >
            {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <RenterProfileFieldErrorMsg id="rw-status-error" message={fieldErrors.employmentStatus} />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-employer" className={renterLabelClass}>
            Employer name
          </label>
          <input
            id="rw-employer"
            value={employerName}
            onChange={(e) => {
              setEmployerName(e.target.value)
              clearFieldError('employerName')
            }}
            placeholder="e.g. Acme Pty Ltd"
            className={renterFieldClass(renterInputClass, Boolean(fieldErrors.employerName))}
            aria-invalid={fieldErrors.employerName ? true : undefined}
            aria-describedby={fieldErrors.employerName ? 'rw-employer-error' : undefined}
          />
          <RenterProfileFieldErrorMsg id="rw-employer-error" message={fieldErrors.employerName} />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-title" className={renterLabelClass}>
            Job title
          </label>
          <input
            id="rw-title"
            value={jobTitle}
            onChange={(e) => {
              setJobTitle(e.target.value)
              clearFieldError('jobTitle')
            }}
            placeholder="e.g. Software engineer"
            className={renterFieldClass(renterInputClass, Boolean(fieldErrors.jobTitle))}
            aria-invalid={fieldErrors.jobTitle ? true : undefined}
            aria-describedby={fieldErrors.jobTitle ? 'rw-title-error' : undefined}
          />
          <RenterProfileFieldErrorMsg id="rw-title-error" message={fieldErrors.jobTitle} />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-type" className={renterLabelClass}>
            Employment type
          </label>
          <select
            id="rw-type"
            value={employmentType}
            onChange={(e) => {
              setEmploymentType(e.target.value)
              clearFieldError('employmentType')
            }}
            className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.employmentType))}
            aria-invalid={fieldErrors.employmentType ? true : undefined}
            aria-describedby={fieldErrors.employmentType ? 'rw-type-error' : undefined}
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <RenterProfileFieldErrorMsg id="rw-type-error" message={fieldErrors.employmentType} />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-income" className={renterLabelClass}>
            Income band
          </label>
          <select
            id="rw-income"
            value={incomeBand}
            onChange={(e) => {
              setIncomeBand(e.target.value)
              clearFieldError('incomeBand')
            }}
            className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.incomeBand))}
            aria-invalid={fieldErrors.incomeBand ? true : undefined}
            aria-describedby={fieldErrors.incomeBand ? 'rw-income-error' : undefined}
          >
            <option value="">Select income band</option>
            {WEEKLY_INCOME_BAND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <RenterProfileFieldErrorMsg id="rw-income-error" message={fieldErrors.incomeBand} />
        </div>

        <h3 className={renterFieldGroupHeadingClass}>Work location (optional)</h3>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-wl-label" className={renterLabelClass}>
            Label
          </label>
          <input
            id="rw-wl-label"
            value={workplaceLabel}
            onChange={(e) => setWorkplaceLabel(e.target.value)}
            placeholder="e.g. Martin Place office"
            className={renterInputClass}
          />
        </div>

        <div className={`${renterFieldWrapClass} ${renterFullWidthClass}`}>
          <label htmlFor="rw-wl-addr" className={renterLabelClass}>
            Street address
          </label>
          <input
            id="rw-wl-addr"
            value={workplaceAddress}
            onChange={(e) => setWorkplaceAddress(e.target.value)}
            placeholder="e.g. 1 Martin Place"
            className={renterInputClass}
            autoComplete="street-address"
          />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-wl-sub" className={renterLabelClass}>
            Suburb
          </label>
          <input
            id="rw-wl-sub"
            value={workplaceSuburb}
            onChange={(e) => {
              setWorkplaceSuburb(e.target.value)
              clearFieldError('workplaceSuburb')
            }}
            className={renterFieldClass(renterInputClass, Boolean(fieldErrors.workplaceSuburb))}
            autoComplete="address-level2"
            aria-invalid={fieldErrors.workplaceSuburb ? true : undefined}
            aria-describedby={fieldErrors.workplaceSuburb ? 'rw-wl-sub-error' : undefined}
          />
          <RenterProfileFieldErrorMsg id="rw-wl-sub-error" message={fieldErrors.workplaceSuburb} />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-wl-st" className={renterLabelClass}>
            State
          </label>
          <select
            id="rw-wl-st"
            value={workplaceState}
            onChange={(e) => {
              setWorkplaceState(e.target.value)
              clearFieldError('workplaceState')
            }}
            className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.workplaceState))}
            aria-invalid={fieldErrors.workplaceState ? true : undefined}
            aria-describedby={fieldErrors.workplaceState ? 'rw-wl-st-error' : undefined}
          >
            {AU_WORKPLACE_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <RenterProfileFieldErrorMsg id="rw-wl-st-error" message={fieldErrors.workplaceState} />
        </div>

        <div className={renterFieldWrapClass}>
          <label htmlFor="rw-wl-pc" className={renterLabelClass}>
            Postcode
          </label>
          <input
            id="rw-wl-pc"
            value={workplacePostcode}
            onChange={(e) => {
              setWorkplacePostcode(e.target.value)
              clearFieldError('workplacePostcode')
            }}
            inputMode="numeric"
            className={renterFieldClass(renterInputClass, Boolean(fieldErrors.workplacePostcode))}
            autoComplete="postal-code"
            aria-invalid={fieldErrors.workplacePostcode ? true : undefined}
            aria-describedby={fieldErrors.workplacePostcode ? 'rw-wl-pc-error' : undefined}
          />
          <RenterProfileFieldErrorMsg id="rw-wl-pc-error" message={fieldErrors.workplacePostcode} />
        </div>

        <RenterProfileWriteError message={saveError} />

        {saveNotice && !saveError ? (
          <p className={`${renterNoteClass} ${renterFullWidthClass} !mt-0`} role="status">
            {saveNotice}
          </p>
        ) : null}

        <div className={renterFormActionsColumnClass}>
          <RenterProfileSaveHint message={sectionSaveHint} />
          <button type="submit" disabled={saving} className={renterSaveBtnClass}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
      </form>

      {routeComplete ? (
        <p className={renterSuccessFlashClass} role="status">
          Employment section complete.
        </p>
      ) : null}
    </>
  )
}
