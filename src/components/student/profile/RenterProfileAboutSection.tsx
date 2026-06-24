import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import LanguagesSpokenSelector from '../../profile/LanguagesSpokenSelector'
import { normalizeLanguagesSpoken, type SpokenLanguageCode } from '../../../lib/languagesSpoken'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
}

type AboutDraft = { bio: string; languagesSpoken: SpokenLanguageCode[] }

function fieldsFromProfile(prof: StudentRow): AboutDraft {
  return {
    bio: prof.bio ?? '',
    languagesSpoken: normalizeLanguagesSpoken(prof.languages_spoken),
  }
}

export function RenterProfileAboutSection({ profile, userId, onSaved }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'about')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [languagesSpoken, setLanguagesSpoken] = useState<SpokenLanguageCode[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const applyFields = (fields: AboutDraft) => {
    setBio(fields.bio)
    setLanguagesSpoken(fields.languagesSpoken)
  }

  useEffect(() => {
    if (restoreDraft<AboutDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({ bio, languagesSpoken })
  }, [bio, languagesSpoken, syncDraft])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSavedFlash(false)
    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterProfileAboutSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            bio: bio.trim() || null,
            languages_spoken: languagesSpoken,
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: AboutDraft = { bio: bio.trim(), languagesSpoken }
      clearDraft()
      setBaseline(savedFields)
      setSavedFlash(true)
      await onSaved()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid renter-profile-form-grid--stack">
      <div className="renter-profile-field">
        <label htmlFor="renter-bio" className="renter-profile-field-label">
          Bio
        </label>
        <textarea
          id="renter-bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell landlords a bit about yourself — your course, what you're after in a place, and how you like to live."
          className="renter-profile-textarea"
        />
      </div>
      <div className="renter-profile-field">
        <span className="renter-profile-field-label">Languages spoken</span>
        <LanguagesSpokenSelector
          id="renter-about-languages"
          value={languagesSpoken}
          onChange={setLanguagesSpoken}
          disabled={saving}
        />
      </div>
      {saveError ? (
        <p className="renter-profile-error" style={{ gridColumn: '1 / -1' }} role="alert">
          {saveError}
        </p>
      ) : null}
      {savedFlash ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          About you saved.
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
