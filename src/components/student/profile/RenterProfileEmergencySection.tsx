import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import {
  emergencySectionFieldErrors,
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
  renterFormActionsColumnClass,
  renterFormGridClass,
  renterInputClass,
  renterLabelClass,
  renterSaveBtnClass,
  renterSuccessFlashClass,
} from '../../../lib/renterProfileFormClasses'

const EMERGENCY_HINT_LABELS = {
  emergencyName: 'emergency contact name',
  emergencyPhone: 'emergency contact phone',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type EmergencyDraft = {
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  emergencyEmail: string
}

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
}

function fieldsFromProfile(prof: StudentRow): EmergencyDraft {
  return {
    emergencyName: prof.emergency_contact_name ?? '',
    emergencyRelationship: prof.emergency_contact_relationship ?? '',
    emergencyPhone: prof.emergency_contact_phone ?? '',
    emergencyEmail: prof.emergency_contact_email ?? '',
  }
}

export function RenterProfileEmergencySection({ profile, userId, onSaved }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'emergency')
  const [emergencyName, setEmergencyName] = useState(profile.emergency_contact_name ?? '')
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    profile.emergency_contact_relationship ?? '',
  )
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergency_contact_phone ?? '')
  const [emergencyEmail, setEmergencyEmail] = useState(profile.emergency_contact_email ?? '')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const {
    fieldErrors,
    sectionError,
    sectionSaveHint,
    saveError,
    setSaveError,
    applyValidationErrors,
    clearFieldError,
    beginSaveAttempt,
  } = useRenterProfileSectionValidation(EMERGENCY_HINT_LABELS)

  const applyFields = (fields: EmergencyDraft) => {
    setEmergencyName(fields.emergencyName)
    setEmergencyRelationship(fields.emergencyRelationship)
    setEmergencyPhone(fields.emergencyPhone)
    setEmergencyEmail(fields.emergencyEmail)
  }

  useEffect(() => {
    if (restoreDraft<EmergencyDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({ emergencyName, emergencyRelationship, emergencyPhone, emergencyEmail })
  }, [emergencyName, emergencyRelationship, emergencyPhone, emergencyEmail, syncDraft])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()
    setSavedFlash(false)

    const errors = emergencySectionFieldErrors({ emergencyName, emergencyPhone })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      return
    }

    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterProfileEmergencySection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            emergency_contact_name: emergencyName.trim(),
            emergency_contact_relationship: emergencyRelationship.trim() || null,
            emergency_contact_phone: emergencyPhone.trim(),
            emergency_contact_email: emergencyEmail.trim() || null,
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: EmergencyDraft = {
        emergencyName: emergencyName.trim(),
        emergencyRelationship: emergencyRelationship.trim(),
        emergencyPhone: emergencyPhone.trim(),
        emergencyEmail: emergencyEmail.trim(),
      }
      clearDraft()
      setBaseline(savedFields)
      setSavedFlash(true)
      await onSaved()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridClass}>
      <RenterProfileSectionErrorBanner message={sectionError} />
      <div>
        <label htmlFor="renter-em-name" className={renterLabelClass}>
          Full name
        </label>
        <input
          id="renter-em-name"
          type="text"
          value={emergencyName}
          onChange={(e) => {
            setEmergencyName(e.target.value)
            clearFieldError('emergencyName')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.emergencyName))}
          aria-invalid={fieldErrors.emergencyName ? true : undefined}
          aria-describedby={fieldErrors.emergencyName ? 'renter-em-name-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-em-name-error" message={fieldErrors.emergencyName} />
      </div>
      <div>
        <label htmlFor="renter-em-rel" className={renterLabelClass}>
          Relationship
        </label>
        <input
          id="renter-em-rel"
          type="text"
          value={emergencyRelationship}
          onChange={(e) => setEmergencyRelationship(e.target.value)}
          placeholder="e.g. Parent"
          className={renterInputClass}
        />
      </div>
      <div>
        <label htmlFor="renter-em-phone" className={renterLabelClass}>
          Phone
        </label>
        <input
          id="renter-em-phone"
          type="tel"
          value={emergencyPhone}
          onChange={(e) => {
            setEmergencyPhone(e.target.value)
            clearFieldError('emergencyPhone')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.emergencyPhone))}
          aria-invalid={fieldErrors.emergencyPhone ? true : undefined}
          aria-describedby={fieldErrors.emergencyPhone ? 'renter-em-phone-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-em-phone-error" message={fieldErrors.emergencyPhone} />
      </div>
      <div>
        <label htmlFor="renter-em-email" className={renterLabelClass}>
          Email
        </label>
        <input
          id="renter-em-email"
          type="email"
          value={emergencyEmail}
          onChange={(e) => setEmergencyEmail(e.target.value)}
          className={renterInputClass}
        />
      </div>
      {savedFlash ? (
        <p className={renterSuccessFlashClass} role="status">
          Emergency contact saved.
        </p>
      ) : null}
      <RenterProfileWriteError message={saveError} />
      <div className={renterFormActionsColumnClass}>
        <RenterProfileSaveHint message={sectionSaveHint} />
        <button type="submit" disabled={saving} className={renterSaveBtnClass}>
          {saving ? 'Saving…' : 'Save section'}
        </button>
      </div>
    </form>
  )
}
