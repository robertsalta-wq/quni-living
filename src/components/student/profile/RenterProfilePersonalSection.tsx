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

type Props = {
  profile: StudentRow
  userId: string
  displayEmail: string
  onSaved: () => void | Promise<void>
}

type PersonalDraft = {
  firstName: string
  lastName: string
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
    phone: prof.phone ?? '',
    gender: prof.gender ?? '',
    nationality: prof.nationality ?? '',
    dateOfBirth: prof.date_of_birth ? prof.date_of_birth.slice(0, 10) : '',
  }
}

/** Per-field: empty draft strings fall back to saved profile (stale empty draft must not win). */
function mergePersonalDraftWithProfile(draft: PersonalDraft, fromProfile: PersonalDraft): PersonalDraft {
  const pick = (draftVal: string, profileVal: string) => (draftVal.trim() !== '' ? draftVal : profileVal)
  return {
    firstName: pick(draft.firstName, fromProfile.firstName),
    lastName: pick(draft.lastName, fromProfile.lastName),
    phone: pick(draft.phone, fromProfile.phone),
    gender: pick(draft.gender, fromProfile.gender),
    nationality: pick(draft.nationality, fromProfile.nationality),
    dateOfBirth: pick(draft.dateOfBirth, fromProfile.dateOfBirth),
  }
}

export function RenterProfilePersonalSection({ profile, userId, displayEmail, onSaved }: Props) {
  const initialFields = personalFieldsFromProfile(profile)
  const { restoreDraftMerged, syncDraft, setBaseline, clearDraft, shouldApplyProfile, markReady } =
    useProfileSectionDraft(userId, 'personal')
  const [firstName, setFirstName] = useState(initialFields.firstName)
  const [lastName, setLastName] = useState(initialFields.lastName)
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
    syncDraft({ firstName, lastName, phone, gender, nationality, dateOfBirth })
  }, [firstName, lastName, phone, gender, nationality, dateOfBirth, syncDraft])

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
    if (Object.keys(errors).length > 0) {
      applyValidationErrors(errors)
      return
    }

    setSaving(true)
    try {
      const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { error: upErr } = await withSentryMonitoring('RenterProfilePersonalSection/save', () =>
        supabase
          .from('student_profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: combinedName,
            phone: phone.trim(),
            gender: gender.trim(),
            nationality: nationality.trim() || null,
            date_of_birth: dateOfBirth.trim() || null,
          })
          .eq('user_id', userId),
      )
      if (upErr) throw upErr
      const savedFields: PersonalDraft = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        nationality: nationality.trim(),
        dateOfBirth: dateOfBirth.trim(),
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
        <label htmlFor="renter-first" className="renter-profile-field-label">
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
          className={renterFieldClass('renter-profile-input', Boolean(fieldErrors.firstName))}
          aria-invalid={fieldErrors.firstName ? true : undefined}
          aria-describedby={fieldErrors.firstName ? 'renter-first-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-first-error" message={fieldErrors.firstName} />
      </div>
      <div>
        <label htmlFor="renter-last" className="renter-profile-field-label">
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
          className={renterFieldClass('renter-profile-input', Boolean(fieldErrors.lastName))}
          aria-invalid={fieldErrors.lastName ? true : undefined}
          aria-describedby={fieldErrors.lastName ? 'renter-last-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-last-error" message={fieldErrors.lastName} />
      </div>
      <div>
        <label htmlFor="renter-dob" className="renter-profile-field-label">
          Date of birth
        </label>
        <AUDateField
          id="renter-dob"
          birthDate
          value={dateOfBirth}
          onChange={setDateOfBirth}
          className="renter-profile-input"
        />
      </div>
      <div>
        <label htmlFor="renter-phone" className="renter-profile-field-label">
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
          className={renterFieldClass('renter-profile-input', Boolean(fieldErrors.phone))}
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? 'renter-phone-error' : undefined}
        />
        <RenterProfileFieldErrorMsg id="renter-phone-error" message={fieldErrors.phone} />
      </div>
      <div>
        <label htmlFor="renter-gender" className="renter-profile-field-label">
          Gender
        </label>
        <select
          id="renter-gender"
          value={gender}
          onChange={(e) => {
            setGender(e.target.value)
            clearFieldError('gender')
          }}
          className={renterFieldClass('renter-profile-select', Boolean(fieldErrors.gender))}
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
        <label htmlFor="renter-nationality" className="renter-profile-field-label">
          Nationality
        </label>
        <select
          id="renter-nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          className="renter-profile-select"
        >
          {NATIONALITY_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }} className="renter-profile-field">
        <span className="renter-profile-field-label">Profile photo</span>
        <div className="renter-profile-photo-row">
          <div className="renter-profile-photo-preview">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Your profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--quni-navy)',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {initialsFromDisplay(studentDisplayName(profile), displayEmail)}
              </div>
            )}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="renter-profile-btn-secondary"
              style={{ flex: 'none', width: 'auto' }}
            >
              {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
            </button>
            {photoError ? <p className="renter-profile-error">{photoError}</p> : null}
          </div>
        </div>
      </div>
      {savedFlash ? (
        <p className="renter-profile-success-flash" style={{ gridColumn: '1 / -1' }} role="status">
          Personal details saved.
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
