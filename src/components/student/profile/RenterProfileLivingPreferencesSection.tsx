import { useEffect, useState, type FormEvent } from 'react'
import type { Database } from '../../../lib/database.types'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { LEASE_LENGTH_OPTIONS } from '../../../lib/studentOnboarding'
import { STUDENT_OCCUPANCY_OPTIONS } from '../../../lib/studentOccupancyOptions'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import {
  livingPreferencesSectionFieldErrors,
  renterFieldClass,
  RENTER_SAVE_WRITE_FAILURE,
} from '../../../lib/renterProfileFieldValidation'
import {
  RenterProfileFieldErrorMsg,
  RenterProfileSaveHint,
  RenterProfileSectionErrorBanner,
  RenterProfileWriteError,
} from './RenterProfileValidationUi'

const LIVING_PREFS_HINT_LABELS = {
  budgetMin: 'budget minimum',
  budgetMax: 'budget maximum',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const ROOM_PREF_OPTIONS = [
  { value: '', label: 'Select room type' },
  { value: 'single', label: 'Single room' },
  { value: 'shared', label: 'Shared room' },
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
]

const MOVE_IN_FLEX_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'exact', label: 'Exact date' },
  { value: 'one_week', label: '± 1 week' },
  { value: 'two_weeks', label: '± 2 weeks' },
]

const BILLS_PREF_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'included', label: 'Bills included' },
  { value: 'separate', label: 'Bills separate' },
  { value: 'either', label: 'Either' },
]

const FURNISHING_PREF_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'either', label: 'Either' },
]

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => Promise<void>
}

type LivingPrefsDraft = {
  roomPref: string
  budgetMin: string
  budgetMax: string
  occupancyType: string
  moveInDate: string
  moveInFlex: string
  leaseLength: string
  isSmoker: boolean
  hasPets: boolean
  needsParking: boolean
  billsPref: string
  furnishingPref: string
}

function fieldsFromProfile(prof: StudentRow): LivingPrefsDraft {
  return {
    roomPref: prof.room_type_preference ?? '',
    budgetMin: prof.budget_min_per_week != null ? String(prof.budget_min_per_week) : '',
    budgetMax: prof.budget_max_per_week != null ? String(prof.budget_max_per_week) : '',
    occupancyType: prof.occupancy_type ?? '',
    moveInDate: prof.preferred_move_in_date ? prof.preferred_move_in_date.slice(0, 10) : '',
    moveInFlex: prof.move_in_flexibility ?? '',
    leaseLength: prof.preferred_lease_length?.trim() ?? '',
    isSmoker: prof.is_smoker === true,
    hasPets: prof.has_pets === true,
    needsParking: prof.needs_parking === true,
    billsPref: prof.bills_preference ?? '',
    furnishingPref: prof.furnishing_preference ?? '',
  }
}

export function RenterProfileLivingPreferencesSection({ profile, userId, onSaved }: Props) {
  const { restoreDraft, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'living-prefs')
  const [roomPref, setRoomPref] = useState(profile.room_type_preference ?? '')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [occupancyType, setOccupancyType] = useState(profile.occupancy_type ?? '')
  const [moveInDate, setMoveInDate] = useState('')
  const [moveInFlex, setMoveInFlex] = useState(profile.move_in_flexibility ?? '')
  const [leaseLength, setLeaseLength] = useState('')
  const [isSmoker, setIsSmoker] = useState(profile.is_smoker === true)
  const [hasPets, setHasPets] = useState(profile.has_pets === true)
  const [needsParking, setNeedsParking] = useState(profile.needs_parking === true)
  const [billsPref, setBillsPref] = useState(profile.bills_preference ?? '')
  const [furnishingPref, setFurnishingPref] = useState(profile.furnishing_preference ?? '')
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
  } = useRenterProfileSectionValidation(LIVING_PREFS_HINT_LABELS)

  const applyFields = (fields: LivingPrefsDraft) => {
    setRoomPref(fields.roomPref)
    setBudgetMin(fields.budgetMin)
    setBudgetMax(fields.budgetMax)
    setOccupancyType(fields.occupancyType)
    setMoveInDate(fields.moveInDate)
    setMoveInFlex(fields.moveInFlex)
    setLeaseLength(fields.leaseLength)
    setIsSmoker(fields.isSmoker)
    setHasPets(fields.hasPets)
    setNeedsParking(fields.needsParking)
    setBillsPref(fields.billsPref)
    setFurnishingPref(fields.furnishingPref)
  }

  useEffect(() => {
    if (restoreDraft<LivingPrefsDraft>(applyFields)) return
    if (!shouldApplyProfile()) return
    const fromProf = fieldsFromProfile(profile)
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, restoreDraft, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({
      roomPref,
      budgetMin,
      budgetMax,
      occupancyType,
      moveInDate,
      moveInFlex,
      leaseLength,
      isSmoker,
      hasPets,
      needsParking,
      billsPref,
      furnishingPref,
    })
  }, [
    roomPref,
    budgetMin,
    budgetMax,
    occupancyType,
    moveInDate,
    moveInFlex,
    leaseLength,
    isSmoker,
    hasPets,
    needsParking,
    billsPref,
    furnishingPref,
    syncDraft,
  ])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()
    setSavedFlash(false)

    const errors = livingPreferencesSectionFieldErrors({ budgetMin, budgetMax })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      return
    }

    const bMin = budgetMin.trim() ? Number(budgetMin) : null
    const bMax = budgetMax.trim() ? Number(budgetMax) : null

    setSaving(true)
    try {
      const { error } = await withSentryMonitoring('RenterProfileLivingPreferencesSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            room_type_preference: roomPref.trim() || null,
            budget_min_per_week: bMin,
            budget_max_per_week: bMax,
            occupancy_type: occupancyType ? (occupancyType as 'sole' | 'couple' | 'open') : null,
            preferred_move_in_date: moveInDate.trim() || null,
            move_in_flexibility: moveInFlex ? (moveInFlex as 'exact' | 'one_week' | 'two_weeks') : null,
            preferred_lease_length: leaseLength.trim() || null,
            is_smoker: isSmoker,
            has_pets: hasPets,
            needs_parking: needsParking,
            bills_preference: billsPref ? (billsPref as 'included' | 'separate' | 'either') : null,
            furnishing_preference: furnishingPref
              ? (furnishingPref as 'furnished' | 'unfurnished' | 'either')
              : null,
          })
          .eq('user_id', userId),
      )
      if (error) throw error
      const savedFields: LivingPrefsDraft = {
        roomPref: roomPref.trim(),
        budgetMin: budgetMin.trim(),
        budgetMax: budgetMax.trim(),
        occupancyType,
        moveInDate: moveInDate.trim(),
        moveInFlex,
        leaseLength: leaseLength.trim(),
        isSmoker,
        hasPets,
        needsParking,
        billsPref,
        furnishingPref,
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
    <form onSubmit={(e) => void handleSubmit(e)} className="renter-profile-form-grid">
      <RenterProfileSectionErrorBanner message={sectionError} />
      <div>
        <label htmlFor="renter-room" className="renter-profile-field-label">
          Room type preference
        </label>
        <select id="renter-room" value={roomPref} onChange={(e) => setRoomPref(e.target.value)} className="renter-profile-select">
          {ROOM_PREF_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="renter-occ" className="renter-profile-field-label">
          Occupancy type
        </label>
        <select id="renter-occ" value={occupancyType} onChange={(e) => setOccupancyType(e.target.value)} className="renter-profile-select">
          <option value="">No preference</option>
          {STUDENT_OCCUPANCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="renter-bmin" className="renter-profile-field-label">
          Weekly budget — min
        </label>
        <input
          id="renter-bmin"
          type="text"
          inputMode="decimal"
          value={budgetMin}
          onChange={(e) => {
            setBudgetMin(e.target.value)
            clearFieldError('budgetMin')
          }}
          className={renterFieldClass('renter-profile-input', Boolean(fieldErrors.budgetMin))}
          aria-invalid={fieldErrors.budgetMin ? true : undefined}
          aria-describedby={fieldErrors.budgetMin ? 'renter-bmin-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-bmin-error" message={fieldErrors.budgetMin} />
      </div>
      <div>
        <label htmlFor="renter-bmax" className="renter-profile-field-label">
          Weekly budget — max
        </label>
        <input
          id="renter-bmax"
          type="text"
          inputMode="decimal"
          value={budgetMax}
          onChange={(e) => {
            setBudgetMax(e.target.value)
            clearFieldError('budgetMax')
          }}
          className={renterFieldClass('renter-profile-input', Boolean(fieldErrors.budgetMax))}
          aria-invalid={fieldErrors.budgetMax ? true : undefined}
          aria-describedby={fieldErrors.budgetMax ? 'renter-bmax-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-bmax-error" message={fieldErrors.budgetMax} />
      </div>
      <div>
        <label htmlFor="renter-move-in" className="renter-profile-field-label">
          Preferred move-in date
        </label>
        <input id="renter-move-in" type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} className="renter-profile-input" />
      </div>
      <div>
        <label htmlFor="renter-mflex" className="renter-profile-field-label">
          Move-in flexibility
        </label>
        <select id="renter-mflex" value={moveInFlex} onChange={(e) => setMoveInFlex(e.target.value)} className="renter-profile-select">
          {MOVE_IN_FLEX_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="renter-lease" className="renter-profile-field-label">
          Preferred lease length
        </label>
        <select id="renter-lease" value={leaseLength} onChange={(e) => setLeaseLength(e.target.value)} className="renter-profile-select">
          {LEASE_LENGTH_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--quni-ink-2)' }}>
          <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} />
          Smoker
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--quni-ink-2)' }}>
          <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} />
          Pets
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--quni-ink-2)' }}>
          <input type="checkbox" checked={needsParking} onChange={(e) => setNeedsParking(e.target.checked)} />
          Parking needed
        </label>
      </div>
      <div>
        <label htmlFor="renter-bills" className="renter-profile-field-label">
          Bills preference
        </label>
        <select id="renter-bills" value={billsPref} onChange={(e) => setBillsPref(e.target.value)} className="renter-profile-select">
          {BILLS_PREF_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="renter-furnish" className="renter-profile-field-label">
          Furnishing preference
        </label>
        <select id="renter-furnish" value={furnishingPref} onChange={(e) => setFurnishingPref(e.target.value)} className="renter-profile-select">
          {FURNISHING_PREF_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {savedFlash ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          Living preferences saved.
        </p>
      ) : null}
      <RenterProfileWriteError message={saveError} />
      <div className="renter-profile-form-actions" style={{ gridColumn: '1 / -1', flexDirection: 'column', alignItems: 'stretch' }}>
        <RenterProfileSaveHint message={sectionSaveHint} />
        <button type="submit" disabled={saving} className="renter-profile-btn-primary self-start">
          {saving ? 'Saving…' : 'Save section'}
        </button>
      </div>
    </form>
  )
}
