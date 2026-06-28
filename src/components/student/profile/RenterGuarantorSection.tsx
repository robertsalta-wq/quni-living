import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { GUARANTOR_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import { isValidAuPhone } from '../../../lib/studentOnboarding'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
}

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

export function RenterGuarantorSection({ profile, userId, onSaved }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'guarantor')
  const [guarantorName, setGuarantorName] = useState(profile.guarantor_name ?? '')
  const [guarantorRelationship, setGuarantorRelationship] = useState(profile.guarantor_relationship ?? '')
  const [guarantorPhone, setGuarantorPhone] = useState(profile.guarantor_phone ?? '')
  const [guarantorEmail, setGuarantorEmail] = useState(profile.guarantor_email ?? '')
  const [guarantorIncomeBand, setGuarantorIncomeBand] = useState(profile.guarantor_income_band ?? '')
  const [guarantorConsent, setGuarantorConsent] = useState(profile.guarantor_consent === true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    setSaveError(null)

    if (!guarantorName.trim()) {
      setSaveError('Guarantor name is required.')
      return
    }
    if (!guarantorRelationship.trim()) {
      setSaveError('Guarantor relationship is required.')
      return
    }
    if (!guarantorPhone.trim() || !isValidAuPhone(guarantorPhone)) {
      setSaveError('Enter a valid guarantor phone number.')
      return
    }
    if (!guarantorEmail.trim()) {
      setSaveError('Guarantor email is required.')
      return
    }
    if (!guarantorIncomeBand.trim()) {
      setSaveError('Please select guarantor income band.')
      return
    }
    if (!guarantorConsent) {
      setSaveError('Please confirm your guarantor has consented.')
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
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save guarantor details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid renter-profile-form-grid--stack">
      <div>
        <label htmlFor="rg-name" className="renter-profile-field-label">
          Full name
        </label>
        <input
          id="rg-name"
          value={guarantorName}
          onChange={(e) => setGuarantorName(e.target.value)}
          className="renter-profile-input"
        />
      </div>
      <div>
        <label htmlFor="rg-rel" className="renter-profile-field-label">
          Relationship
        </label>
        <input
          id="rg-rel"
          value={guarantorRelationship}
          onChange={(e) => setGuarantorRelationship(e.target.value)}
          placeholder="e.g. Parent"
          className="renter-profile-input"
        />
      </div>
      <div>
        <label htmlFor="rg-phone" className="renter-profile-field-label">
          Phone
        </label>
        <input
          id="rg-phone"
          type="tel"
          value={guarantorPhone}
          onChange={(e) => setGuarantorPhone(e.target.value)}
          className="renter-profile-input"
        />
      </div>
      <div>
        <label htmlFor="rg-email" className="renter-profile-field-label">
          Email
        </label>
        <input
          id="rg-email"
          type="email"
          value={guarantorEmail}
          onChange={(e) => setGuarantorEmail(e.target.value)}
          className="renter-profile-input"
        />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="rg-income" className="renter-profile-field-label">
          Income band
        </label>
        <select
          id="rg-income"
          value={guarantorIncomeBand}
          onChange={(e) => setGuarantorIncomeBand(e.target.value)}
          className="renter-profile-select"
        >
          <option value="">Select income band</option>
          {GUARANTOR_INCOME_BAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <label
        style={{
          gridColumn: '1 / -1',
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
          onChange={(e) => setGuarantorConsent(e.target.checked)}
          style={{ marginTop: 3, accentColor: 'var(--quni-coral)' }}
        />
        <span>I confirm this person agrees to act as my guarantor</span>
      </label>

      {saveError ? (
        <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
          {saveError}
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
