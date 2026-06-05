import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { withSentryMonitoring } from '../../lib/supabaseErrorMonitor'
import { useAuthContext } from '../../context/AuthContext'
import type { Database } from '../../lib/database.types'
import { isValidAuPhone } from '../../lib/studentOnboarding'
import {
  inferLandlordWizardStep,
  landlordStripeStepComplete,
  landlordTermsComplete,
  setLandlordWizardCompleteLocalStorage,
  type LandlordWizardStep,
} from '../../lib/landlordOnboarding'
import { usePlatformFeatures } from '../../context/PlatformFeaturesContext'
import { MANAGED_COMING_SOON_SHORT } from '../../lib/managedComingSoonCopy'
import { looksLikeMissingDbColumn, messageFromSupabaseError } from '../../lib/supabaseErrorMessage'
import { nonDiscriminationAcceptancePatch } from '../../lib/nonDiscriminationPolicy'
import { reportFormError } from '../../lib/reportFormError'
import PageHeroBand from '../../components/PageHeroBand'
import { prepareProfilePhotoForUpload } from '../../lib/prepareProfilePhotoForUpload'
import LandlordListingPaymentModal from '../../components/landlord/LandlordListingPaymentModal'
import {
  INTENDED_LANDLORD_SERVICE_TIER_KEY,
  parseLandlordServiceTier,
  type LandlordServiceTier,
} from '../../lib/landlordServiceTier'
import { useScrollToTopOnChange } from '../../hooks/useScrollToTopOnChange'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

const PROFILE_PHOTO_BUCKET = 'landlord-avatars'
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

const LANDLORD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select landlord type' },
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'trust', label: 'Trust' },
]

function landlordTypeRequiresCompanyDetails(landlordType: string): boolean {
  return landlordType === 'company' || landlordType === 'trust'
}

const AU_STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const

const BIO_PLACEHOLDER =
  'Tell students about yourself — your management style, response times, and what makes your properties great to live in.'

const LANDLORD_ONBOARDING_DRAFT_KEY = 'landlord_onboarding_draft' as const
const LANDLORD_ONBOARDING_DRAFT_VERSION = 1 as const

const LANDLORD_TYPE_VALUE_SET = new Set(LANDLORD_TYPE_OPTIONS.map((o) => o.value).filter(Boolean))
const AU_STATE_VALUE_SET = new Set<string>(AU_STATE_OPTIONS)

/** Local draft — terms checkboxes are never persisted. */
type LandlordOnboardingDraftV1 = {
  v: typeof LANDLORD_ONBOARDING_DRAFT_VERSION
  step: LandlordWizardStep
  firstName: string
  lastName: string
  phone: string
  landlordType: string
  companyName: string
  abn: string
  address: string
  suburb: string
  postcode: string
  state: string
  bio: string
  avatarUrl: string | null
  hasInsurance: boolean
  stripeSkippedForNow: boolean
}

function landlordOnboardingDraftFromState(
  s: Omit<LandlordOnboardingDraftV1, 'v'>,
): LandlordOnboardingDraftV1 {
  return { v: LANDLORD_ONBOARDING_DRAFT_VERSION, ...s }
}

function parseLandlordOnboardingDraft(raw: string | null): LandlordOnboardingDraftV1 | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Record<string, unknown>
    if (d.v !== LANDLORD_ONBOARDING_DRAFT_VERSION) return null
    const step = d.step === 1 || d.step === 2 || d.step === 3 || d.step === 4 || d.step === 5 ? d.step : 1
    const landlordType =
      typeof d.landlordType === 'string' &&
      (d.landlordType === '' || LANDLORD_TYPE_VALUE_SET.has(d.landlordType))
        ? d.landlordType
        : ''
    const state =
      typeof d.state === 'string' && (d.state === '' || AU_STATE_VALUE_SET.has(d.state)) ? d.state : 'NSW'
    return {
      v: LANDLORD_ONBOARDING_DRAFT_VERSION,
      step,
      firstName: typeof d.firstName === 'string' ? d.firstName : '',
      lastName: typeof d.lastName === 'string' ? d.lastName : '',
      phone: typeof d.phone === 'string' ? d.phone : '',
      landlordType,
      companyName: typeof d.companyName === 'string' ? d.companyName : '',
      abn: typeof d.abn === 'string' ? d.abn : '',
      address: typeof d.address === 'string' ? d.address : '',
      suburb: typeof d.suburb === 'string' ? d.suburb : '',
      postcode: typeof d.postcode === 'string' ? d.postcode : '',
      state,
      bio: typeof d.bio === 'string' ? d.bio : '',
      avatarUrl: typeof d.avatarUrl === 'string' && d.avatarUrl.trim() !== '' ? d.avatarUrl : null,
      hasInsurance: Boolean(d.hasInsurance),
      stripeSkippedForNow: Boolean(d.stripeSkippedForNow),
    }
  } catch {
    return null
  }
}

function isLandlordOnboardingDraftMeaningful(d: LandlordOnboardingDraftV1): boolean {
  return (
    d.step > 1 ||
    d.firstName.trim() !== '' ||
    d.lastName.trim() !== '' ||
    d.phone.trim() !== '' ||
    d.landlordType !== '' ||
    d.companyName.trim() !== '' ||
    d.abn.trim() !== '' ||
    d.address.trim() !== '' ||
    d.suburb.trim() !== '' ||
    d.postcode.trim() !== '' ||
    d.bio.trim() !== '' ||
    (d.avatarUrl != null && d.avatarUrl.trim() !== '') ||
    d.hasInsurance ||
    d.stripeSkippedForNow
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:border-[#FF6F61]'
const selectClass = inputClass
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const errClass = 'text-red-600 text-xs mt-1'

const INSURANCE_PROVIDERS = [
  { name: 'Terri Scheer', href: 'https://www.terrisheer.com.au' },
  { name: 'NRMA Landlord Insurance', href: 'https://www.nrma.com.au' },
  { name: 'Budget Direct', href: 'https://www.budgetdirect.com.au' },
] as const

export default function LandlordOnboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, role, refreshProfile } = useAuthContext()
  const { managedTierEnabled } = usePlatformFeatures()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<LandlordRow | null>(null)
  const [step, setStep] = useState<LandlordWizardStep>(1)
  const initialStepSet = useRef(false)
  const completionWritten = useRef(false)
  const formTopRef = useRef<HTMLDivElement>(null)

  useScrollToTopOnChange(step, { anchorRef: formTopRef })

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [landlordType, setLandlordType] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [abn, setAbn] = useState('')
  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState('')
  const [postcode, setPostcode] = useState('')
  const [state, setState] = useState('NSW')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const [termsPrivacy, setTermsPrivacy] = useState(false)
  const [landlordAgreement, setLandlordAgreement] = useState(false)
  const [nonDiscriminationAgreed, setNonDiscriminationAgreed] = useState(false)
  const [termsSubmitError, setTermsSubmitError] = useState(false)

  const [connectLoading, setConnectLoading] = useState(false)
  const [connectReturnError, setConnectReturnError] = useState<string | null>(null)
  const [stripeSkippedForNow, setStripeSkippedForNow] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [cardSaved, setCardSaved] = useState(false)

  const [intendedTier, setIntendedTier] = useState<LandlordServiceTier | null>(null)
  const effectiveIntendedTier: LandlordServiceTier =
    !managedTierEnabled ? 'listing' : intendedTier ?? 'listing'

  const [hasInsurance, setHasInsurance] = useState(false)
  const [insuranceWarning, setInsuranceWarning] = useState(false)

  const landlordOnboardingDraftSnapshot = useMemo(
    () =>
      landlordOnboardingDraftFromState({
        step,
        firstName,
        lastName,
        phone,
        landlordType,
        companyName,
        abn,
        address,
        suburb,
        postcode,
        state,
        bio,
        avatarUrl,
        hasInsurance,
        stripeSkippedForNow,
      }),
    [
      step,
      firstName,
      lastName,
      phone,
      landlordType,
      companyName,
      abn,
      address,
      suburb,
      postcode,
      state,
      bio,
      avatarUrl,
      hasInsurance,
      stripeSkippedForNow,
    ],
  )

  const restoredLocationKeyRef = useRef<string | null>(null)
  const draftSavedHideTimerRef = useRef<number | null>(null)
  const [draftSaveEnabled, setDraftSaveEnabled] = useState(false)
  const [draftSavedVisible, setDraftSavedVisible] = useState(false)
  const formHydratedFromServerRef = useRef(false)

  const persistLandlordOnboardingDraft = useCallback(() => {
    try {
      localStorage.setItem(LANDLORD_ONBOARDING_DRAFT_KEY, JSON.stringify(landlordOnboardingDraftSnapshot))
    } catch {
      /* quota / private mode */
    }
  }, [landlordOnboardingDraftSnapshot])

  const hydrateFromProfile = useCallback(
    (row: LandlordRow, tier: LandlordServiceTier) => {
      setFirstName(row.first_name?.trim() ?? '')
      setLastName(row.last_name?.trim() ?? '')
      setPhone(row.phone?.trim() ?? '')
      setLandlordType(row.landlord_type?.trim() ?? '')
      setCompanyName(row.company_name?.trim() ?? '')
      setAbn(row.abn?.trim() ?? '')
      setAddress(row.address?.trim() ?? '')
      setSuburb(row.suburb?.trim() ?? '')
      setPostcode(row.postcode?.trim() ?? '')
      setState(row.state?.trim() || 'NSW')
      setBio(row.bio?.trim() ?? '')
      setAvatarUrl(row.avatar_url?.trim() ?? null)
      setHasInsurance(row.has_landlord_insurance === true)
      if (!initialStepSet.current) {
        initialStepSet.current = true
        setStep(inferLandlordWizardStep(row, tier))
      }
    },
    [],
  )

  const applyLandlordOnboardingDraft = useCallback((parsed: LandlordOnboardingDraftV1) => {
    setStep(parsed.step)
    setFirstName(parsed.firstName)
    setLastName(parsed.lastName)
    setPhone(parsed.phone)
    setLandlordType(parsed.landlordType)
    setCompanyName(parsed.companyName)
    setAbn(parsed.abn)
    setAddress(parsed.address)
    setSuburb(parsed.suburb)
    setPostcode(parsed.postcode)
    setState(parsed.state)
    setBio(parsed.bio)
    setAvatarUrl(parsed.avatarUrl)
    setHasInsurance(parsed.hasInsurance)
    setStripeSkippedForNow(parsed.stripeSkippedForNow)
    setTermsPrivacy(false)
    setLandlordAgreement(false)
  }, [])

  useEffect(() => {
    return () => {
      if (draftSavedHideTimerRef.current) {
        window.clearTimeout(draftSavedHideTimerRef.current)
        draftSavedHideTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (loading) restoredLocationKeyRef.current = null
  }, [loading])

  useEffect(() => {
    if (loading || !profile) {
      setDraftSaveEnabled(false)
      return
    }

    if (restoredLocationKeyRef.current === location.key) {
      setDraftSaveEnabled(true)
      return
    }
    restoredLocationKeyRef.current = location.key

    const parsed = parseLandlordOnboardingDraft(localStorage.getItem(LANDLORD_ONBOARDING_DRAFT_KEY))
    if (parsed && isLandlordOnboardingDraftMeaningful(parsed)) {
      applyLandlordOnboardingDraft(parsed)
    }
    setDraftSaveEnabled(true)
  }, [loading, profile?.id, location.key, applyLandlordOnboardingDraft])

  useEffect(() => {
    if (!draftSaveEnabled || loading || !profile) return
    const id = window.setTimeout(() => {
      persistLandlordOnboardingDraft()
      setDraftSavedVisible(true)
      if (draftSavedHideTimerRef.current) window.clearTimeout(draftSavedHideTimerRef.current)
      draftSavedHideTimerRef.current = window.setTimeout(() => {
        setDraftSavedVisible(false)
        draftSavedHideTimerRef.current = null
      }, 2200)
    }, 500)
    return () => window.clearTimeout(id)
  }, [persistLandlordOnboardingDraft, draftSaveEnabled, loading, profile?.id])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden' || !draftSaveEnabled || loading || !profile) return
      persistLandlordOnboardingDraft()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [persistLandlordOnboardingDraft, draftSaveEnabled, loading, profile?.id])

  useEffect(() => {
    const onPageHide = () => {
      if (!draftSaveEnabled || loading || !profile) return
      persistLandlordOnboardingDraft()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [persistLandlordOnboardingDraft, draftSaveEnabled, loading, profile?.id])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INTENDED_LANDLORD_SERVICE_TIER_KEY)
      setIntendedTier(parseLandlordServiceTier(raw) ?? 'listing')
    } catch {
      setIntendedTier('listing')
    }
  }, [])

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await withSentryMonitoring('LandlordOnboarding/fetch-profile', () =>
        supabase.from('landlord_profiles').select('*').eq('user_id', user.id).single(),
      )
      if (error) throw error
      const row = data as LandlordRow
      if (row.onboarding_complete === true) {
        try {
          localStorage.removeItem(LANDLORD_ONBOARDING_DRAFT_KEY)
        } catch {
          /* ignore */
        }
        navigate('/landlord/dashboard', { replace: true })
        return
      }
      setProfile(row)
      if (!formHydratedFromServerRef.current) {
        formHydratedFromServerRef.current = true
        hydrateFromProfile(row, effectiveIntendedTier)
      }
    } catch (e) {
      setLoadError(messageFromSupabaseError(e))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id, navigate, effectiveIntendedTier, hydrateFromProfile])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const stripeParam = searchParams.get('stripe_connect')
  useEffect(() => {
    if (stripeParam !== 'success' && stripeParam !== 'refresh') return

    if (stripeParam === 'refresh') {
      setConnectReturnError('Your session expired. Please try again.')
      setSearchParams({}, { replace: true })
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          await fetch('/api/sync-stripe-connect-status', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      } catch {
        /* non-fatal */
      }
      if (!cancelled) {
        await loadProfile()
        setSearchParams({}, { replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [stripeParam, loadProfile, setSearchParams])

  useEffect(() => {
    if (step !== 3 || !profile) return
    if (!landlordStripeStepComplete(profile)) return
    const t = window.setTimeout(() => {
      setStep((s) => (s === 3 ? 4 : s))
    }, 2000)
    return () => window.clearTimeout(t)
  }, [step, profile])

  useEffect(() => {
    if (step !== 5 || !user?.id || !profile) return
    if (profile.onboarding_complete === true) return
    if (completionWritten.current) return
    completionWritten.current = true

    void (async () => {
      const now = new Date().toISOString()
      const { error } = await withSentryMonitoring('LandlordOnboarding/complete-onboarding', () =>
        supabase
          .from('landlord_profiles')
          .update({
            onboarding_complete: true,
            onboarding_completed_at: now,
          })
          .eq('user_id', user.id),
      )

      if (error) {
        completionWritten.current = false
        const formErrMsg = error.message
        setFormError(formErrMsg)
        if (formErrMsg) reportFormError('LandlordOnboarding', 'formError', formErrMsg, { sentry: true })
        return
      }
      setLandlordWizardCompleteLocalStorage()
      try {
        localStorage.removeItem(LANDLORD_ONBOARDING_DRAFT_KEY)
      } catch {
        /* ignore */
      }
      await refreshProfile()
      setProfile((p) => (p ? { ...p, onboarding_complete: true, onboarding_completed_at: now } : p))
    })()
  }, [step, user?.id, profile, refreshProfile])

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return

    setPhotoUploading(true)
    try {
      const prepared = await prepareProfilePhotoForUpload(file, MAX_PROFILE_PHOTO_BYTES)
      const path = `${user.id}/profile-photo.${prepared.ext}`

      const { error: upErr } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, prepared.blob, {
        upsert: true,
        contentType: prepared.contentType,
      })
      if (upErr) {
        setPhotoError(upErr.message || 'Upload failed.')
        return
      }

      const { data: pub } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path)
      const { error: dbErr } = await withSentryMonitoring('LandlordOnboarding/update-avatar-url', () =>
        supabase
          .from('landlord_profiles')
          .update({ avatar_url: pub.publicUrl })
          .eq('user_id', user.id),
      )
      if (dbErr) {
        setPhotoError(dbErr.message || 'Could not save photo URL.')
        return
      }
      setAvatarUrl(pub.publicUrl)
      await refreshProfile()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setPhotoUploading(false)
    }
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {}
    const needsBusinessDetails = landlordTypeRequiresCompanyDetails(landlordType.trim())
    if (!firstName.trim()) e.firstName = 'Enter your first name.'
    if (!lastName.trim()) e.lastName = 'Enter your last name.'
    if (!phone.trim()) e.phone = 'Enter your phone number.'
    else if (!isValidAuPhone(phone)) e.phone = 'Enter a valid Australian phone number.'
    if (!landlordType) e.landlordType = 'Select landlord type.'
    if (needsBusinessDetails) {
      if (!companyName.trim()) e.companyName = 'Company name is required for company/trust.'
      if (!abn.trim()) e.abn = 'ABN is required for company/trust.'
    }
    if (!address.trim()) e.address = 'Enter street address.'
    if (!suburb.trim()) e.suburb = 'Enter suburb.'
    if (!postcode.trim()) e.postcode = 'Enter postcode.'
    else if (!/^\d{4}$/.test(postcode.trim())) e.postcode = 'Use a 4-digit postcode.'
    if (!state) e.state = 'Select state.'
    if (!bio.trim()) e.bio = 'Add a short bio for renters.'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function saveStep1(ev: FormEvent) {
    ev.preventDefault()
    setFormError(null)
    if (!validateStep1() || !user?.id) return

    setSubmitting(true)
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
      const needsBusinessDetails = landlordTypeRequiresCompanyDetails(landlordType.trim())
      const payload: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        phone: phone.trim(),
        landlord_type: landlordType,
        company_name: needsBusinessDetails ? companyName.trim() || null : null,
        abn: needsBusinessDetails ? abn.trim() || null : null,
        address: address.trim(),
        suburb: suburb.trim(),
        postcode: postcode.trim(),
        state,
        bio: bio.trim(),
      }

      const { data: existing } = await withSentryMonitoring('LandlordOnboarding/select-profile-id', () =>
        supabase.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle(),
      )

      let error = null as { message: string } | null
      if (existing) {
        const r = await withSentryMonitoring('LandlordOnboarding/update-profile-step1', () =>
          supabase.from('landlord_profiles').update(payload).eq('user_id', user.id).select('*').single(),
        )
        error = r.error
        if (!r.error && r.data) setProfile(r.data as LandlordRow)
      } else {
        const email = user.email ?? ''
        const r = await withSentryMonitoring('LandlordOnboarding/insert-profile-step1', () =>
          supabase
            .from('landlord_profiles')
            .insert({
              user_id: user.id,
              email,
              ...payload,
            })
            .select('*')
            .single(),
        )
        error = r.error
        if (!r.error && r.data) setProfile(r.data as LandlordRow)
      }

      if (error) throw error

      await refreshProfile()
      const next = await withSentryMonitoring('LandlordOnboarding/fetch-profile-after-save', () =>
        supabase.from('landlord_profiles').select('*').eq('user_id', user.id).single(),
      )
      if (next.data) {
        const row = next.data as LandlordRow
        setProfile(row)
        if (landlordTermsComplete(row)) setStep(3)
        else setStep(2)
      }
    } catch (err) {
      const formErrMsg = messageFromSupabaseError(err)
      setFormError(formErrMsg)
      if (formErrMsg) reportFormError('LandlordOnboarding', 'formError', formErrMsg, { sentry: true })
    } finally {
      setSubmitting(false)
    }
  }

  async function saveStep2() {
    setTermsSubmitError(false)
    setFormError(null)
    if (!termsPrivacy || !landlordAgreement || !nonDiscriminationAgreed) {
      setTermsSubmitError(true)
      return
    }
    if (!user?.id) return
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const { error, data } = await withSentryMonitoring('LandlordOnboarding/update-terms', () =>
        supabase
          .from('landlord_profiles')
          .update({
            terms_accepted_at: now,
            landlord_terms_accepted_at: now,
            ...nonDiscriminationAcceptancePatch(now),
          })
          .eq('user_id', user.id)
          .select('*')
          .single(),
      )
      if (error) throw error
      if (data) setProfile(data as LandlordRow)
      await refreshProfile()
      setStep(3)
    } catch (e) {
      const formErrMsg = messageFromSupabaseError(e)
      setFormError(formErrMsg)
      if (formErrMsg) reportFormError('LandlordOnboarding', 'formError', formErrMsg, { sentry: true })
    } finally {
      setSubmitting(false)
    }
  }

  async function startStripeConnect() {
    setConnectReturnError(null)
    setFormError(null)
    setConnectLoading(true)
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('You need to be signed in.')

      const res = await fetch('/api/create-connect-account-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnContext: 'landlord_onboarding' }),
      })
      const raw = await res.text()
      let body: { url?: string; error?: string; alreadyConnected?: boolean } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      if (body.alreadyConnected) {
        await loadProfile()
        setStep(4)
        return
      }
      if (body.url) {
        // Open Stripe hosted URL in a new tab (do not reuse this window).
        const a = document.createElement('a')
        a.href = body.url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
        return
      }
      throw new Error('No onboarding URL returned.')
    } catch (e) {
      const formErrMsg = e instanceof Error ? e.message : 'Could not start Stripe setup.'
      setFormError(formErrMsg)
      if (formErrMsg) reportFormError('LandlordOnboarding', 'formError', formErrMsg, { sentry: true })
    } finally {
      setConnectLoading(false)
    }
  }

  async function saveStep4(ev: FormEvent) {
    ev.preventDefault()
    setFormError(null)
    if (!hasInsurance) setInsuranceWarning(true)
    else setInsuranceWarning(false)

    if (!user?.id) return
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const patch: Record<string, unknown> = {
        has_landlord_insurance: hasInsurance,
        insurance_acknowledged_at: now,
      }
      const { error, data } = await withSentryMonitoring('LandlordOnboarding/update-insurance-ack', () =>
        supabase.from('landlord_profiles').update(patch).eq('user_id', user.id).select('*').single(),
      )
      if (error) {
        if (looksLikeMissingDbColumn(error.message)) {
          const formErrMsg =
            'Your database is missing insurance columns. Run supabase/landlord_onboarding_wizard_columns.sql in the Supabase SQL Editor, then try again.'
          setFormError(formErrMsg)
          if (formErrMsg) reportFormError('LandlordOnboarding', 'formError', formErrMsg, { sentry: true })
          return
        }
        throw error
      }
      if (data) setProfile(data as LandlordRow)
      await refreshProfile()
      setStep(5)
    } catch (e) {
      const formErrMsg = messageFromSupabaseError(e)
      setFormError(formErrMsg)
      if (formErrMsg) reportFormError('LandlordOnboarding', 'formError', formErrMsg, { sentry: true })
    } finally {
      setSubmitting(false)
    }
  }

  function goBack() {
    setFormError(null)
    setConnectReturnError(null)
    if (step === 2) setStep(1)
    else if (step === 3) {
      if (profile && landlordTermsComplete(profile)) setStep(1)
      else setStep(2)
    } else if (step === 4) setStep(3)
    else if (step === 5) setStep(4)
  }

  // Important: hooks must run in a consistent order on every render.
  // This effect must be declared before any conditional early-returns.
  useEffect(() => {
    if (step !== 2 || !profile) return
    if (landlordTermsComplete(profile)) setStep(3)
  }, [step, profile])

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && role !== 'landlord') {
    return <Navigate to={role === 'student' ? '/onboarding/student' : '/'} replace />
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-stone-50">
        <div className="h-10 w-10 border-2 border-[#FF6F61] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !profile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center">
        <p className="text-red-700 text-sm">{loadError ?? 'Landlord profile not found.'}</p>
        <Link to="/landlord/dashboard" className="text-sm text-[#FF6F61] font-medium mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const showTermsStep = step === 2 && profile && !landlordTermsComplete(profile)

  const firstNameDisplay = firstName.trim() || profile.first_name?.trim() || 'there'

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-[100vw] flex-1 flex-col bg-stone-50 pb-16">
      <PageHeroBand
        title="Welcome to Quni Living"
        subtitle={step < 5 ? `Step ${step} of 5` : undefined}
        subtitleClassName="text-white/85 text-sm sm:text-base mt-2 font-semibold tracking-wide"
      />

      <div className="max-w-2xl mx-auto w-full min-w-0 px-4 sm:px-6 pt-8">
        {draftSavedVisible && step < 5 && (
          <p className="text-xs text-stone-400 text-right mb-2 tabular-nums" aria-live="polite">
            Draft saved
          </p>
        )}
        <div
          ref={formTopRef}
          className="scroll-mt-below-header bg-white rounded-2xl shadow-sm ring-1 ring-stone-900/5 px-5 py-8 sm:px-8 sm:py-10"
        >
          {step < 5 && (
            <div className="flex gap-2 mb-8">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-[#FF6F61]' : 'bg-stone-200'}`}
                  aria-hidden
                />
              ))}
            </div>
          )}

          {step < 5 && step > 1 && (
            <button type="button" onClick={goBack} className="text-sm text-stone-600 hover:text-stone-900 mb-6">
              ← Back
            </button>
          )}

          {(formError || connectReturnError) && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {connectReturnError ?? formError}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={saveStep1} className="space-y-5">
              <h2 className="text-lg font-bold text-stone-900">About you</h2>
              <p className="text-sm text-stone-600">Tell students who you are and how to reach you.</p>

              <div className="flex flex-col items-center gap-3 pb-2">
                <div className="h-24 w-24 rounded-full bg-stone-100 overflow-hidden ring-2 ring-stone-200 flex items-center justify-center text-stone-400 text-2xl font-semibold">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{(firstName[0] || lastName[0] || '?').toUpperCase()}</span>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-[#FF6F61] hover:underline">Upload profile photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={photoUploading} />
                </label>
                {photoUploading && <p className="text-xs text-stone-500">Uploading…</p>}
                {photoError && <p className={errClass}>{photoError}</p>}
                <p className="text-xs text-stone-500 text-center max-w-xs">Optional — encouraged so students know who they&apos;re renting from.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lo-fn" className={labelClass}>
                    First name
                  </label>
                  <input id="lo-fn" value={firstName} onChange={(ev) => setFirstName(ev.target.value)} className={inputClass} autoComplete="given-name" />
                  {fieldErrors.firstName && <p className={errClass}>{fieldErrors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lo-ln" className={labelClass}>
                    Last name
                  </label>
                  <input id="lo-ln" value={lastName} onChange={(ev) => setLastName(ev.target.value)} className={inputClass} autoComplete="family-name" />
                  {fieldErrors.lastName && <p className={errClass}>{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="lo-phone" className={labelClass}>
                  Phone number
                </label>
                <input
                  id="lo-phone"
                  type="tel"
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                  placeholder="04xx xxx xxx or +61…"
                />
                {fieldErrors.phone && <p className={errClass}>{fieldErrors.phone}</p>}
              </div>

              <div>
                <label htmlFor="lo-type" className={labelClass}>
                  Landlord type
                </label>
                <select
                  id="lo-type"
                  value={landlordType}
                  onChange={(ev) => {
                    const next = ev.target.value
                    setLandlordType(next)
                    if (!landlordTypeRequiresCompanyDetails(next)) {
                      setCompanyName('')
                      setAbn('')
                      setFieldErrors((prev) => {
                        if (!prev.companyName && !prev.abn) return prev
                        const nextErrors = { ...prev }
                        delete nextErrors.companyName
                        delete nextErrors.abn
                        return nextErrors
                      })
                    }
                  }}
                  className={selectClass}
                >
                  {LANDLORD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.landlordType && <p className={errClass}>{fieldErrors.landlordType}</p>}
              </div>

              {landlordTypeRequiresCompanyDetails(landlordType.trim()) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lo-company" className={labelClass}>
                      Company name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="lo-company"
                      value={companyName}
                      onChange={(ev) => setCompanyName(ev.target.value)}
                      className={inputClass}
                      autoComplete="organization"
                      required
                    />
                    {fieldErrors.companyName && <p className={errClass}>{fieldErrors.companyName}</p>}
                  </div>
                  <div>
                    <label htmlFor="lo-abn" className={labelClass}>
                      ABN <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="lo-abn"
                      value={abn}
                      onChange={(ev) => setAbn(ev.target.value)}
                      className={inputClass}
                      placeholder="e.g. 12 345 678 901"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                    />
                    {fieldErrors.abn && <p className={errClass}>{fieldErrors.abn}</p>}
                  </div>
                </div>
              )}

              <div
                className="rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-950"
                role="note"
              >
                <p className="font-medium">Your address stays private</p>
                <p className="mt-1 text-emerald-900/90 leading-relaxed">
                  We need your home or business address for legal agreements and account verification. It is{' '}
                  <strong>never</strong> shown on your public listings — students and visitors only see each
                  property&apos;s <strong>suburb</strong>, not this personal address.
                </p>
              </div>

              <div>
                <label htmlFor="lo-address" className={labelClass}>
                  Street address
                </label>
                <input id="lo-address" value={address} onChange={(ev) => setAddress(ev.target.value)} className={inputClass} autoComplete="street-address" />
                {fieldErrors.address && <p className={errClass}>{fieldErrors.address}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lo-suburb" className={labelClass}>
                    Suburb
                  </label>
                  <input id="lo-suburb" value={suburb} onChange={(ev) => setSuburb(ev.target.value)} className={inputClass} />
                  {fieldErrors.suburb && <p className={errClass}>{fieldErrors.suburb}</p>}
                </div>
                <div>
                  <label htmlFor="lo-postcode" className={labelClass}>
                    Postcode
                  </label>
                  <input id="lo-postcode" value={postcode} onChange={(ev) => setPostcode(ev.target.value)} className={inputClass} inputMode="numeric" />
                  {fieldErrors.postcode && <p className={errClass}>{fieldErrors.postcode}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="lo-state" className={labelClass}>
                  State
                </label>
                <select id="lo-state" value={state} onChange={(ev) => setState(ev.target.value)} className={selectClass}>
                  {AU_STATE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {fieldErrors.state && <p className={errClass}>{fieldErrors.state}</p>}
              </div>

              <div>
                <label htmlFor="lo-bio" className={labelClass}>
                  Bio
                </label>
                <textarea
                  id="lo-bio"
                  value={bio}
                  onChange={(ev) => setBio(ev.target.value)}
                  rows={4}
                  placeholder={BIO_PLACEHOLDER}
                  className={inputClass}
                />
                {fieldErrors.bio && <p className={errClass}>{fieldErrors.bio}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Saving…' : 'Continue →'}
              </button>
            </form>
          )}

          {showTermsStep && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-stone-900">Terms &amp; agreements</h2>
              <p className="text-sm text-stone-600">Please accept the following to list on Quni Living.</p>

              {termsSubmitError && (
                <p className="text-sm text-red-600 font-medium">Please accept all agreements to continue.</p>
              )}

              <label className="flex gap-3 items-start cursor-pointer text-sm text-stone-800 leading-relaxed">
                <input
                  type="checkbox"
                  checked={termsPrivacy}
                  onChange={(e) => {
                    setTermsPrivacy(e.target.checked)
                    setTermsSubmitError(false)
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]"
                />
                <span>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#FF6F61] font-medium underline underline-offset-2">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF6F61] font-medium underline underline-offset-2">
                    Privacy Policy
                  </a>
                </span>
              </label>

              <label className="flex gap-3 items-start cursor-pointer text-sm text-stone-800 leading-relaxed">
                <input
                  type="checkbox"
                  checked={landlordAgreement}
                  onChange={(e) => {
                    setLandlordAgreement(e.target.checked)
                    setTermsSubmitError(false)
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]"
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

              <label className="flex gap-3 items-start cursor-pointer text-sm text-stone-800 leading-relaxed">
                <input
                  type="checkbox"
                  checked={nonDiscriminationAgreed}
                  onChange={(e) => {
                    setNonDiscriminationAgreed(e.target.checked)
                    setTermsSubmitError(false)
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]"
                />
                <span>
                  I have read and agree to Quni&apos;s{' '}
                  <a
                    href="/non-discrimination"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF6F61] font-medium underline underline-offset-2"
                  >
                    Non-Discrimination Policy
                  </a>
                </span>
              </label>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void saveStep2()}
                className="w-full rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          )}

          {step === 3 && effectiveIntendedTier === 'listing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-stone-900">Add a card for Quni Listing fees</h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                You picked Quni Listing on the pricing page — you run the tenancy and bond &amp; rent stay between you and
                your renter. Quni only charges a flat acceptance fee on your saved card when you accept a booking. You
                won&apos;t be charged today.
              </p>

              {cardSaved || landlordStripeStepComplete(profile) ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                  {cardSaved ? 'Card saved ✓' : 'Bank account connected ✓'}
                  <p className="text-xs font-normal text-emerald-800/90 mt-1">
                    {cardSaved
                      ? 'You can now accept Quni Listing bookings.'
                      : 'Moving to the next step…'}
                  </p>
                  {cardSaved && (
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="mt-3 rounded-lg bg-[#FF6F61] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e85d52]"
                    >
                      Continue →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCardModalOpen(true)}
                      className="rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors disabled:opacity-50 shadow-sm"
                    >
                      Save card for Listing fees →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStripeSkippedForNow(true)
                        setStep(4)
                      }}
                      className="rounded-xl border-2 border-stone-300 bg-white text-stone-900 py-3.5 text-sm font-semibold hover:bg-stone-50 transition-colors disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                  </div>
                  <p className="text-xs text-stone-600">
                    You&apos;ll need a saved card before accepting your first Quni Listing booking. You can save it later
                    from your profile if you skip now.
                  </p>
                  {!managedTierEnabled ? (
                    <div className="rounded-lg border border-[#E8EFE3] bg-[#F6FAF8] px-3 py-2.5 text-xs text-stone-700 leading-relaxed">
                      <p className="font-semibold text-[#376256]">Quni Managed — coming soon</p>
                      <p className="mt-1">{MANAGED_COMING_SOON_SHORT} You can connect a bank account now if you want to be ready when Managed opens.</p>
                      <button
                        type="button"
                        disabled={connectLoading}
                        onClick={() => void startStripeConnect()}
                        className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-50 disabled:opacity-50"
                      >
                        {connectLoading ? 'Opening Stripe…' : 'Connect bank account (optional)'}
                      </button>
                    </div>
                  ) : (
                    <details className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs text-stone-700">
                      <summary className="cursor-pointer font-medium text-stone-800">
                        Planning to also list a Quni Managed property?
                      </summary>
                      <div className="mt-2 space-y-2 leading-relaxed">
                        <p>
                          Managed properties pay rent through Stripe Connect, so you&apos;d also need to connect a bank
                          account before accepting Managed bookings. You can do that here or anytime from your dashboard.
                        </p>
                        <button
                          type="button"
                          disabled={connectLoading}
                          onClick={() => void startStripeConnect()}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-50 disabled:opacity-50"
                        >
                          {connectLoading ? 'Opening Stripe…' : 'Connect bank account (optional)'}
                        </button>
                      </div>
                    </details>
                  )}
                  {stripeSkippedForNow && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Card setup skipped for now. You can save a card later from your profile.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && effectiveIntendedTier !== 'listing' && managedTierEnabled && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-stone-900">Connect your bank account to receive rent payments</h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                We use Stripe to securely process Quni Managed rent payouts. You&apos;ll complete a short Stripe Express
                onboarding — we never see your full bank details. If you intend to run only Quni Listing properties (you
                handle bond and rent directly), you can skip this and just save a card from your profile instead.
              </p>

              {landlordStripeStepComplete(profile) ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                  Bank account connected ✓
                  <p className="text-xs font-normal text-emerald-800/90 mt-1">Moving to the next step…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={connectLoading}
                      onClick={() => void startStripeConnect()}
                      className="rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {connectLoading ? 'Opening Stripe…' : 'Connect bank account →'}
                    </button>
                    <button
                      type="button"
                      disabled={connectLoading}
                      onClick={() => {
                        setStripeSkippedForNow(true)
                        setStep(4)
                      }}
                      className="rounded-xl border-2 border-stone-300 bg-white text-stone-900 py-3.5 text-sm font-semibold hover:bg-stone-50 transition-colors disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                  </div>
                  <p className="text-xs text-stone-600">
                    You&apos;ll need to connect your bank account before you can accept your first Quni Managed booking.
                  </p>
                  {stripeSkippedForNow && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Stripe setup skipped for now. You can connect it later from your dashboard.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <LandlordListingPaymentModal
            open={cardModalOpen}
            onClose={() => setCardModalOpen(false)}
            onSuccess={() => {
              setCardSaved(true)
              setCardModalOpen(false)
            }}
          />

          {step === 4 && (
            <form onSubmit={saveStep4} className="space-y-6">
              <h2 className="text-lg font-bold text-stone-900">Protect your investment with landlord insurance</h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                While not mandatory, landlord insurance protects you against loss of rent, tenant damage, and liability. Most experienced
                landlords hold a policy before listing.
              </p>

              <div className="grid gap-3 sm:grid-cols-1">
                {INSURANCE_PROVIDERS.map((p) => (
                  <div key={p.name} className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-stone-900 text-sm">{p.name}</span>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#FF6F61] hover:underline"
                    >
                      Visit website →
                    </a>
                  </div>
                ))}
              </div>

              <label className="flex gap-3 items-start cursor-pointer text-sm text-stone-800 leading-relaxed">
                <input
                  type="checkbox"
                  checked={hasInsurance}
                  onChange={(e) => {
                    setHasInsurance(e.target.checked)
                    if (e.target.checked) setInsuranceWarning(false)
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]"
                />
                <span>I have landlord insurance (or I understand the risks and choose to proceed without it)</span>
              </label>

              {insuranceWarning && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  We recommend having insurance before your first tenant moves in.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#FF6F61] text-white py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Saving…' : 'Continue →'}
              </button>
            </form>
          )}

          {step === 5 && (
            <div className="text-center space-y-8 py-4">
              <div className="flex justify-center" aria-hidden>
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="h-9 w-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900">You&apos;re all set, {firstNameDisplay}!</h2>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                  Your account is fully configured. You can now create your first listing and start connecting with students.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/landlord/property/new"
                  className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white py-3.5 px-6 text-sm font-semibold hover:bg-[#e85d52] transition-colors shadow-sm"
                >
                  Add your first listing →
                </Link>
                <Link
                  to="/landlord/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-stone-300 bg-white text-stone-900 py-3.5 px-6 text-sm font-semibold hover:bg-stone-50 transition-colors"
                >
                  Go to dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
