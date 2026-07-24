import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import type { Database } from '../../../lib/database.types'
import { prepareProfilePhotoForUpload } from '../../../lib/prepareProfilePhotoForUpload'
import { cacheBustUrl } from '../../../lib/cacheBustUrl'
import { AUDateField } from '../../AUDateField'
import { useProfileSectionDraft } from '../../../hooks/useProfileSectionDraft'
import { useRenterProfileSectionValidation } from '../../../hooks/useRenterProfileSectionValidation'
import {
  personalSectionFieldErrors,
  renterFieldClass,
  RENTER_SAVE_WRITE_FAILURE,
} from '../../../lib/renterProfileFieldValidation'
import { studentDisplayName } from '../../../lib/nameResolution'
import {
  RenterProfileFieldErrorMsg,
  RenterProfileSaveHint,
  RenterProfileSectionErrorBanner,
  RenterProfileWriteError,
} from './RenterProfileValidationUi'
import {
  renterEmailHintClass,
  renterFieldWrapClass,
  renterFormActionsColumnClass,
  renterFormGridClass,
  renterFullWidthClass,
  renterInputClass,
  renterLabelClass,
  renterPhotoPreviewClass,
  renterPhotoRowClass,
  renterSaveBtnClass,
  renterSecondaryBtnClass,
  renterSelectClass,
  renterSuccessFlashClass,
  renterWriteErrorClass,
} from '../../../lib/renterProfileFormClasses'

const LEGAL_NAME_LOCKED_SAVE_MESSAGE =
  "Your legal name is verified and can't be edited here."

function isLegalNameLockedSaveError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { message?: string; code?: string }
  const message = e.message ?? ''
  return e.code === '23514' || message.includes('legal_name_locked')
}

function formatSaveError(err: unknown): string {
  if (isLegalNameLockedSaveError(err)) return LEGAL_NAME_LOCKED_SAVE_MESSAGE
  return err instanceof Error ? err.message : RENTER_SAVE_WRITE_FAILURE
}

const PERSONAL_HINT_LABELS = {
  firstName: 'first name',
  lastName: 'last name',
  phone: 'phone number',
  gender: 'gender',
} as const

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const PROFILE_PHOTO_BUCKET = 'student-avatars'
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
]

const NATIONALITY_OPTIONS = [
  { value: '', label: 'Select nationality' },
  { value: 'Australian', label: 'Australian' },
  { value: 'New Zealander', label: 'New Zealander' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Indian', label: 'Indian' },
  { value: 'Nepalese', label: 'Nepalese' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Filipino', label: 'Filipino' },
  { value: 'Malaysian', label: 'Malaysian' },
  { value: 'Indonesian', label: 'Indonesian' },
  { value: 'South Korean', label: 'South Korean' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'British', label: 'British' },
  { value: 'American', label: 'American' },
  { value: 'Canadian', label: 'Canadian' },
  { value: 'Other', label: 'Other' },
]

function splitFullName(full: string | null | undefined): [string, string] {
  if (!full?.trim()) return ['', '']
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return [parts[0]!, '']
  return [parts[0]!, parts.slice(1).join(' ')]
}

function initialsFromDisplay(display: string, email: string | null | undefined) {
  const s = (display.trim() || email?.split('@')[0] || '?').split(/\s+/)
  return s
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

import type { RenterSectionChromeActionsProps } from './renterSectionChromeActions'

type Props = {
  profile: StudentRow
  userId: string
  displayEmail: string
  onSaved: () => void | Promise<void>
} & RenterSectionChromeActionsProps

type PersonalDraft = {
  firstName: string
  lastName: string
  preferredName: string
  phone: string
  gender: string
  nationality: string
  dateOfBirth: string
}

function personalFieldsFromProfile(prof: StudentRow): PersonalDraft {
  const [fn, ln] = splitFullName(prof.full_name)
  return {
    firstName: prof.first_name ?? fn,
    lastName: prof.last_name ?? ln,
    preferredName: prof.preferred_name ?? '',
    phone: prof.phone ?? '',
    gender: prof.gender ?? '',
    nationality: prof.nationality ?? '',
    dateOfBirth: prof.date_of_birth ? prof.date_of_birth.slice(0, 10) : '',
  }
}

/** Per-field: empty draft strings fall back to saved profile (stale empty draft must not win). */
function mergePersonalDraftWithProfile(draft: PersonalDraft, fromProfile: PersonalDraft): PersonalDraft {
  const pick = (draftVal: string | undefined, profileVal: string) =>
    typeof draftVal === 'string' && draftVal.trim() !== '' ? draftVal : profileVal
  return {
    firstName: pick(draft.firstName, fromProfile.firstName),
    lastName: pick(draft.lastName, fromProfile.lastName),
    preferredName: pick(draft.preferredName, fromProfile.preferredName),
    phone: pick(draft.phone, fromProfile.phone),
    gender: pick(draft.gender, fromProfile.gender),
    nationality: pick(draft.nationality, fromProfile.nationality),
    dateOfBirth: pick(draft.dateOfBirth, fromProfile.dateOfBirth),
  }
}

export function RenterProfilePersonalSection({
  profile,
  userId,
  displayEmail,
  onSaved,
  actionsInChrome = false,
  onSaveAttemptEnd,
}: Props) {
  const legalNameLocked = Boolean(profile.legal_name_locked_at)
  const initialFields = personalFieldsFromProfile(profile)
  const { restoreDraftMerged, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'personal')
  const [firstName, setFirstName] = useState(initialFields.firstName)
  const [lastName, setLastName] = useState(initialFields.lastName)
  const [preferredName, setPreferredName] = useState(initialFields.preferredName)
  const [phone, setPhone] = useState(initialFields.phone)
  const [gender, setGender] = useState(initialFields.gender)
  const [nationality, setNationality] = useState(initialFields.nationality)
  const [dateOfBirth, setDateOfBirth] = useState(initialFields.dateOfBirth)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    fieldErrors,
    sectionError,
    sectionSaveHint,
    saveError,
    setSaveError,
    applyValidationErrors,
    clearFieldError,
    beginSaveAttempt,
  } = useRenterProfileSectionValidation(PERSONAL_HINT_LABELS)

  const applyFields = useCallback((fields: PersonalDraft) => {
    setFirstName(fields.firstName)
    setLastName(fields.lastName)
    setPreferredName(fields.preferredName)
    setPhone(fields.phone)
    setGender(fields.gender)
    setNationality(fields.nationality)
    setDateOfBirth(fields.dateOfBirth)
  }, [])

  useEffect(() => {
    const fromProf = personalFieldsFromProfile(profile)
    if (restoreDraftMerged(fromProf, mergePersonalDraftWithProfile, applyFields)) return
    if (!shouldApplyProfile()) return
    applyFields(fromProf)
    setBaseline(fromProf)
    markReady()
  }, [profile, applyFields, restoreDraftMerged, shouldApplyProfile, setBaseline, markReady])

  useEffect(() => {
    syncDraft({ firstName, lastName, preferredName, phone, gender, nationality, dateOfBirth })
  }, [firstName, lastName, preferredName, phone, gender, nationality, dateOfBirth, syncDraft])

  const profilePhotoUrl = localPhotoUrl ?? profile.avatar_url

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const instantPreview = URL.createObjectURL(file)
    setLocalPhotoUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return instantPreview
    })

    setUploadingPhoto(true)
    try {
      const prepared = await prepareProfilePhotoForUpload(file, MAX_PROFILE_PHOTO_BYTES)
      const path = `${userId}/profile-photo.${prepared.ext}`
      const { error: upErr } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, prepared.blob, {
        upsert: true,
        contentType: prepared.contentType,
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path)
      const avatarUrl = cacheBustUrl(pub.publicUrl)
      const { error: dbErr } = await supabase
        .from('student_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId)
      if (dbErr) throw dbErr
      URL.revokeObjectURL(instantPreview)
      setLocalPhotoUrl(avatarUrl)
      await onSaved()
    } catch (err: unknown) {
      setLocalPhotoUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return null
      })
      setPhotoError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    beginSaveAttempt()
    setSavedFlash(false)

    const errors = personalSectionFieldErrors({ firstName, lastName, phone, gender })
    if (legalNameLocked) {
      delete errors.firstName
      delete errors.lastName
    }
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      onSaveAttemptEnd?.(false)
      return
    }

    setSaving(true)
    try {
      const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const updatePayload = legalNameLocked
        ? {
            preferred_name: preferredName.trim() || null,
            phone: phone.trim(),
            gender: gender.trim(),
            nationality: nationality.trim() || null,
            date_of_birth: dateOfBirth.trim() || null,
          }
        : {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: combinedName,
            preferred_name: combinedName,
            phone: phone.trim(),
            gender: gender.trim(),
            nationality: nationality.trim() || null,
            date_of_birth: dateOfBirth.trim() || null,
          }

      const { error: upErr } = await withSentryMonitoring('RenterProfilePersonalSection/save', () =>
        supabase.from('student_profiles').update(updatePayload).eq('user_id', userId),
      )
      if (upErr) throw upErr
      const savedFields: PersonalDraft = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        preferredName: preferredName.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        nationality: nationality.trim(),
        dateOfBirth: dateOfBirth.trim(),
      }
      clearDraft()
      setBaseline(savedFields)
      setSavedFlash(true)
      await onSaved()
      onSaveAttemptEnd?.(true)
    } catch (err: unknown) {
      setSaveError(formatSaveError(err))
      onSaveAttemptEnd?.(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={renterFormGridClass}>
      <RenterProfileSectionErrorBanner message={sectionError} />
      {legalNameLocked ? (
        <>
          <div>
            <label htmlFor="renter-legal-first" className={renterLabelClass}>
              Legal first name (verified)
            </label>
            <input
              id="renter-legal-first"
              type="text"
              value={firstName}
              readOnly
              disabled
              className={renterInputClass}
              aria-describedby="renter-legal-name-hint"
            />
          </div>
          <div>
            <label htmlFor="renter-legal-last" className={renterLabelClass}>
              Legal last name (verified)
            </label>
            <input
              id="renter-legal-last"
              type="text"
              value={lastName}
              readOnly
              disabled
              className={renterInputClass}
              aria-describedby="renter-legal-name-hint"
            />
            <p id="renter-legal-name-hint" className={`${renterEmailHintClass} mt-1.5`}>
              From your verified ID. Contact support to change.
            </p>
          </div>
          <div>
            <label htmlFor="renter-preferred" className={renterLabelClass}>
              Preferred name
            </label>
            <input
              id="renter-preferred"
              type="text"
              autoComplete="nickname"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className={renterInputClass}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="renter-first" className={renterLabelClass}>
              First name
            </label>
            <input
              id="renter-first"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                clearFieldError('firstName')
              }}
              className={renterFieldClass(renterInputClass, Boolean(fieldErrors.firstName))}
              aria-invalid={fieldErrors.firstName ? true : undefined}
              aria-describedby={fieldErrors.firstName ? 'renter-first-error' : undefined}
            />
            <RenterProfileFieldErrorMsg id="renter-first-error" message={fieldErrors.firstName} />
          </div>
          <div>
            <label htmlFor="renter-last" className={renterLabelClass}>
              Last name
            </label>
            <input
              id="renter-last"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                clearFieldError('lastName')
              }}
              className={renterFieldClass(renterInputClass, Boolean(fieldErrors.lastName))}
              aria-invalid={fieldErrors.lastName ? true : undefined}
              aria-describedby={fieldErrors.lastName ? 'renter-last-error' : undefined}
            />
            <RenterProfileFieldErrorMsg id="renter-last-error" message={fieldErrors.lastName} />
          </div>
        </>
      )}
      <div>
        <label htmlFor="renter-dob" className={renterLabelClass}>
          Date of birth
        </label>
        <AUDateField
          id="renter-dob"
          birthDate
          value={dateOfBirth}
          onChange={setDateOfBirth}
          className={renterInputClass}
        />
      </div>
      <div>
        <label htmlFor="renter-phone" className={renterLabelClass}>
          Phone
        </label>
        <input
          id="renter-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            clearFieldError('phone')
          }}
          className={renterFieldClass(renterInputClass, Boolean(fieldErrors.phone))}
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? 'renter-phone-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-phone-error" message={fieldErrors.phone} />
      </div>
      <div>
        <label htmlFor="renter-gender" className={renterLabelClass}>
          Gender
        </label>
        <select
          id="renter-gender"
          value={gender}
          onChange={(e) => {
            setGender(e.target.value)
            clearFieldError('gender')
          }}
          className={renterFieldClass(renterSelectClass, Boolean(fieldErrors.gender))}
          aria-invalid={fieldErrors.gender ? true : undefined}
          aria-describedby={fieldErrors.gender ? 'renter-gender-error' : undefined}
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <RenterProfileFieldErrorMsg id="renter-gender-error" message={fieldErrors.gender} />
      </div>
      <div>
        <label htmlFor="renter-nationality" className={renterLabelClass}>
          Nationality
        </label>
        <select
          id="renter-nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          className={renterSelectClass}
        >
          {NATIONALITY_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className={`${renterFieldWrapClass} ${renterFullWidthClass}`}>
        <span id="renter-photo-label" className={renterLabelClass}>
          Profile photo
        </span>
        <div className={renterPhotoRowClass} role="group" aria-labelledby="renter-photo-label">
          <div className={renterPhotoPreviewClass}>
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Your profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[20px] font-semibold text-[var(--quni-navy)]">
                {initialsFromDisplay(studentDisplayName(profile), displayEmail)}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              id="renter-photo-input"
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload profile photo"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              id="renter-photo-pick"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className={renterSecondaryBtnClass}
              aria-labelledby="renter-photo-label"
            >
              {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
            </button>
            {photoError ? <p className={renterWriteErrorClass}>{photoError}</p> : null}
          </div>
        </div>
      </div>
      {savedFlash ? (
        <p className={renterSuccessFlashClass} role="status">
          Personal details saved.
        </p>
      ) : null}
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
