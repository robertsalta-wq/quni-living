import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { runVisaDocUpload } from '../../../lib/runVisaDocUpload'
import { StudentVerificationDocPick } from '../StudentVerificationDocPick'
import { isVisaRouteSectionComplete } from '../../../lib/renterRouteSection'
import { WEEKLY_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import {
  verificationDocOnFile,
  verificationDocReplaceAllowed,
  verificationDocRowSlot,
} from '../../../lib/verificationItemState'
import { RenterProfileVerificationRow } from './RenterProfileVerificationRow'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const labelClass = 'renter-profile-field-label'
const inputClass = 'renter-profile-input'
const selectClass = 'renter-profile-select'

const VISA_STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  { value: 'valid', label: 'Valid visa' },
  { value: 'expiring_soon', label: 'Expiring within 3 months' },
  { value: 'applied', label: 'Application in progress' },
]

type Props = {
  profile: StudentRow
  userId: string
  onRefresh: () => Promise<void>
}

type VisaRouteDraft = {
  visaStatus: string
  visaSubclass: string
  visaExpiry: string
  incomeBand: string
}

function fieldsFromProfile(prof: StudentRow): VisaRouteDraft {
  return {
    visaStatus: prof.visa_status ?? '',
    visaSubclass: prof.visa_subclass ?? '',
    visaExpiry: prof.visa_expiry ? prof.visa_expiry.slice(0, 10) : '',
    incomeBand: prof.income_band ?? '',
  }
}

export function RenterVisaRouteSection({ profile, userId, onRefresh }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'visa-route')
  const [visaStatus, setVisaStatus] = useState(profile.visa_status ?? '')
  const [visaSubclass, setVisaSubclass] = useState(profile.visa_subclass ?? '')
  const [visaExpiry, setVisaExpiry] = useState(profile.visa_expiry ? profile.visa_expiry.slice(0, 10) : '')
  const [incomeBand, setIncomeBand] = useState(profile.income_band ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const visaInputRef = useRef<HTMLInputElement>(null)

  const applyFields = (fields: VisaRouteDraft) => {
    setVisaStatus(fields.visaStatus)
    setVisaSubclass(fields.visaSubclass)
    setVisaExpiry(fields.visaExpiry)
    setIncomeBand(fields.incomeBand)
  }

  useEffect(() => {
    if (restoreDraft<VisaRouteDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({ visaStatus, visaSubclass, visaExpiry, incomeBand })
  }, [visaStatus, visaSubclass, visaExpiry, incomeBand, syncDraft])

  useEffect(() => {
    const el = visaInputRef.current
    if (!el) return
    const handler = async () => {
      const file = el.files?.[0]
      el.value = ''
      if (!file) return
      setUploadError(null)
      if (verificationDocOnFile(profile, 'visa') && !verificationDocReplaceAllowed(profile, 'visa')) {
        setUploadError('This document is verified or in review and cannot be replaced.')
        return
      }
      setUploading(true)
      try {
        const result = await runVisaDocUpload(supabase, userId, file)
        if (!result.ok) {
          setUploadError(result.message)
          return
        }
        await onRefresh()
      } finally {
        setUploading(false)
      }
    }
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [onRefresh, profile, userId])

  const hasVisaDoc = verificationDocOnFile(profile, 'visa')
  const visaFileName = profile.visa_doc_name?.trim() || profile.visa_doc_url?.trim().split('/').pop()
  const visaSlot = hasVisaDoc && visaFileName ? verificationDocRowSlot(profile, 'visa') : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaveError(null)

    if (!visaStatus.trim()) {
      setSaveError('Please select your visa status.')
      return
    }
    if (!visaSubclass.trim()) {
      setSaveError('Visa subclass is required (e.g. 417, 462).')
      return
    }
    if (!visaExpiry.trim()) {
      setSaveError('Visa expiry date is required.')
      return
    }
    if (!incomeBand.trim()) {
      setSaveError('Please select your weekly income band.')
      return
    }

    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterVisaRouteSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            visa_status: visaStatus.trim(),
            visa_subclass: visaSubclass.trim(),
            visa_expiry: visaExpiry.trim(),
            income_band: incomeBand.trim(),
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: VisaRouteDraft = {
        visaStatus: visaStatus.trim(),
        visaSubclass: visaSubclass.trim(),
        visaExpiry: visaExpiry.trim(),
        incomeBand: incomeBand.trim(),
      }
      clearDraft()
      setBaseline(savedFields)
      await onRefresh()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save visa details.')
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isVisaRouteSectionComplete(profile)

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid">
      <div className="renter-profile-field">
        <label htmlFor="rv-status" className={labelClass}>
          Visa status
        </label>
        <select
          id="rv-status"
          value={visaStatus}
          onChange={(e) => setVisaStatus(e.target.value)}
          className={selectClass}
        >
          {VISA_STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="renter-profile-field">
        <label htmlFor="rv-subclass" className={labelClass}>
          Visa subclass
        </label>
        <input
          id="rv-subclass"
          value={visaSubclass}
          onChange={(e) => setVisaSubclass(e.target.value)}
          placeholder="e.g. 417"
          className={inputClass}
        />
      </div>

      <div className="renter-profile-field">
        <label htmlFor="rv-expiry" className={labelClass}>
          Visa expiry date
        </label>
        <input
          id="rv-expiry"
          type="date"
          value={visaExpiry}
          onChange={(e) => setVisaExpiry(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="renter-profile-field" style={{ gridColumn: '1 / -1' }}>
        <span className={labelClass}>Visa document</span>
        <input ref={visaInputRef} type="file" accept="image/*,application/pdf" className="sr-only" />
        {hasVisaDoc && visaFileName && visaSlot ? (
          <RenterProfileVerificationRow
            value={visaFileName}
            rightSlot={visaSlot}
            onAction={visaSlot.kind === 'action' ? () => visaInputRef.current?.click() : undefined}
            actionDisabled={uploading}
          />
        ) : (
          <StudentVerificationDocPick
            busy={uploading}
            label="Upload file"
            onPickClick={() => visaInputRef.current?.click()}
            error={uploadError}
            variant="renter-profile"
          />
        )}
      </div>

      <h3 className="renter-profile-field-group-heading">Funding</h3>

      <div className="renter-profile-field">
        <label htmlFor="rv-income" className={labelClass}>
          Income band
        </label>
        <select
          id="rv-income"
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

      {saveError ? (
        <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
          {saveError}
        </p>
      ) : null}

      {routeComplete ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          Visa section complete.
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
