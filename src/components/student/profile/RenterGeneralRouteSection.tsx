import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { WEEKLY_INCOME_BAND_OPTIONS } from '../../../lib/renterIncomeBands'
import type { RenterSituation } from '../../../lib/renterSituation'
import { isGeneralRouteSectionComplete } from '../../../lib/renterRouteSection'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const RETIRED_INCOME_SOURCE_OPTIONS = [
  { value: '', label: 'Select income source' },
  { value: 'pension', label: 'Age pension' },
  { value: 'superannuation', label: 'Superannuation / pension drawdown' },
  { value: 'investments', label: 'Investments' },
  { value: 'other', label: 'Other' },
] as const

const BETWEEN_JOBS_INCOME_SOURCE_OPTIONS = [
  { value: '', label: 'Select income source' },
  { value: 'savings', label: 'Savings' },
  { value: 'family_support', label: 'Family support' },
  { value: 'benefits', label: 'Government benefits' },
  { value: 'other', label: 'Other' },
] as const

type Props = {
  profile: StudentRow
  userId: string
  situation: Extract<RenterSituation, 'retired' | 'between_jobs'>
  onSaved: () => Promise<void>
}

type GeneralRouteDraft = { incomeBand: string; incomeSource: string }

function fieldsFromProfile(prof: StudentRow): GeneralRouteDraft {
  return {
    incomeBand: prof.income_band ?? '',
    incomeSource: prof.income_source ?? '',
  }
}

function incomeSourceOptions(situation: Props['situation']) {
  return situation === 'retired' ? RETIRED_INCOME_SOURCE_OPTIONS : BETWEEN_JOBS_INCOME_SOURCE_OPTIONS
}

export function RenterGeneralRouteSection({ profile, userId, situation, onSaved }: Props) {
  const draftKey = situation === 'retired' ? 'general-route-retired' : 'general-route-between'
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, draftKey)
  const [incomeBand, setIncomeBand] = useState(profile.income_band ?? '')
  const [incomeSource, setIncomeSource] = useState(profile.income_source ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sourceOptions = incomeSourceOptions(situation)

  const applyFields = (fields: GeneralRouteDraft) => {
    setIncomeBand(fields.incomeBand)
    setIncomeSource(fields.incomeSource)
  }

  useEffect(() => {
    if (restoreDraft<GeneralRouteDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({ incomeBand, incomeSource })
  }, [incomeBand, incomeSource, syncDraft])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaveError(null)

    if (!incomeBand.trim()) {
      setSaveError('Please select your weekly income band.')
      return
    }
    if (!incomeSource.trim()) {
      setSaveError('Please select your income source.')
      return
    }

    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterGeneralRouteSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            income_band: incomeBand.trim(),
            income_source: incomeSource.trim(),
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: GeneralRouteDraft = {
        incomeBand: incomeBand.trim(),
        incomeSource: incomeSource.trim(),
      }
      clearDraft()
      setBaseline(savedFields)
      await onSaved()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save income details.')
    } finally {
      setSaving(false)
    }
  }

  const routeComplete = isGeneralRouteSectionComplete(profile)

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid">
      <div className="renter-profile-field">
        <label htmlFor="rg-income" className="renter-profile-field-label">
          Income band
        </label>
        <select
          id="rg-income"
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

      <div className="renter-profile-field">
        <label htmlFor="rg-source" className="renter-profile-field-label">
          Income source
        </label>
        <select
          id="rg-source"
          value={incomeSource}
          onChange={(e) => setIncomeSource(e.target.value)}
          className="renter-profile-select"
        >
          {sourceOptions.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
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

      <div className="renter-profile-form-actions" style={{ gridColumn: '1 / -1' }}>
        <button type="submit" disabled={saving} className="renter-profile-btn-primary">
          {saving ? 'Saving…' : 'Save section'}
        </button>
      </div>

      {routeComplete ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          Income section complete.
        </p>
      ) : null}
    </form>
  )
}
