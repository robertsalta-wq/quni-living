import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { getValidAccessTokenForFunctions } from '../lib/supabaseEdgeInvoke'
import { readSupabaseFunctionInvokeError } from '../lib/readSupabaseFunctionInvokeError'
import { removeAllStudentVerificationDocuments } from '../lib/studentDocumentsStorage'
import type { Database } from '../lib/database.types'
import { StudentStripePaymentsCard } from '../components/student/StudentStripePaymentsCard'
import { StudentVerificationPanel } from '../components/student/StudentVerificationPanel'
import { StudentDeleteAccountModal } from '../components/student/StudentDeleteAccountModal'
import PageHeroBand from '../components/PageHeroBand'
import UniversityCampusSelect from '../components/UniversityCampusSelect'
import { useUniversityCampusReference } from '../hooks/useUniversityCampusReference'
import { fetchCampusesForUniversityId } from '../lib/universityCampusReference'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type BookingWithProperty = {
  id: string
  start_date: string
  end_date: string | null
  weekly_rent: number | null
  status: Database['public']['Tables']['bookings']['Row']['status']
  notes: string | null
  created_at: string
  property: {
    id: string
    title: string
    slug: string
    rent_per_week: number
    suburb: string | null
    images: string[] | null
  } | null
}

/** Supabase Storage bucket id (legacy name); stores profile photos of the student. */
const PROFILE_PHOTO_BUCKET = 'student-avatars'
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
]

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select year' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year / Honours' },
  { value: '6', label: 'Postgraduate' },
]

const NATIONALITY_OPTIONS: { value: string; label: string }[] = [
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

const STUDENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select student type' },
  { value: 'domestic', label: 'Domestic' },
  { value: 'international', label: 'International' },
]

const ROOM_PREF_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select room type' },
  { value: 'single', label: 'Single Room' },
  { value: 'shared', label: 'Shared Room' },
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
]

function splitFullName(full: string | null | undefined): [string, string] {
  if (!full?.trim()) return ['', '']
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return [parts[0]!, '']
  return [parts[0]!, parts.slice(1).join(' ')]
}

function initialsFrom(first: string, last: string, fullFallback: string | null, email: string | null | undefined) {
  const f = first.trim()
  const l = last.trim()
  if (f || l) {
    const a = f[0] ?? ''
    const b = l[0] ?? f[1] ?? ''
    return `${a}${b}`.toUpperCase() || '?'
  }
  const s = (fullFallback?.trim() || email?.split('@')[0] || '?').split(/\s+/)
  return s
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function bookingStatusClass(status: BookingWithProperty['status']) {
  switch (status) {
    case 'confirmed':
    case 'active':
      return 'bg-emerald-100 text-emerald-800'
    case 'pending':
    case 'pending_payment':
    case 'pending_confirmation':
      return 'bg-amber-100 text-amber-900'
    case 'cancelled':
      return 'bg-gray-100 text-gray-700'
    case 'completed':
      return 'bg-indigo-100 text-indigo-800'
    case 'declined':
    case 'expired':
    case 'payment_failed':
      return 'bg-red-50 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

type StudentTab = 'profile' | 'verification' | 'bookings'

export default function StudentProfile() {
  const { user, refreshProfile, signOut } = useAuthContext()
  const navigate = useNavigate()
  const {
    universities: refUniversities,
    loading: refDataLoading,
    error: refDataError,
  } = useUniversityCampusReference()
  const [activeTab, setActiveTab] = useState<StudentTab>('profile')
  const [profile, setProfile] = useState<StudentRow | null>(null)
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [nationality, setNationality] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [course, setCourse] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [isSmoker, setIsSmoker] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [studentType, setStudentType] = useState('')
  const [roomPref, setRoomPref] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoadError(null)
    setLoading(true)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr) throw pErr
      const prof = profRaw as StudentRow | null
      if (!prof) {
        setProfile(null)
        setLoadError('No student profile found.')
        return
      }

      setProfile(prof)
      const [fn, ln] = splitFullName(prof.full_name)
      setFirstName(prof.first_name ?? fn)
      setLastName(prof.last_name ?? ln)
      setPhone(prof.phone ?? '')
      setGender(prof.gender ?? '')
      setNationality(prof.nationality ?? '')
      setYearOfStudy(prof.year_of_study != null ? String(prof.year_of_study) : '')
      setCourse(prof.course ?? '')
      setEmergencyName(prof.emergency_contact_name ?? '')
      setEmergencyPhone(prof.emergency_contact_phone ?? '')
      setIsSmoker(Boolean(prof.is_smoker))
      setDateOfBirth(prof.date_of_birth ? prof.date_of_birth.slice(0, 10) : '')
      setUniversityId(prof.university_id ?? '')
      setCampusId(prof.campus_id ?? '')
      setStudentType(prof.student_type ?? '')
      setRoomPref(prof.room_type_preference ?? '')
      setBudgetMin(
        prof.budget_min_per_week != null ? String(prof.budget_min_per_week) : '',
      )
      setBudgetMax(
        prof.budget_max_per_week != null ? String(prof.budget_max_per_week) : '',
      )

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile.'
      setLoadError(msg)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (activeTab !== 'bookings' || !profile?.id) return
    let cancelled = false
    ;(async () => {
      setBookingsLoading(true)
      setBookingsError(null)
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(
            `
            id,
            start_date,
            end_date,
            weekly_rent,
            status,
            notes,
            created_at,
            property:properties ( id, title, slug, rent_per_week, suburb, images )
          `,
          )
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (!cancelled) {
          const rows = (data ?? []) as unknown as BookingWithProperty[]
          setBookings(rows)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setBookingsError(e instanceof Error ? e.message : 'Could not load bookings.')
          setBookings([])
        }
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, profile?.id])

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setPhotoError('Photo must be 2 MB or smaller.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }

    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg'
      const path = `${user.id}/profile-photo.${safeExt}`

      const { error: upErr } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('student_profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('user_id', user.id)
      if (dbErr) throw dbErr

      await load()
      await refreshProfile()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setPhotoError(
        msg.includes('Bucket not found') || msg.includes('not found')
          ? 'Photo storage is not set up yet. Create a public bucket named "student-avatars" in Supabase Storage and run supabase/storage_student_profile_photos.sql.'
          : msg,
      )
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user?.id) return
    setDeleteAccountError(null)
    setDeleteAccountBusy(true)
    try {
      try {
        await removeAllStudentVerificationDocuments(supabase, user.id)
      } catch (e) {
        console.error('Student verification documents cleanup failed before account delete', e)
      }
      const auth = await getValidAccessTokenForFunctions()
      if ('error' in auth) {
        setDeleteAccountError(auth.error)
        return
      }
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'delete-student-account',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      )
      if (error) {
        setDeleteAccountError(await readSupabaseFunctionInvokeError(data, error))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setDeleteAccountError(String(data.error))
        return
      }
      await signOut()
      navigate('/')
    } finally {
      setDeleteAccountBusy(false)
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSaveError(null)
    setSaving(true)
    try {
      const combinedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null
      const yearNum = yearOfStudy === '' ? null : parseInt(yearOfStudy, 10)
      const bMin = budgetMin.trim() === '' ? null : Number(budgetMin)
      const bMax = budgetMax.trim() === '' ? null : Number(budgetMax)
      if (budgetMin.trim() !== '' && Number.isNaN(bMin)) {
        setSaveError('Budget minimum must be a number.')
        return
      }
      if (budgetMax.trim() !== '' && Number.isNaN(bMax)) {
        setSaveError('Budget maximum must be a number.')
        return
      }

      let selectedCampusValid = !campusId
      if (campusId && universityId.trim()) {
        const slug = refUniversities.find((u) => u.id === universityId.trim())?.slug
        const rows = await fetchCampusesForUniversityId(universityId.trim(), slug ?? null)
        selectedCampusValid = rows.some((c) => c.id === campusId)
      }

      const { error: uErr } = await supabase
        .from('student_profiles')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: combinedName,
          phone: phone.trim() || null,
          gender: gender.trim() || null,
          nationality: nationality.trim() || null,
          year_of_study: yearNum,
          course: course.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          is_smoker: isSmoker,
          date_of_birth: dateOfBirth.trim() || null,
          university_id: universityId.trim() || null,
          campus_id: universityId && selectedCampusValid ? campusId || null : null,
          student_type: studentType.trim() || null,
          room_type_preference: roomPref.trim() || null,
          budget_min_per_week: bMin,
          budget_max_per_week: bMax,
        })
        .eq('user_id', user.id)

      if (uErr) throw uErr

      await load()
      await refreshProfile()
      navigate('/student-dashboard', { replace: true })
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Save failed.'
      setSaveError(
        raw.includes('column') && raw.includes('does not exist')
          ? 'Database is missing student profile columns. Run supabase/student_profile_extend.sql in the Supabase SQL Editor.'
          : raw,
      )
    } finally {
      setSaving(false)
    }
  }

  const displayEmail = profile?.email ?? user?.email ?? ''

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <PageHeroBand
          title="My Profile"
          subtitle="Keep your details up to date for landlords"
        />
        <div className="min-h-[40vh] flex flex-1 items-center justify-center">
          <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (loadError || !profile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <PageHeroBand
          title="My Profile"
          subtitle="Keep your details up to date for landlords"
        />
        <div className="max-w-site mx-auto px-4 sm:px-6 py-10">
          <p className="text-red-600 text-sm">{loadError ?? 'Profile unavailable.'}</p>
          <Link to="/student-dashboard" className="text-indigo-600 text-sm font-medium mt-4 inline-block">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const profilePhotoUrl = profile.avatar_url
  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <PageHeroBand
        title="My Profile"
        subtitle="Keep your details up to date for landlords"
      />

      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 w-full">
      <div
        className="flex flex-wrap gap-2 border-b border-gray-200 pb-px mb-8"
        role="tablist"
        aria-label="Student account sections"
      >
        <button
          type="button"
          role="tab"
          id="tab-student-profile"
          aria-selected={activeTab === 'profile'}
          aria-controls="panel-student-profile"
          tabIndex={0}
          onClick={() => setActiveTab('profile')}
          className={`relative px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
            activeTab === 'profile'
              ? 'text-indigo-600 bg-white border border-gray-200 border-b-white -mb-px z-[1]'
              : 'text-gray-600 hover:text-gray-900 border border-transparent'
          }`}
        >
          Profile
        </button>
        <button
          type="button"
          role="tab"
          id="tab-student-verification"
          aria-selected={activeTab === 'verification'}
          aria-controls="panel-student-verification"
          tabIndex={0}
          onClick={() => setActiveTab('verification')}
          className={`relative px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
            activeTab === 'verification'
              ? 'text-indigo-600 bg-white border border-gray-200 border-b-white -mb-px z-[1]'
              : 'text-gray-600 hover:text-gray-900 border border-transparent'
          }`}
        >
          Verification
        </button>
        <button
          type="button"
          role="tab"
          id="tab-student-bookings"
          aria-selected={activeTab === 'bookings'}
          aria-controls="panel-student-bookings"
          tabIndex={0}
          onClick={() => setActiveTab('bookings')}
          className={`relative px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
            activeTab === 'bookings'
              ? 'text-indigo-600 bg-white border border-gray-200 border-b-white -mb-px z-[1]'
              : 'text-gray-600 hover:text-gray-900 border border-transparent'
          }`}
        >
          Bookings
        </button>
      </div>

      <div
        id="panel-student-profile"
        role="tabpanel"
        aria-labelledby="tab-student-profile"
        hidden={activeTab !== 'profile'}
      >
        <StudentStripePaymentsCard profile={profile} onRefresh={load} />

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 w-full">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-first" className={labelClass}>
                  First name
                </label>
                <input
                  id="st-first"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-last" className={labelClass}>
                  Last name
                </label>
                <input
                  id="st-last"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="st-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-gender" className={labelClass}>
                  Gender
                </label>
                <select
                  id="st-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputClass}
                >
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-nationality" className={labelClass}>
                  Nationality
                </label>
                <select
                  id="st-nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className={inputClass}
                >
                  {NATIONALITY_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="st-year" className={labelClass}>
                  Year of study
                </label>
                <select
                  id="st-year"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className={inputClass}
                >
                  {YEAR_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="st-course" className={labelClass}>
                Course
              </label>
              <input
                id="st-course"
                type="text"
                autoComplete="off"
                placeholder="e.g. Bachelor of Arts"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="st-email" className={labelClass}>
                Email
              </label>
              <input
                id="st-email"
                type="email"
                readOnly
                value={displayEmail}
                className="w-full rounded-lg border border-gray-900/10 bg-gray-50 text-gray-600 px-3 py-2 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email can&apos;t be changed here.</p>
            </div>

            <div>
              <span className="block text-sm font-semibold text-gray-900 mb-1">Photo of yourself</span>
              <p className="text-xs text-gray-500 mb-2">A clear photo helps landlords recognise you. Face visible, no logos or cartoons.</p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-indigo-100 border border-gray-200 shrink-0">
                  {profilePhotoUrl ? (
                    <img
                      key={profilePhotoUrl}
                      src={profilePhotoUrl}
                      alt="Your profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-800 text-xl font-semibold">
                      {initialsFrom(firstName, lastName, profile.full_name, displayEmail)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto min-h-[3rem] px-6 rounded-lg border-2 border-indigo-600 text-indigo-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    <span className="text-lg leading-none">+</span>
                    {uploadingPhoto ? 'Uploading…' : 'Upload your photo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Max: 2 MB</p>
                  {photoError && <p className="text-xs text-red-600 mt-2">{photoError}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-em-name" className={labelClass}>
                  Emergency contact name
                </label>
                <input
                  id="st-em-name"
                  type="text"
                  autoComplete="name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-em-phone" className={labelClass}>
                  Emergency contact number
                </label>
                <input
                  id="st-em-phone"
                  type="tel"
                  autoComplete="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-dob" className={labelClass}>
                  Date of birth
                </label>
                <input
                  id="st-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-type" className={labelClass}>
                  Student type
                </label>
                <select
                  id="st-type"
                  value={studentType}
                  onChange={(e) => setStudentType(e.target.value)}
                  className={inputClass}
                >
                  {STUDENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <UniversityCampusSelect
              universityId={universityId || null}
              campusId={campusId || null}
              onUniversityChange={(id) => {
                setUniversityId(id)
                setCampusId('')
              }}
              onCampusChange={setCampusId}
              showState
              variant="responsiveGrid"
              labelClassName={labelClass}
              universitySelectClassName={inputClass}
              campusSelectClassName={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
              universityIdAttr="st-uni"
              campusIdAttr="st-campus"
            />
            {refDataError && (
              <p className="text-xs text-red-600 mt-2" role="alert">
                Could not load universities: {refDataError}
              </p>
            )}
            {refUniversities.length === 0 && !refDataLoading && !refDataError && (
              <p className="text-xs text-gray-500">No universities in the database yet.</p>
            )}

            <div>
              <label htmlFor="st-room" className={labelClass}>
                Room type preference
              </label>
              <select
                id="st-room"
                value={roomPref}
                onChange={(e) => setRoomPref(e.target.value)}
                className={inputClass}
              >
                {ROOM_PREF_OPTIONS.map((o) => (
                  <option key={o.value || 'empty'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-bmin" className={labelClass}>
                  Budget minimum ($/week)
                </label>
                <input
                  id="st-bmin"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 400"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="st-bmax" className={labelClass}>
                  Budget maximum ($/week)
                </label>
                <input
                  id="st-bmax"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="st-smoker"
                type="checkbox"
                checked={isSmoker}
                onChange={(e) => setIsSmoker(e.target.checked)}
                className="h-4 w-4 rounded border-gray-900/30 text-indigo-600 focus:ring-indigo-400"
              />
              <label htmlFor="st-smoker" className="text-sm font-semibold text-gray-900">
                I am a smoker
              </label>
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{saveError}</div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-gray-900 text-white py-3 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Submit'}
            </button>
          </form>
        </section>

        <section
          className="mt-8 bg-white rounded-2xl border border-red-200 shadow-sm p-6 sm:p-8 w-full"
          aria-labelledby="danger-zone-heading"
        >
          <h2 id="danger-zone-heading" className="text-base font-semibold text-gray-900">
            Danger zone
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Permanently delete your student account and all verification documents stored for your profile.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeleteAccountError(null)
              setDeleteAccountOpen(true)
            }}
            className="mt-4 rounded-lg border-2 border-red-300 text-red-700 bg-red-50/80 px-4 py-2.5 text-sm font-semibold hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            Delete account
          </button>
        </section>

        <StudentDeleteAccountModal
          open={deleteAccountOpen}
          onClose={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
          onDelete={handleDeleteAccount}
          deleting={deleteAccountBusy}
          error={deleteAccountError}
        />
      </div>

      <div
        id="panel-student-verification"
        role="tabpanel"
        aria-labelledby="tab-student-verification"
        hidden={activeTab !== 'verification'}
      >
        {user?.id && (
          <StudentVerificationPanel profile={profile} userId={user.id} onRefresh={load} />
        )}
      </div>

      <div
        id="panel-student-bookings"
        role="tabpanel"
        aria-labelledby="tab-student-bookings"
        hidden={activeTab !== 'bookings'}
      >
        <section className="w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Your bookings</h2>
          <p className="text-sm text-gray-500 mb-6">Properties you&apos;ve booked or applied for.</p>

          {bookingsLoading && (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!bookingsLoading && bookingsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bookingsError}</div>
          )}

          {!bookingsLoading && !bookingsError && bookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
              <p className="text-gray-600 text-sm font-medium">No bookings yet</p>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                When you book a place, it will show up here.
              </p>
              <Link
                to="/listings"
                className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Browse listings
              </Link>
            </div>
          )}

          {!bookingsLoading && !bookingsError && bookings.length > 0 && (
            <ul className="space-y-4">
              {bookings.map((b) => {
                const p = b.property
                const thumb = p?.images?.[0]
                const rent = b.weekly_rent ?? p?.rent_per_week
                return (
                  <li
                    key={b.id}
                    className="flex flex-col sm:flex-row gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="sm:w-40 h-36 sm:h-auto shrink-0 bg-gray-100">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 sm:py-4 sm:pr-4 flex flex-col min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {p?.title ?? 'Listing unavailable'}
                          </h3>
                          {p?.suburb && <p className="text-sm text-gray-500 mt-0.5">{p.suburb}</p>}
                          <p className="text-sm text-gray-600 mt-2">
                            {b.start_date}
                            {b.end_date ? ` → ${b.end_date}` : ''}
                          </p>
                          {rent != null && (
                            <p className="text-base font-semibold text-gray-900 mt-1">
                              ${Number(rent).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              <span className="text-sm font-normal text-gray-500"> /wk</span>
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${bookingStatusClass(b.status)}`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="mt-auto pt-4">
                        {p?.slug && (
                          <Link
                            to={`/properties/${p.slug}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            View listing
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}
