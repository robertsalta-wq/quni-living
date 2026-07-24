import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { GUARANTOR_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import {
  guarantorSectionFieldErrors,
  renterFieldClass,
  RENTER_SAVE_WRITE_FAILURE,
} from '../../../lib/renterProfileFieldValidation'
import {
  RenterProfileFieldErrorMsg,
  RenterProfileSaveHint,
  RenterProfileSectionErrorBanner,
  RenterProfileWriteError,
} from './RenterProfileValidationUi'
import {
  renterCheckboxErrorClass,
  renterFormActionsColumnClass,
  renterFormGridStackClass,
  renterFullWidthClass,
  renterInputClass,
  renterLabelClass,
  renterSaveBtnClass,
  renterSelectClass,
} from '../../../lib/renterProfileFormClasses'
import type { RenterSectionChromeActionsProps } from './renterSectionChromeActions'

const GUARANTOR_HINT_LABELS = {
  guarantorName: 'guarantor name',
  guarantorRelationship: 'guarantor relationship',
  guarantorPhone: 'guarantor phone',
  guarantorEmail: 'guarantor email',
  guarantorIncomeBand: 'guarantor income band',
  guarantorConsent: 'guarantor consent',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
} & RenterSectionChromeActionsProps

export { isGuarantorSectionComplete } from '../../../lib/renterReadiness'

type GuarantorDraft = {
  guarantorName: string
  guarantorRelationship: string
  guarantorPhone: string
  guarantorEmail: string
  guarantorIncomeBand: string
  guarantorConsent: boolean
}

function fieldsFromProfile(prof: StudentRow): GuarantorDraft {
  return {
    guarantorName: prof.guarantor_name ?? '',
    guarantorRelationship: prof.guarantor_relationship ?? '',
    guarantorPhone: prof.guarantor_phone ?? '',
    guarantorEmail: prof.guarantor_email ?? '',
    guarantorIncomeBand: prof.guarantor_income_band ?? '',
    guarantorConsent: prof.guarantor_consent === true,
  }
}

export function RenterGuarantorSection({
  profile,
  userId,
  onSaved,
  actionsInChrome = false,
  onSaveAttemptEnd,
}: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'guarantor')
  const [guarantorName, setGuarantorName] = useState(profile.guarantor_name ?? '')
  const [guarantorRelationship, setGuarantorRelationship] = useState(profile.guarantor_relationship ?? '')
  const [guarantorPhone, setGuarantorPhone] = useState(profile.guarantor_phone ?? '')
  const [guarantorEmail, setGuarantorEmail] = useState(profile.guarantor_email ?? '')
  const [guarantorIncomeBand, setGuarantorIncomeBand] = useState(profile.guarantor_income_band ?? '')
  const [guarantorConsent, setGuarantorConsent] = useState(profile.guarantor_consent === true)
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
  } = useRenterProfileSectionValidation(GUARANTOR_HINT_LABELS)

  const applyFields = (fields: GuarantorDraft) => {
    setGuarantorName(fields.guarantorName)
    setGuarantorRelationship(fields.guarantorRelationship)
    setGuarantorPhone(fields.guarantorPhone)
    setGuarantorEmail(fields.guarantorEmail)
    setGuarantorIncomeBand(fields.guarantorIncomeBand)
    setGuarantorConsent(fields.guarantorConsent)
  }

  useEffect(() => {
    if (restoreDraft<GuarantorDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({
      guarantorName,
      guarantorRelationship,
      guarantorPhone,
      guarantorEmail,
      guarantorIncomeBand,
      guarantorConsent,
    })
  }, [
    guarantorName,
    guarantorRelationship,
    guarantorPhone,
    guarantorEmail,
    guarantorIncomeBand,
    guarantorConsent,
    syncDraft,
  ])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()

    const errors = guarantorSectionFieldErrors({
      guarantorName,
      guarantorRelationship,
      guarantorPhone,
      guarantorEmail,
      guarantorIncomeBand,
      guarantorConsent,
    })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      onSaveAttemptEnd?.(false)
      return
    }

    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterGuarantorSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            has_guarantor: true,
            guarantor_name: guarantorName.trim(),
            guarantor_relationship: guarantorRelationship.trim(),
            guarantor_phone: guarantorPhone.trim(),
            guarantor_email: guarantorEmail.trim(),
            guarantor_income_band: guarantorIncomeBand.trim(),
            guarantor_consent: guarantorConsent,
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: GuarantorDraft = {
        guarantorName: guarantorName.trim(),
        guarantorRelationship: guarantorRelationship.trim(),
        guarantorPhone: guarantorPhone.trim(),
        guarantorEmail: guarantorEmail.trim(),
        guarantorIncomeBand: guarantorIncomeBand.trim(),
        guarantorConsent,
      }
      clearDraft()
      setBaseline(savedFields)
      await onSaved()
      onSaveAttemptEnd?.(true)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE)
      onSaveAttemptEnd?.(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridStackClass}>
      <RenterProfileSectionErrorBanner message={sectionError} />
      <div>
        <label htmlFor="rg-name" className={renterLabelClass}>
          Full name
        </label>
        <input
          id="rg-name"
          value={guarantorName}
          onChange={(e) => {
            setGuarantorName(e.target.value)
            clearFieldError('guarantorName')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.guarantorName))}
          aria-invalid={fieldErrors.guarantorName ? true : undefined}
          aria-describedby={fieldErrors.guarantorName ? 'rg-name-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rg-name-error" message={fieldErrors.guarantorName} />
      </div>
      <div>
        <label htmlFor="rg-rel" className={renterLabelClass}>
          Relationship
        </label>
        <input
          id="rg-rel"
          value={guarantorRelationship}
          onChange={(e) => {
            setGuarantorRelationship(e.target.value)
            clearFieldError('guarantorRelationship')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.guarantorRelationship))}
          aria-invalid={fieldErrors.guarantorRelationship ? true : undefined}
          aria-describedby={fieldErrors.guarantorRelationship ? 'rg-rel-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rg-rel-error" message={fieldErrors.guarantorRelationship} />
      </div>
      <div>
        <label htmlFor="rg-phone" className={renterLabelClass}>
          Phone
        </label>
        <input
          id="rg-phone"
          type="tel"
          value={guarantorPhone}
          onChange={(e) => {
            setGuarantorPhone(e.target.value)
            clearFieldError('guarantorPhone')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.guarantorPhone))}
          aria-invalid={fieldErrors.guarantorPhone ? true : undefined}
          aria-describedby={fieldErrors.guarantorPhone ? 'rg-phone-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rg-phone-error" message={fieldErrors.guarantorPhone} />
      </div>
      <div>
        <label htmlFor="rg-email" className={renterLabelClass}>
          Email
        </label>
        <input
          id="rg-email"
          type="email"
          value={guarantorEmail}
          onChange={(e) => {
            setGuarantorEmail(e.target.value)
            clearFieldError('guarantorEmail')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.guarantorEmail))}
          aria-invalid={fieldErrors.guarantorEmail ? true : undefined}
          aria-describedby={fieldErrors.guarantorEmail ? 'rg-email-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="rg-email-error" message={fieldErrors.guarantorEmail} />
      </div>
      <div className={renterFullWidthClass}>
        <label htmlFor="rg-income" className={renterLabelClass}>
          Income band
        </label>
        <select
          id="rg-income"
          value={guarantorIncomeBand}
          onChange={(e) => {
            setGuarantorIncomeBand(e.target.value)
            clearFieldError('guarantorIncomeBand')
          }}
          className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.guarantorIncomeBand))}
          aria-invalid={fieldErrors.guarantorIncomeBand ? true : undefined}
          aria-describedby={fieldErrors.guarantorIncomeBand ? 'rg-income-error' : undefined}
        >
          <option value="">Select income band</option>
          {GUARANTOR_INCOME_BAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RenterProfileFieldErrorMsg id="rg-income-error" message={fieldErrors.guarantorIncomeBand} />
      </div>
      <div className={renterFullWidthClass}>
        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            fontSize: 'var(--text-body-sm-size)',
            color: 'var(--quni-ink-2)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={guarantorConsent}
            onChange={(e) => {
              setGuarantorConsent(e.target.checked)
              clearFieldError('guarantorConsent')
            }}
            className={fieldErrors.guarantorConsent ? renterCheckboxErrorClass : undefined}
            style={{ marginTop: 3, accentColor: 'var(--quni-coral)' }}
            aria-invalid={fieldErrors.guarantorConsent ? true : undefined}
            aria-describedby={fieldErrors.guarantorConsent ? 'rg-consent-error' : undefined}
          />
          <span>I confirm this person agrees to act as my guarantor</span>
        </label>
        <RenterProfileFieldErrorMsg id="rg-consent-error" message={fieldErrors.guarantorConsent} />
      </div>

      <RenterProfileWriteError message={saveError} />

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
