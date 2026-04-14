import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDisplayName } from '../lib/formatDisplayName'
import { useAuthContext } from '../context/AuthContext'
import type { Database } from '../lib/database.types'
import { LandlordStripePayoutsCard } from '../components/landlord/LandlordStripePayoutsCard'
import PageHeroBand from '../components/PageHeroBand'
import { VerifiedLandlordBadge } from '../components/VerifiedLandlordBadge'
import { prepareProfilePhotoForUpload } from '../lib/prepareProfilePhotoForUpload'
import LandlordDuplicateListingModal from '../components/landlord/LandlordDuplicateListingModal'
import LandlordPropertyListingActions from '../components/landlord/LandlordPropertyListingActions'
import { useLandlordPropertyListingActions } from '../hooks/useLandlordPropertyListingActions'
import { listingStatusClass, listingStatusLabel } from '../lib/landlordListingStatus'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']
type PropertyPick = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'title' | 'slug' | 'rent_per_week' | 'room_type' | 'suburb' | 'images' | 'status' | 'featured'
>

/** Supabase Storage bucket id (legacy name); stores profile photos of the landlord. */
const PROFILE_PHOTO_BUCKET = 'landlord-avatars'
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

const LANDLORD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select landlord type' },
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' },
]

function landlordTypeRequiresCompanyDetails(landlordType: string): boolean {
  return landlordType === 'company' || landlordType === 'trust'
}

const AU_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
]

function splitFullName(full: string | null | undefined): [string, string] {
  if (!full?.trim()) return ['', '']
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return [parts[0], '']
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

const BIO_PLACEHOLDER =
  'Tell students about yourself — your management style, response times, and what makes your properties great to live in.'

function landlordPersonalDetailsComplete(p: LandlordRow): boolean {
  return Boolean(
    p.first_name?.trim() && p.last_name?.trim() && p.phone?.trim() && p.address?.trim(),
  )
}

function landlordBioComplete(p: LandlordRow): boolean {
  const t = p.bio?.trim() ?? ''
  return t.length > 20
}

function landlordProfileCompletionStats(p: LandlordRow) {
  const personalOk = landlordPersonalDetailsComplete(p)
  const bankOk = p.stripe_charges_enabled === true
  const bioOk = landlordBioComplete(p)
  const photoOk = Boolean(p.avatar_url?.trim())
  const complete = [personalOk, bankOk, bioOk, photoOk].filter(Boolean).length
  return {
    personalOk,
    bankOk,
    bioOk,
    photoOk,
    pct: Math.round((complete / 4) * 100),
  }
}

function ProfileCompletionSummary({
  profile,
  onGoToSection,
}: {
  profile: LandlordRow
  onGoToSection: (elementId: string) => void
}) {
  const s = landlordProfileCompletionStats(profile)

  return (
    <section
      className="flex rounded-xl border border-gray-100 border-l-4 border-l-[#FF6F61] bg-white shadow-sm overflow-hidden"
      aria-label="Profile completion"
    >
      <div className="flex-1 min-w-0 px-4 py-4">
      <p className="text-sm font-semibold text-gray-900 tabular-nums mb-1">{s.pct}% complete</p>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-800 mb-3">Profile Completion</h2>
      <ul className="space-y-2.5">
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={`shrink-0 w-4 text-center font-semibold ${s.personalOk ? 'text-[#22C55E]' : 'text-gray-400'}`}
            aria-hidden
          >
            {s.personalOk ? '✓' : (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 bg-white align-middle" />
            )}
          </span>
          <span className="font-medium text-gray-800 w-[8.5rem] shrink-0">Personal details</span>
          {s.personalOk ? (
            <span className="text-gray-500">Complete</span>
          ) : (
            <button
              type="button"
              onClick={() => onGoToSection('ll-first')}
              className="text-indigo-600 font-medium hover:text-indigo-800 underline-offset-2 hover:underline"
            >
              Add missing details
            </button>
          )}
        </li>
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={`shrink-0 w-4 text-center font-semibold ${s.bankOk ? 'text-[#22C55E]' : 'text-gray-400'}`}
            aria-hidden
          >
            {s.bankOk ? '✓' : (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 bg-white align-middle" />
            )}
          </span>
          <span className="font-medium text-gray-800 w-[8.5rem] shrink-0">Bank account</span>
          {s.bankOk ? (
            <span className="text-gray-500">Connected</span>
          ) : (
            <button
              type="button"
              onClick={() => onGoToSection('rent-payouts')}
              className="text-indigo-600 font-medium hover:text-indigo-800 underline-offset-2 hover:underline"
            >
              Connect bank account
            </button>
          )}
        </li>
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={`shrink-0 w-4 text-center font-semibold ${s.bioOk ? 'text-[#22C55E]' : 'text-gray-400'}`}
            aria-hidden
          >
            {s.bioOk ? '✓' : (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 bg-white align-middle" />
            )}
          </span>
          <span className="font-medium text-gray-800 w-[8.5rem] shrink-0">Bio</span>
          {s.bioOk ? (
            <span className="text-gray-500">Complete</span>
          ) : (
            <button
              type="button"
              onClick={() => onGoToSection('ll-bio')}
              className="text-indigo-600 font-medium hover:text-indigo-800 underline-offset-2 hover:underline"
            >
              Add a bio
            </button>
          )}
        </li>
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={`shrink-0 w-4 text-center font-semibold ${s.photoOk ? 'text-[#22C55E]' : 'text-gray-400'}`}
            aria-hidden
          >
            {s.photoOk ? '✓' : (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 bg-white align-middle" />
            )}
          </span>
          <span className="font-medium text-gray-800 w-[8.5rem] shrink-0">Profile photo</span>
          {s.photoOk ? (
            <span className="text-gray-500">Complete</span>
          ) : (
            <button
              type="button"
              onClick={() => onGoToSection('landlord-profile-photo')}
              className="text-indigo-600 font-medium hover:text-indigo-800 underline-offset-2 hover:underline"
            >
              Add a photo
            </button>
          )}
        </li>
      </ul>
      </div>
    </section>
  )
}

type LandlordTab = 'profile' | 'properties'

export default function LandlordProfile() {
  const { user, refreshProfile } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<LandlordTab>('profile')
  const [profile, setProfile] = useState<LandlordRow | null>(null)
  const [listings, setListings] = useState<PropertyPick[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [abn, setAbn] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [suburb, setSuburb] = useState('')
  const [addressState, setAddressState] = useState('NSW')
  const [postcode, setPostcode] = useState('')
  const [landlordType, setLandlordType] = useState('')
  const [bio, setBio] = useState('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreeLandlordTerms, setAgreeLandlordTerms] = useState(false)
  const [agreementSaveErr, setAgreementSaveErr] = useState<string | null>(null)
  const [agreementSaving, setAgreementSaving] = useState(false)

  const goToProfileSection = useCallback((elementId: string) => {
    setActiveTab('profile')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }, [])

  useEffect(() => {
    if (!profile) return
    if (location.hash !== '#account-agreements') return
    requestAnimationFrame(() => {
      document.getElementById('account-agreements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [profile, location.hash])

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoadError(null)
    setLoading(true)
    try {
      const { data: profRaw, error: pErr } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr) throw pErr
      const prof = profRaw as LandlordRow | null
      if (!prof) {
        setProfile(null)
        setListings([])
        setLoadError('No landlord profile found.')
        return
      }

      setProfile(prof)
      const [fn, ln] = splitFullName(prof.full_name)
      setFirstName(prof.first_name ?? fn)
      setLastName(prof.last_name ?? ln)
      setPhone(prof.phone ?? '')
      setCompanyName(prof.company_name ?? '')
      setAbn(prof.abn ?? '')
      setAddressLine(prof.address ?? '')
      setSuburb(prof.suburb ?? '')
      setAddressState(prof.state?.trim() || 'NSW')
      setPostcode(prof.postcode ?? '')
      setLandlordType(prof.landlord_type ?? '')
      setBio(prof.bio ?? '')

      const { data: props, error: lErr } = await supabase
        .from('properties')
        .select('id, title, slug, rent_per_week, room_type, suburb, images, status, featured')
        .eq('landlord_id', prof.id)
        .order('created_at', { ascending: false })

      if (lErr) throw lErr
      setListings((props ?? []) as PropertyPick[])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile.'
      setLoadError(msg)
      setProfile(null)
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const flashListingToast = useCallback((t: { kind: 'success' | 'error'; message: string }) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast(t)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 4000)
  }, [])

  const {
    publishingListingId,
    duplicatingListingId,
    updatingListingId,
    duplicateConfirmProperty,
    setDuplicateConfirmProperty,
    publishDraftListing,
    confirmDuplicateListing,
    togglePropertyStatus,
  } = useLandlordPropertyListingActions({
    reload: load,
    navigate,
    showToast: flashListingToast,
  })

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return

    setUploadingPhoto(true)
    try {
      const prepared = await prepareProfilePhotoForUpload(file, MAX_PROFILE_PHOTO_BYTES)
      const path = `${user.id}/profile-photo.${prepared.ext}`

      const { error: upErr } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, prepared.blob, {
        upsert: true,
        contentType: prepared.contentType,
      })
      if (upErr) {
        const m = upErr.message?.trim() || 'Upload failed.'
        setPhotoError(
          m.includes('Bucket not found') || m.includes('not found')
            ? 'Photo storage is not set up yet. Create a public bucket named "landlord-avatars" in Supabase Storage and run supabase/storage_landlord_profile_photos.sql.'
            : /row-level security|RLS|policy/i.test(m)
              ? `${m} Fix storage RLS: run the full supabase/storage_landlord_profile_photos.sql in Supabase SQL Editor (bucket id must be landlord-avatars).`
              : m,
        )
        return
      }

      const { data: pub } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('landlord_profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('user_id', user.id)
      if (dbErr) {
        const m = dbErr.message?.trim() || 'Save failed.'
        setPhotoError(
          /row-level security|RLS|policy/i.test(m)
            ? `${m} Your photo uploaded, but saving the URL failed: check landlord_profiles RLS (policy must allow authenticated users to update their own row, user_id = auth.uid()).`
            : `${m} Your photo may have uploaded; we could not save the link to your profile.`,
        )
        return
      }

      await load()
      await refreshProfile()
    } catch (err: unknown) {
      const raw =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : err instanceof Error
            ? err.message
            : ''
      setPhotoError(raw.trim() || 'Something went wrong.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSaveAgreements() {
    if (!user?.id || !profile) return
    setAgreementSaveErr(null)
    const now = new Date().toISOString()
    const patch: { terms_accepted_at?: string; landlord_terms_accepted_at?: string } = {}
    if (!profile.terms_accepted_at && agreeTerms) patch.terms_accepted_at = now
    if (!profile.landlord_terms_accepted_at && agreeLandlordTerms) patch.landlord_terms_accepted_at = now
    if (Object.keys(patch).length === 0) {
      setAgreementSaveErr('Tick each agreement you want to record, then save.')
      return
    }
    setAgreementSaving(true)
    try {
      const { error } = await supabase.from('landlord_profiles').update(patch).eq('user_id', user.id)
      if (error) throw error
      setAgreeTerms(false)
      setAgreeLandlordTerms(false)
      await load()
      await refreshProfile()
    } catch (e: unknown) {
      const raw =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : ''
      let msg = raw.trim() || 'Could not save agreements.'
      if (/terms_accepted_at|landlord_terms_accepted_at|schema cache|PGRST204|column/i.test(msg)) {
        msg +=
          ' If this mentions a missing column, run `supabase/landlord_profile_terms_columns.sql` in the Supabase SQL Editor, then try again.'
      }
      setAgreementSaveErr(msg)
    } finally {
      setAgreementSaving(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSaveError(null)
    setToast(null)
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setSaving(true)
    try {
      const needsBiz = landlordTypeRequiresCompanyDetails(landlordType.trim())
      if (needsBiz && (!companyName.trim() || !abn.trim())) {
        setSaveError('Company name and ABN are required when landlord type is Company or Trust.')
        setSaving(false)
        return
      }
      const fnNorm = firstName.trim() ? formatDisplayName(firstName.trim()) : null
      const lnNorm = lastName.trim() ? formatDisplayName(lastName.trim()) : null
      const combinedName = [fnNorm, lnNorm].filter(Boolean).join(' ') || null
      const { error: uErr } = await supabase
        .from('landlord_profiles')
        .update({
          first_name: fnNorm,
          last_name: lnNorm,
          full_name: combinedName,
          phone: phone.trim() || null,
          company_name: needsBiz ? companyName.trim() || null : null,
          abn: needsBiz ? abn.trim() || null : null,
          address: addressLine.trim() || null,
          suburb: suburb.trim() || null,
          state: addressState.trim() || null,
          postcode: postcode.trim() || null,
          landlord_type: landlordType.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('user_id', user.id)

      if (uErr) throw uErr

      setToast({ kind: 'success', message: 'Profile updated successfully ✓' })
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null)
        toastTimerRef.current = null
        navigate('/landlord/dashboard')
      }, 2000)
    } catch (e: unknown) {
      setSaveError(null)
      setToast({ kind: 'error', message: 'Failed to save profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const displayEmail = profile?.email ?? user?.email ?? ''

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
        <PageHeroBand
          title="Landlord Profile"
          subtitle="Manage your details and connect with students"
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
          title="Landlord Profile"
          subtitle="Manage your details and connect with students"
        />
        <div className="max-w-site mx-auto px-4 sm:px-6 py-10">
          <p className="text-red-600 text-sm">{loadError ?? 'Profile unavailable.'}</p>
          <Link to="/landlord-dashboard" className="text-indigo-600 text-sm font-medium mt-4 inline-block">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const profilePhotoUrl = profile.avatar_url
  const llInputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
  const llLabelClass = 'block text-sm font-semibold text-gray-900 mb-1'
  const needsBiz = landlordTypeRequiresCompanyDetails(landlordType)

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <PageHeroBand
        title="Landlord Profile"
        subtitle="Manage your details and connect with students"
      />

      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 w-full">
      {profile.verified ? (
        <div className="mb-4 flex justify-center sm:justify-start">
          <VerifiedLandlordBadge />
        </div>
      ) : null}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-1 -mb-px" role="tablist" aria-label="Landlord account sections">
          <button
            type="button"
            role="tab"
            id="tab-profile"
            aria-selected={activeTab === 'profile'}
            aria-controls="panel-profile"
            tabIndex={0}
            onClick={() => setActiveTab('profile')}
            className={[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors inline-flex items-center gap-2',
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
            ].join(' ')}
          >
            Profile
          </button>
          <button
            type="button"
            role="tab"
            id="tab-properties"
            aria-selected={activeTab === 'properties'}
            aria-controls="panel-properties"
            tabIndex={0}
            onClick={() => setActiveTab('properties')}
            className={[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors inline-flex items-center gap-2',
              activeTab === 'properties'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
            ].join(' ')}
          >
            Properties
            {listings.length > 0 && (
              <span className="tabular-nums rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {listings.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {toast && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm font-semibold text-white ${
            toast.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
          role={toast.kind === 'success' ? 'status' : 'alert'}
        >
          {toast.message}
        </div>
      )}

      <div
        id="panel-profile"
        role="tabpanel"
        aria-labelledby="tab-profile"
        hidden={activeTab !== 'profile'}
      >
      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        <aside className="order-1 lg:order-2 lg:col-span-4 mb-6 lg:mb-0 lg:sticky lg:top-24 self-start w-full">
          <ProfileCompletionSummary profile={profile} onGoToSection={goToProfileSection} />
        </aside>
        <div className="order-2 lg:order-1 lg:col-span-8 min-w-0 space-y-8">
      {(!profile.terms_accepted_at || !profile.landlord_terms_accepted_at) && (
        <section
          id="account-agreements"
          className="mb-8 rounded-2xl border border-[#FF6F61]/25 bg-[#FEF9E4] p-6 sm:p-7 w-full shadow-sm"
        >
          <h2 className="text-lg font-bold text-stone-900">Legal agreements</h2>
          <p className="text-sm text-stone-600 mt-1 mb-5">
            Record your acceptance to unlock your full landlord checklist.
          </p>
          <div className="space-y-4">
            {!profile.terms_accepted_at && (
              <label className="flex gap-3 items-start cursor-pointer text-sm text-stone-800 leading-relaxed">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked)
                    setAgreementSaveErr(null)
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#FF6F61]"
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF6F61] font-medium underline underline-offset-2"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF6F61] font-medium underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
            )}
            {!profile.landlord_terms_accepted_at && (
              <label className="flex gap-3 items-start cursor-pointer text-sm text-stone-800 leading-relaxed">
                <input
                  type="checkbox"
                  checked={agreeLandlordTerms}
                  onChange={(e) => {
                    setAgreeLandlordTerms(e.target.checked)
                    setAgreementSaveErr(null)
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#FF6F61]"
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="/landlord-service-agreement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF6F61] font-medium underline underline-offset-2"
                  >
                    Landlord Service Agreement
                  </a>
                </span>
              </label>
            )}
          </div>
          {agreementSaveErr && (
            <p className="text-sm text-red-700 mt-4" role="alert">
              {agreementSaveErr}
            </p>
          )}
          <button
            type="button"
            disabled={agreementSaving}
            onClick={() => void handleSaveAgreements()}
            className="mt-5 rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50 transition-colors"
          >
            {agreementSaving ? 'Saving…' : 'Save acceptances'}
          </button>
        </section>
      )}

      <LandlordStripePayoutsCard profile={profile} onRefresh={load} />

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 w-full">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ll-first" className={llLabelClass}>
                First name
              </label>
              <input
                id="ll-first"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={llInputClass}
              />
            </div>
            <div>
              <label htmlFor="ll-last" className={llLabelClass}>
                Last name
              </label>
              <input
                id="ll-last"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={llInputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ll-phone" className={llLabelClass}>
                  Phone
                </label>
                <input
                  id="ll-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={llInputClass}
                />
              </div>
              <div>
                <label htmlFor="ll-type" className={llLabelClass}>
                  Landlord type
                </label>
                <select
                  id="ll-type"
                  value={landlordType}
                  onChange={(e) => setLandlordType(e.target.value)}
                  className={llInputClass}
                >
                  {LANDLORD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Helps students understand who they&apos;re renting from. Company and Trust require a company name and ABN.
            </p>
          </div>

          {needsBiz && (
            <div>
              <label htmlFor="ll-company" className={llLabelClass}>
                Company name <span className="text-red-600">*</span>
              </label>
              <input
                id="ll-company"
                type="text"
                autoComplete="organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={llInputClass}
                required={needsBiz}
              />
            </div>
          )}

          <div>
            <label htmlFor="ll-email" className={llLabelClass}>
              Email
            </label>
            <input
              id="ll-email"
              type="email"
              readOnly
              value={displayEmail}
              className="w-full rounded-lg border border-gray-900/10 bg-gray-50 text-gray-600 px-3 py-2 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email can&apos;t be changed here.</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Business or correspondence address (same format as property listings).
            </p>
            <div>
              <label htmlFor="ll-address" className={llLabelClass}>
                Street address
              </label>
              <input
                id="ll-address"
                type="text"
                autoComplete="street-address"
                placeholder="Unit / street number and name"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className={llInputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ll-suburb" className={llLabelClass}>
                  Suburb
                </label>
                <input
                  id="ll-suburb"
                  type="text"
                  autoComplete="address-level2"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  className={llInputClass}
                />
              </div>
              <div>
                <label htmlFor="ll-postcode" className={llLabelClass}>
                  Postcode
                </label>
                <input
                  id="ll-postcode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  placeholder="e.g. 2000"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className={llInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ll-state" className={llLabelClass}>
                  State
                </label>
                <select
                  id="ll-state"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className={llInputClass}
                >
                  {AU_STATE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {needsBiz ? (
                <div>
                  <label htmlFor="ll-abn" className={llLabelClass}>
                    ABN <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="ll-abn"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="e.g. 12 345 678 901"
                    value={abn}
                    onChange={(e) => setAbn(e.target.value)}
                    className={llInputClass}
                    required={needsBiz}
                  />
                  <p className="text-xs text-gray-500 mt-1">Australian Business Number</p>
                </div>
              ) : (
                <div className="hidden sm:block min-h-[1px]" aria-hidden />
              )}
            </div>
          </div>

          <div>
            <label htmlFor="ll-bio" className={llLabelClass}>
              Bio
            </label>
            <textarea
              id="ll-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={BIO_PLACEHOLDER}
              className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y min-h-[6rem] bg-white"
            />
          </div>

          <div id="landlord-profile-photo">
            <span className={llLabelClass}>Photo of yourself</span>
            <p className="text-xs text-gray-500 mb-2">Students see this on your listings. Use a clear photo of you, not a logo.</p>
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
                <p className="text-xs text-gray-500 mt-2">Larger photos are resized automatically (max 2 MB).</p>
                {photoError && <p className="text-xs text-red-600 mt-2">{photoError}</p>}
              </div>
            </div>
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{saveError}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>
        </div>
      </div>
      </div>

      <div
        id="panel-properties"
        role="tabpanel"
        aria-labelledby="tab-properties"
        hidden={activeTab !== 'properties'}
      >
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">My listings</h2>
          <Link
            to="/landlord-dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white px-4 py-2 text-sm font-medium hover:bg-[#e85d52] w-fit"
          >
            Add new listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
            <p className="text-gray-600 text-sm font-medium">No listings yet</p>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              Create your first property from the dashboard to show it here.
            </p>
            <Link
              to="/landlord-dashboard"
              className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Go to landlord dashboard
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {listings.map((p) => {
              const thumb = p.images?.[0]
              const rent = Number(p.rent_per_week)
              return (
                <li
                  key={p.id}
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
                        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                        {p.suburb && <p className="text-sm text-gray-500 mt-0.5">{p.suburb}</p>}
                        <p className="text-base font-semibold text-gray-900 mt-1">
                          ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          <span className="text-sm font-normal text-gray-500"> /wk</span>
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${listingStatusClass(p.status)}`}
                      >
                        {listingStatusLabel(p.status)}
                      </span>
                    </div>
                    <LandlordPropertyListingActions
                      property={p}
                      publishingListingId={publishingListingId}
                      duplicatingListingId={duplicatingListingId}
                      updatingListingId={updatingListingId}
                      onPublish={publishDraftListing}
                      onDuplicateClick={(prop) => setDuplicateConfirmProperty({ id: prop.id, title: prop.title })}
                      onToggle={togglePropertyStatus}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      </div>

      <LandlordDuplicateListingModal
        open={duplicateConfirmProperty != null}
        duplicatingListingId={duplicatingListingId}
        onConfirm={() => void confirmDuplicateListing()}
        onCancel={() => setDuplicateConfirmProperty(null)}
      />
      </div>
    </div>
  )
}
