import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { isValidAuPhone } from '../../../lib/studentOnboarding'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'

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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

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
    setSaveError(null)
    setSavedFlash(false)

    if (!emergencyName.trim()) {
      setSaveError('Emergency contact name is required.')
      return
    }
    if (!emergencyPhone.trim()) {
      setSaveError('Emergency contact phone is required.')
      return
    }
    if (!isValidAuPhone(emergencyPhone)) {
      setSaveError('Enter a valid emergency contact phone number.')
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
      setSaveError(err instanceof Error ? err.message : 'Could not save emergency contact.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid">
      <div>
        <label htmlFor="renter-em-name" className="renter-profile-field-label">
          Full name
        </label>
        <input
          id="renter-em-name"
          type="text"
          value={emergencyName}
          onChange={(e) => setEmergencyName(e.target.value)}
          className="renter-profile-input"
          required
        />
      </div>
      <div>
        <label htmlFor="renter-em-rel" className="renter-profile-field-label">
          Relationship
        </label>
        <input
          id="renter-em-rel"
          type="text"
          value={emergencyRelationship}
          onChange={(e) => setEmergencyRelationship(e.target.value)}
          placeholder="e.g. Parent"
          className="renter-profile-input"
        />
      </div>
      <div>
        <label htmlFor="renter-em-phone" className="renter-profile-field-label">
          Phone
        </label>
        <input
          id="renter-em-phone"
          type="tel"
          value={emergencyPhone}
          onChange={(e) => setEmergencyPhone(e.target.value)}
          className="renter-profile-input"
          required
        />
      </div>
      <div>
        <label htmlFor="renter-em-email" className="renter-profile-field-label">
          Email
        </label>
        <input
          id="renter-em-email"
          type="email"
          value={emergencyEmail}
          onChange={(e) => setEmergencyEmail(e.target.value)}
          className="renter-profile-input"
        />
      </div>
      {saveError ? (
        <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
          {saveError}
        </p>
      ) : null}
      {savedFlash ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          Emergency contact saved.
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
