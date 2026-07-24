import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import LanguagesSpokenSelector from '../../profile/LanguagesSpokenSelector'
import { normalizeLanguagesSpoken, type SpokenLanguageCode } from '../../../lib/languagesSpoken'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import {
  renterFieldWrapClass,
  renterFormActionsColumnClass,
  renterFormGridStackClass,
  renterLabelClass,
  renterSaveBtnClass,
  renterSuccessFlashClass,
  renterTextareaClass,
  renterWriteErrorClass,
} from '../../../lib/renterProfileFormClasses'
import type { RenterSectionChromeActionsProps } from './renterSectionChromeActions'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
} & RenterSectionChromeActionsProps

type AboutDraft = { bio: string; languagesSpoken: SpokenLanguageCode[] }

function fieldsFromProfile(prof: StudentRow): AboutDraft {
  return {
    bio: prof.bio ?? '',
    languagesSpoken: normalizeLanguagesSpoken(prof.languages_spoken),
  }
}

export function RenterProfileAboutSection({
  profile,
  userId,
  onSaved,
  actionsInChrome = false,
  onSaveAttemptEnd,
}: Props) {
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
      onSaveAttemptEnd?.(true)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.')
      onSaveAttemptEnd?.(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridStackClass}>
      <div className={renterFieldWrapClass}>
        <label htmlFor="renter-bio" className={renterLabelClass}>
          Bio
        </label>
        <textarea
          id="renter-bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell landlords a bit about yourself — your course, what you're after in a place, and how you like to live."
          className={renterTextareaClass}
        />
      </div>
      <div className={renterFieldWrapClass}>
        <span className={renterLabelClass}>Languages spoken</span>
        <LanguagesSpokenSelector
          id="renter-about-languages"
          value={languagesSpoken}
          onChange={setLanguagesSpoken}
          disabled={saving}
        />
      </div>
      {saveError ? (
        <p className={renterWriteErrorClass} role="alert">
          {saveError}
        </p>
      ) : null}
      {savedFlash ? (
        <p className={renterSuccessFlashClass} role="status">
          About you saved.
        </p>
      ) : null}
      <div className={renterFormActionsColumnClass}>
        {!actionsInChrome ? (
          <button type="submit" disabled={saving} className={renterSaveBtnClass}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
        ) : null}
      </div>
    </form>
  )
}
