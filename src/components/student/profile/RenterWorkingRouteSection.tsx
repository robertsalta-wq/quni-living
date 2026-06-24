import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { geocodeFirstMatch } from '../../../lib/geocodeClient'
import { isWorkingRouteSectionComplete } from '../../../lib/renterRouteSection'
import { WEEKLY_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { AU_WORKPLACE_STATES, workplaceGeocodeQueries } from '../../../lib/workplaceLocation'
import {
  validateWorkplaceLocationFields,
  workplaceLocationFieldsTouched,
  workplaceLocationUpdatePayload,
  type WorkplaceLocationFields,
} from '../../../lib/workplaceLocationSave'

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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    setSaveError(null)
    setSaveNotice(null)

    if (!employmentStatus.trim()) {
      setSaveError('Please select your employment status.')
      return
    }
    if (!employerName.trim()) {
      setSaveError('Employer name is required.')
      return
    }
    if (!jobTitle.trim()) {
      setSaveError('Job title is required.')
      return
    }
    if (!employmentType.trim()) {
      setSaveError('Please select your employment type.')
      return
    }
    if (!incomeBand.trim()) {
      setSaveError('Please select your weekly income band.')
      return
    }

    const workplaceFields: WorkplaceLocationFields = {
      label: workplaceLabel,
      address: workplaceAddress,
      suburb: workplaceSuburb,
      state: workplaceState,
      postcode: workplacePostcode,
    }

    if (workplaceLocationFieldsTouched(workplaceFields)) {
      const workplaceError = validateWorkplaceLocationFields(workplaceFields)
      if (workplaceError) {
        setSaveError(workplaceError)
        return
      }
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
      setSaveError(err instanceof Error ? err.message : 'Could not save employment details.')
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isWorkingRouteSectionComplete(profile)

  return (
    <>
      <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid">
        <div className="renter-profile-field">
          <label htmlFor="rw-status" className="renter-profile-field-label">
            Employment status
          </label>
          <select
            id="rw-status"
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
            className="renter-profile-select"
          >
            {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-employer" className="renter-profile-field-label">
            Employer name
          </label>
          <input
            id="rw-employer"
            value={employerName}
            onChange={(e) => setEmployerName(e.target.value)}
            placeholder="e.g. Acme Pty Ltd"
            className="renter-profile-input"
          />
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-title" className="renter-profile-field-label">
            Job title
          </label>
          <input
            id="rw-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Software engineer"
            className="renter-profile-input"
          />
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-type" className="renter-profile-field-label">
            Employment type
          </label>
          <select
            id="rw-type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="renter-profile-select"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-income" className="renter-profile-field-label">
            Income band
          </label>
          <select
            id="rw-income"
            value={incomeBand}
            onChange={(e) => setIncomeBand(e.target.value)}
            className="renter-profile-select"
          >
            <option value="">Select income band</option>
            {WEEKLY_INCOME_BAND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <h3 className="renter-profile-field-group-heading">Work location (optional)</h3>

        <div className="renter-profile-field">
          <label htmlFor="rw-wl-label" className="renter-profile-field-label">
            Label
          </label>
          <input
            id="rw-wl-label"
            value={workplaceLabel}
            onChange={(e) => setWorkplaceLabel(e.target.value)}
            placeholder="e.g. Martin Place office"
            className="renter-profile-input"
          />
        </div>

        <div className="renter-profile-field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="rw-wl-addr" className="renter-profile-field-label">
            Street address
          </label>
          <input
            id="rw-wl-addr"
            value={workplaceAddress}
            onChange={(e) => setWorkplaceAddress(e.target.value)}
            placeholder="e.g. 1 Martin Place"
            className="renter-profile-input"
            autoComplete="street-address"
          />
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-wl-sub" className="renter-profile-field-label">
            Suburb
          </label>
          <input
            id="rw-wl-sub"
            value={workplaceSuburb}
            onChange={(e) => setWorkplaceSuburb(e.target.value)}
            className="renter-profile-input"
            autoComplete="address-level2"
          />
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-wl-st" className="renter-profile-field-label">
            State
          </label>
          <select
            id="rw-wl-st"
            value={workplaceState}
            onChange={(e) => setWorkplaceState(e.target.value)}
            className="renter-profile-select"
          >
            {AU_WORKPLACE_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="renter-profile-field">
          <label htmlFor="rw-wl-pc" className="renter-profile-field-label">
            Postcode
          </label>
          <input
            id="rw-wl-pc"
            value={workplacePostcode}
            onChange={(e) => setWorkplacePostcode(e.target.value)}
            inputMode="numeric"
            className="renter-profile-input"
            autoComplete="postal-code"
          />
        </div>

        {saveError ? (
          <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
            {saveError}
          </p>
        ) : null}

        {saveNotice && !saveError ? (
          <p className="renter-profile-note" style={{ gridColumn: '1 / -1', marginTop: 0 }} role="status">
            {saveNotice}
          </p>
        ) : null}

        <div className="renter-profile-form-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" disabled={saving} className="renter-profile-btn-primary">
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
      </form>

      {routeComplete ? (
        <p className="renter-profile-success-flash" role="status">
          Employment section complete.
        </p>
      ) : null}
    </>
  )
}
