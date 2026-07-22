import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { runVisaDocUpload } from '../../../lib/runVisaDocUpload'
import { StudentVerificationDocPick } from '../StudentVerificationDocPick'
import { isVisaRouteSectionComplete } from '../../../lib/renterRouteSection'
import { WEEKLY_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import {
  renterFieldClass,
  RENTER_SAVE_WRITE_FAILURE,
  visaRouteSectionFieldErrors,
} from '../../../lib/renterProfileFieldValidation'
import {
  verificationDocOnFile,
  verificationDocReplaceAllowed,
  verificationDocRowSlot,
} from '../../../lib/verificationItemState'
import { RenterProfileVerificationRow } from './RenterProfileVerificationRow'
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
  renterSaveBtnClass,
  renterSelectClass,
  renterSuccessFlashClass,
} from '../../../lib/renterProfileFormClasses'

const VISA_ROUTE_HINT_LABELS = {
  visaStatus: 'visa status',
  visaSubclass: 'visa subclass',
  visaExpiry: 'visa expiry date',
  incomeBand: 'weekly income band',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

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
  } = useRenterProfileSectionValidation(VISA_ROUTE_HINT_LABELS)
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
    beginSaveAttempt()

    const errors = visaRouteSectionFieldErrors({ visaStatus, visaSubclass, visaExpiry, incomeBand })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
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
      setSaveError(err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE)
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isVisaRouteSectionComplete(profile)

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridClass}>
      <RenterProfileSectionErrorBanner message={sectionError} />
      <div className={renterFieldWrapClass}>
        <label htmlFor="rv-status" className={renterLabelClass}>
          Visa status
        </label>
        <select
          id="rv-status"
          value={visaStatus}
          onChange={(e) => {
            setVisaStatus(e.target.value)
            clearFieldError('visaStatus')
          }}
          className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.visaStatus))}
          aria-invalid={fieldErrors.visaStatus ? true : undefined}
          aria-describedby={fieldErrors.visaStatus ? 'rv-status-error' : undefined}
        >
          {VISA_STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RenterProfileFieldErrorMsg id="rv-status-error" message={fieldErrors.visaStatus} />
      </div>

      <div className={renterFieldWrapClass}>
        <label htmlFor="rv-subclass" className={renterLabelClass}>
          Visa subclass
        </label>
        <input
          id="rv-subclass"
          value={visaSubclass}
          onChange={(e) => {
            setVisaSubclass(e.target.value)
            clearFieldError('visaSubclass')
          }}
          placeholder="e.g. 417"
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.visaSubclass))}
          aria-invalid={fieldErrors.visaSubclass ? true : undefined}
          aria-describedby={fieldErrors.visaSubclass ? 'rv-subclass-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rv-subclass-error" message={fieldErrors.visaSubclass} />
      </div>

      <div className={renterFieldWrapClass}>
        <label htmlFor="rv-expiry" className={renterLabelClass}>
          Visa expiry date
        </label>
        <input
          id="rv-expiry"
          type="date"
          value={visaExpiry}
          onChange={(e) => {
            setVisaExpiry(e.target.value)
            clearFieldError('visaExpiry')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.visaExpiry))}
          aria-invalid={fieldErrors.visaExpiry ? true : undefined}
          aria-describedby={fieldErrors.visaExpiry ? 'rv-expiry-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rv-expiry-error" message={fieldErrors.visaExpiry} />
      </div>

      <div className={`${renterFieldWrapClass} ${renterFullWidthClass}`}>
        <span id="rv-visa-doc-label" className={renterLabelClass}>
          Visa document
        </span>
        <input
          ref={visaInputRef}
          id="rv-visa-doc-input"
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          aria-label="Upload visa document"
        />
        {hasVisaDoc && visaFileName && visaSlot ? (
          <div role="group" aria-labelledby="rv-visa-doc-label">
            <RenterProfileVerificationRow
              value={visaFileName}
              rightSlot={visaSlot}
              onAction={visaSlot.kind === 'action' ? () => visaInputRef.current?.click() : undefined}
              actionDisabled={uploading}
            />
          </div>
        ) : (
          <StudentVerificationDocPick
            busy={uploading}
            label="Upload file"
            onPickClick={() => visaInputRef.current?.click()}
            error={uploadError}
            variant="renter-profile"
            pickId="rv-visa-doc-pick"
            ariaLabelledBy="rv-visa-doc-label"
          />
        )}
      </div>

      <h3 className={renterFieldGroupHeadingClass}>Funding</h3>

      <div className={renterFieldWrapClass}>
        <label htmlFor="rv-income" className={renterLabelClass}>
          Income band
        </label>
        <select
          id="rv-income"
          value={incomeBand}
          onChange={(e) => {
            setIncomeBand(e.target.value)
            clearFieldError('incomeBand')
          }}
          className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.incomeBand))}
          aria-invalid={fieldErrors.incomeBand ? true : undefined}
          aria-describedby={fieldErrors.incomeBand ? 'rv-income-error' : undefined}
        >
          <option value="">Select income band</option>
          {WEEKLY_INCOME_BAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RenterProfileFieldErrorMsg id="rv-income-error" message={fieldErrors.incomeBand} />
      </div>

      <RenterProfileWriteError message={saveError} />

      {routeComplete ? (
        <p className={renterSuccessFlashClass} role="status">
          Visa section complete.
        </p>
      ) : null}

      <div className={renterFormActionsColumnClass}>
        <RenterProfileSaveHint message={sectionSaveHint} />
        <button type="submit" disabled={saving} className={renterSaveBtnClass}>
          {saving ? 'Saving…' : 'Save section'}
        </button>
      </div>
    </form>
  )
}
