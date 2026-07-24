import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { withSentryMonitoring } from '../../lib/supabaseErrorMonitor'
import { useAuthContext } from '../../context/AuthContext'
import type { Database } from '../../lib/database.types'
import { formatDisplayName } from '../../lib/formatDisplayName'
import { isValidAuPhone } from '../../lib/studentOnboarding'
import { prepareProfilePhotoForUpload } from '../../lib/prepareProfilePhotoForUpload'
import {
  ProfileReadinessDriver,
  Section,
} from '../profile'
import LanguagesSpokenSelector from '../profile/LanguagesSpokenSelector'
import { formatLanguagesSpoken, normalizeLanguagesSpoken, type SpokenLanguageCode } from '../../lib/languagesSpoken'
import { dashboardPrimaryBtnClass } from '../../lib/dashboardButtons'
import {
  buildLandlordReadinessDriverContent,
  computeLandlordReadiness,
  isLandlordAboutSectionComplete,
  isLandlordAddressSectionComplete,
  isLandlordAgreementsSectionComplete,
  isLandlordPersonalSectionComplete,
  landlordProfileDefaultExpandedSection,
  landlordTypeRequiresCompanyDetails,
} from '../../lib/landlordProfileReadiness'
import type { LandlordDashboardProfileSectionKey } from '../../lib/landlordDashboardProfilePaths'
import {
  landlordNonDiscriminationAccepted,
  nonDiscriminationAcceptancePatch,
} from '../../lib/nonDiscriminationPolicy'
import { messageFromSupabaseError } from '../../lib/supabaseErrorMessage'
import LandlordListingPaymentModal from './LandlordListingPaymentModal'
import { startLandlordStripeConnect } from '../../lib/startLandlordStripeConnect'
import {
  formatStripeCardOnFile,
  type LandlordListingBillingSnapshot,
} from '../../lib/landlordListingBilling'
import { usePlatformFeatures } from '../../context/PlatformFeaturesContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import LandlordMobileProfileTab from './profileHub/LandlordMobileProfileTab'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

const PROFILE_PHOTO_BUCKET = 'landlord-avatars'
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024
const LANDLORD_PROFILE_DRAFT_KEY = 'landlord_profile_draft' as const

const LANDLORD_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'trust', label: 'Trust' },
] as const

const AU_STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const

const INSURANCE_PROVIDERS = [
  { name: 'EBM RentCover', href: 'https://www.ebmrentcover.com.au' },
  { name: 'Terri Scheer', href: 'https://www.terrisheer.com.au' },
  { name: 'AAMI Landlord', href: 'https://www.aami.com.au' },
] as const

const BIO_PLACEHOLDER =
  'Tell students about yourself — your management style, response times, and what makes your properties great to live in.'

const inputClass =
  'w-full rounded-admin-md border border-admin-line px-3 py-2.5 text-sm text-admin-ink bg-white focus:outline-none focus:ring-2 focus:ring-admin-coral/40 focus:border-admin-coral'
const labelClass = 'block text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5 mb-1.5'
const errClass = 'text-red-600 text-xs mt-1'
const saveBtnClass = dashboardPrimaryBtnClass

const SAVE_WRITE_FAILURE = "Couldn't save — try again"

const FIELD_HINT_LABELS: Partial<Record<string, string>> = {
  landlordType: 'landlord type',
  firstName: 'first name',
  lastName: 'last name',
  phone: 'phone number',
  companyName: 'company name',
  abn: 'ABN',
  addressLine: 'street address',
  suburb: 'suburb',
  postcode: 'postcode',
  residenceLocation: 'residence location',
  bio: 'bio',
  agreeTerms: 'Terms of Service acceptance',
  agreeLandlordTerms: 'Landlord Service Agreement acceptance',
  agreeNonDiscrimination: 'Non-discrimination policy acceptance',
}

const PERSONAL_FIELD_KEYS = ['landlordType', 'firstName', 'lastName', 'phone', 'companyName', 'abn'] as const
const ADDRESS_FIELD_KEYS = ['addressLine', 'suburb', 'postcode', 'addressState', 'residenceLocation'] as const
const ABOUT_FIELD_KEYS = ['bio'] as const
const AGREEMENT_FIELD_KEYS = ['agreeTerms', 'agreeLandlordTerms', 'agreeNonDiscrimination'] as const

function inputClassForError(hasError: boolean): string {
  return hasError
    ? `${inputClass} border-red-500 focus:border-red-500 focus:ring-red-400/40`
    : inputClass
}

function buildSectionSaveHint(fieldErrors: Record<string, string>): string {
  const labels = Object.keys(fieldErrors)
    .map((key) => FIELD_HINT_LABELS[key])
    .filter((label): label is string => Boolean(label))
  if (labels.length === 0) return 'Complete the required fields to save.'
  if (labels.length === 1) return `Add your ${labels[0]} to save.`
  if (labels.length === 2) return `Add your ${labels[0]} and ${labels[1]} to save.`
  const last = labels[labels.length - 1]
  const rest = labels.slice(0, -1).join(', ')
  return `Add your ${rest}, and ${last} to save.`
}

/** Field-level gaps mirror isLandlordPersonalSectionComplete (+ AU phone format). */
function personalSectionFieldErrors(
  draft: Pick<LandlordRow, 'first_name' | 'last_name' | 'phone' | 'landlord_type' | 'company_name' | 'abn'>,
  phoneRaw: string,
): Record<string, string> {
  if (isLandlordPersonalSectionComplete(draft as LandlordRow) && isValidAuPhone(phoneRaw.trim())) {
    return {}
  }
  const fieldErrors: Record<string, string> = {}
  if (!draft.landlord_type?.trim()) fieldErrors.landlordType = 'Landlord type is required.'
  if (!draft.first_name?.trim()) fieldErrors.firstName = 'First name is required.'
  if (!draft.last_name?.trim()) fieldErrors.lastName = 'Last name is required.'
  if (!draft.phone?.trim()) fieldErrors.phone = 'Phone is required.'
  else if (!isValidAuPhone(phoneRaw)) fieldErrors.phone = 'Enter a valid Australian phone number.'
  if (landlordTypeRequiresCompanyDetails(draft.landlord_type)) {
    if (!draft.company_name?.trim()) fieldErrors.companyName = 'Company name is required.'
    if (!draft.abn?.trim()) fieldErrors.abn = 'ABN is required.'
  }
  return fieldErrors
}

/** Field-level gaps mirror isLandlordAddressSectionComplete (+ 4-digit postcode). */
function addressSectionFieldErrors(
  draft: Pick<LandlordRow, 'address' | 'suburb' | 'postcode' | 'state' | 'residence_location'>,
  postcodeRaw: string,
): Record<string, string> {
  if (isLandlordAddressSectionComplete(draft as LandlordRow) && /^\d{4}$/.test(postcodeRaw.trim())) {
    return {}
  }
  const fieldErrors: Record<string, string> = {}
  if (!draft.address?.trim()) fieldErrors.addressLine = 'Street address is required.'
  if (!draft.suburb?.trim()) fieldErrors.suburb = 'Suburb is required.'
  if (!draft.postcode?.trim()) fieldErrors.postcode = 'Postcode is required.'
  else if (!/^\d{4}$/.test(postcodeRaw.trim())) fieldErrors.postcode = 'Use a 4-digit postcode.'
  if (!draft.state?.trim()) fieldErrors.addressState = 'State is required.'
  const state = draft.state?.trim().toUpperCase() ?? ''
  if (state !== 'NSW' && !draft.residence_location?.trim()) {
    fieldErrors.residenceLocation = 'Residence location is required.'
  }
  return fieldErrors
}

/** Field-level gaps mirror isLandlordAboutSectionComplete (bio only; photo optional). */
function aboutSectionFieldErrors(draft: Pick<LandlordRow, 'bio'>): Record<string, string> {
  if (isLandlordAboutSectionComplete(draft as LandlordRow)) return {}
  return draft.bio?.trim() ? {} : { bio: 'Bio is required.' }
}

/** Field-level gaps mirror isLandlordAgreementsSectionComplete for unchecked agreements. */
function agreementsSectionFieldErrors(
  profile: LandlordRow,
  agreeTerms: boolean,
  agreeLandlordTerms: boolean,
  agreeNonDiscrimination: boolean,
): Record<string, string> {
  if (isLandlordAgreementsSectionComplete(profile)) return {}
  const fieldErrors: Record<string, string> = {}
  if (!profile.terms_accepted_at && !agreeTerms) {
    fieldErrors.agreeTerms = 'Terms of Service acceptance is required.'
  }
  if (!profile.landlord_terms_accepted_at && !agreeLandlordTerms) {
    fieldErrors.agreeLandlordTerms = 'Landlord Service Agreement acceptance is required.'
  }
  if (!landlordNonDiscriminationAccepted(profile) && !agreeNonDiscrimination) {
    fieldErrors.agreeNonDiscrimination = 'Non-discrimination policy acceptance is required.'
  }
  return fieldErrors
}

function mergeSectionFieldErrors(
  prev: Record<string, string>,
  sectionKeys: readonly string[],
  nextSectionErrors: Record<string, string>,
): Record<string, string> {
  const merged = { ...prev }
  for (const key of sectionKeys) delete merged[key]
  return { ...merged, ...nextSectionErrors }
}

type Props = {
  profile: LandlordRow
  onRefresh: () => Promise<void>
  sectionParam: string | null
  listingBilling: LandlordListingBillingSnapshot | null
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function landlordTypeLabel(value: string | null | undefined): string {
  const v = value?.trim()
  const opt = LANDLORD_TYPE_OPTIONS.find((o) => o.value === v)
  return opt?.label ?? v ?? ''
}

function formatPersonalSummary(p: LandlordRow): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.full_name?.trim() || 'Landlord'
  const type = landlordTypeLabel(p.landlord_type)
  const phone = p.phone?.trim() ?? ''
  return [name, type, phone].filter(Boolean).join(' · ')
}

function formatAddressSummary(p: LandlordRow): string {
  const parts = [p.address?.trim(), p.suburb?.trim(), [p.state?.trim(), p.postcode?.trim()].filter(Boolean).join(' ')]
    .filter(Boolean)
  return parts.join(', ') || 'Address on file'
}

function formatAboutSummary(p: LandlordRow): string {
  const bio = p.bio?.trim()
  if (bio) return bio.length > 80 ? `${bio.slice(0, 77)}…` : bio
  return 'Bio added'
}

function formatAgreementsSummary(_p: LandlordRow): string {
  return 'Terms, Landlord Service Agreement, and Non-discrimination policy accepted'
}

function formatPayoutsSummary(p: LandlordRow, cardLabel: string | null): string {
  if (p.stripe_charges_enabled && cardLabel) return `Stripe Connect · ${cardLabel}`
  if (p.stripe_charges_enabled) return 'Stripe Connect · Identity verified'
  return 'Payouts & identity'
}

type ExpandKey = LandlordDashboardProfileSectionKey

export default function LandlordDashboardProfileTab(props: Props) {
  const isMobile = useIsMobile()
  if (isMobile) return <LandlordMobileProfileTab {...props} />
  return <LandlordDesktopProfileTab {...props} />
}

function LandlordDesktopProfileTab({
  profile,
  onRefresh,
  sectionParam,
  listingBilling,
}: Props) {
  const { user, refreshProfile } = useAuthContext()
  const { managedTierEnabled } = usePlatformFeatures()

  const readiness = useMemo(() => computeLandlordReadiness(profile), [profile])
  const driverContent = useMemo(() => buildLandlordReadinessDriverContent(readiness), [readiness])

  const defaultExpanded = landlordProfileDefaultExpandedSection(readiness)
  const [expanded, setExpanded] = useState<ExpandKey | null>(defaultExpanded)

  const [firstName, setFirstName] = useState(profile.first_name?.trim() ?? '')
  const [lastName, setLastName] = useState(profile.last_name?.trim() ?? '')
  const [phone, setPhone] = useState(profile.phone?.trim() ?? '')
  const [landlordType, setLandlordType] = useState(profile.landlord_type?.trim() ?? '')
  const [companyName, setCompanyName] = useState(profile.company_name?.trim() ?? '')
  const [abn, setAbn] = useState(profile.abn?.trim() ?? '')
  const [addressLine, setAddressLine] = useState(profile.address?.trim() ?? '')
  const [suburb, setSuburb] = useState(profile.suburb?.trim() ?? '')
  const [postcode, setPostcode] = useState(profile.postcode?.trim() ?? '')
  const [addressState, setAddressState] = useState(profile.state?.trim() || 'NSW')
  const [residenceLocation, setResidenceLocation] = useState(profile.residence_location?.trim() ?? '')
  const [bio, setBio] = useState(profile.bio?.trim() ?? '')
  const [languagesSpoken, setLanguagesSpoken] = useState<SpokenLanguageCode[]>(
    normalizeLanguagesSpoken(profile.languages_spoken),
  )
  const [hasInsurance, setHasInsurance] = useState(profile.has_landlord_insurance === true)

  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreeLandlordTerms, setAgreeLandlordTerms] = useState(false)
  const [agreeNonDiscrimination, setAgreeNonDiscrimination] = useState(false)

  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [sectionSaveHint, setSectionSaveHint] = useState<string | null>(null)
  const [validationSection, setValidationSection] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)

  const draftTimerRef = useRef<number | null>(null)

  const showResidence = addressState.trim().toUpperCase() !== 'NSW'
  const needsBiz = landlordTypeRequiresCompanyDetails(landlordType)
  const showListingCardRow = listingBilling?.moduleEnabled !== false

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [profile.id, defaultExpanded])

  useEffect(() => {
    if (!sectionParam) return
    const key = sectionParam as ExpandKey
    setExpanded(key)
    requestAnimationFrame(() => {
      document.getElementById(`landlord-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [sectionParam, profile.id])

  const persistDraft = useCallback(() => {
    try {
      localStorage.setItem(
        LANDLORD_PROFILE_DRAFT_KEY,
        JSON.stringify({
          v: 1,
          firstName,
          lastName,
          phone,
          companyName,
          abn,
          addressLine,
          suburb,
          addressState,
          postcode,
          residenceLocation,
          landlordType,
          bio,
          languagesSpoken,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [
    firstName,
    lastName,
    phone,
    companyName,
    abn,
    addressLine,
    suburb,
    addressState,
    postcode,
    residenceLocation,
    landlordType,
    bio,
    languagesSpoken,
  ])

  useEffect(() => {
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current)
    draftTimerRef.current = window.setTimeout(persistDraft, 500)
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current)
    }
  }, [persistDraft])

  const toggleSection = (key: ExpandKey) => {
    setExpanded((prev) => (prev === key ? defaultExpanded : key))
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    setFieldErrors({})
  }

  function applyValidationErrors(section: string, errors: Record<string, string>) {
    setFieldErrors((prev) => {
      const sectionKeys =
        section === 'personal'
          ? PERSONAL_FIELD_KEYS
          : section === 'address'
            ? ADDRESS_FIELD_KEYS
            : section === 'about'
              ? ABOUT_FIELD_KEYS
              : AGREEMENT_FIELD_KEYS
      return mergeSectionFieldErrors(prev, sectionKeys, errors)
    })
    if (Object.keys(errors).length === 0) return
    const hint = buildSectionSaveHint(errors)
    setSectionError(hint)
    setSectionSaveHint(hint)
    setValidationSection(section)
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      if (Object.keys(next).length === 0) {
        setSectionError(null)
        setSectionSaveHint(null)
        setValidationSection(null)
      } else {
        const hint = buildSectionSaveHint(next)
        setSectionError(hint)
        setSectionSaveHint(hint)
      }
      return next
    })
  }

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
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path)
      const { error: dbErr } = await supabase
        .from('landlord_profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('user_id', user.id)
      if (dbErr) throw dbErr
      await onRefresh()
      await refreshProfile()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function savePersonal(ev: FormEvent) {
    ev.preventDefault()
    if (!user?.id) return
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    const needsBusinessDetails = landlordTypeRequiresCompanyDetails(landlordType)
    const draft: Pick<LandlordRow, 'first_name' | 'last_name' | 'phone' | 'landlord_type' | 'company_name' | 'abn'> = {
      first_name: firstName,
      last_name: lastName,
      phone,
      landlord_type: landlordType,
      company_name: needsBusinessDetails ? companyName : null,
      abn: needsBusinessDetails ? abn : null,
    }
    const errors = personalSectionFieldErrors(draft, phone)
    if (Object.keys(errors).length > 0) {
      applyValidationErrors('personal', errors)
      return
    }
    setSavingSection('personal')
    try {
      const fnNorm = formatDisplayName(firstName.trim())
      const lnNorm = formatDisplayName(lastName.trim())
      const { error } = await withSentryMonitoring('LandlordProfileTab/save-personal', () =>
        supabase
          .from('landlord_profiles')
          .update({
            first_name: fnNorm,
            last_name: lnNorm,
            full_name: [fnNorm, lnNorm].join(' '),
            phone: phone.trim(),
            landlord_type: landlordType,
            company_name: needsBusinessDetails ? companyName.trim() : null,
            abn: needsBusinessDetails ? abn.trim() : null,
          })
          .eq('user_id', user.id),
      )
      if (error) throw error
      try {
        localStorage.removeItem(LANDLORD_PROFILE_DRAFT_KEY)
      } catch {
        /* ignore */
      }
      await onRefresh()
      await refreshProfile()
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, PERSONAL_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
    } finally {
      setSavingSection(null)
    }
  }

  async function saveAddress(ev: FormEvent) {
    ev.preventDefault()
    if (!user?.id) return
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    const stateNorm = addressState.trim()
    const draft: Pick<LandlordRow, 'address' | 'suburb' | 'postcode' | 'state' | 'residence_location'> = {
      address: addressLine,
      suburb,
      postcode,
      state: stateNorm,
      residence_location: stateNorm.toUpperCase() !== 'NSW' ? residenceLocation : null,
    }
    const errors = addressSectionFieldErrors(draft, postcode)
    if (Object.keys(errors).length > 0) {
      applyValidationErrors('address', errors)
      return
    }
    setSavingSection('address')
    try {
      const { error } = await supabase
        .from('landlord_profiles')
        .update({
          address: addressLine.trim(),
          suburb: suburb.trim(),
          postcode: postcode.trim(),
          state: stateNorm,
          residence_location: showResidence ? residenceLocation.trim() : null,
        })
        .eq('user_id', user.id)
      if (error) throw error
      await onRefresh()
      await refreshProfile()
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, ADDRESS_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
    } finally {
      setSavingSection(null)
    }
  }

  async function saveAbout(ev: FormEvent) {
    ev.preventDefault()
    if (!user?.id) return
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    const errors = aboutSectionFieldErrors({ bio })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors('about', errors)
      return
    }
    setSavingSection('about')
    try {
      const { error } = await supabase
        .from('landlord_profiles')
        .update({ bio: bio.trim() })
        .eq('user_id', user.id)
      if (error) throw error
      await onRefresh()
      await refreshProfile()
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, ABOUT_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
    } finally {
      setSavingSection(null)
    }
  }

  async function saveAgreements() {
    if (!user?.id) return
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    const errors = agreementsSectionFieldErrors(profile, agreeTerms, agreeLandlordTerms, agreeNonDiscrimination)
    if (Object.keys(errors).length > 0) {
      applyValidationErrors('agreements', errors)
      return
    }
    const now = new Date().toISOString()
    const patch: Record<string, string> = {}
    if (!profile.terms_accepted_at && agreeTerms) patch.terms_accepted_at = now
    if (!profile.landlord_terms_accepted_at && agreeLandlordTerms) patch.landlord_terms_accepted_at = now
    if (!landlordNonDiscriminationAccepted(profile) && agreeNonDiscrimination) {
      Object.assign(patch, nonDiscriminationAcceptancePatch(now))
    }
    if (Object.keys(patch).length === 0) return
    setSavingSection('agreements')
    try {
      const { error } = await supabase.from('landlord_profiles').update(patch).eq('user_id', user.id)
      if (error) throw error
      setAgreeTerms(false)
      setAgreeLandlordTerms(false)
      setAgreeNonDiscrimination(false)
      await onRefresh()
      await refreshProfile()
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, AGREEMENT_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
    } finally {
      setSavingSection(null)
    }
  }

  async function saveInsurance() {
    if (!user?.id) return
    setSectionError(null)
    setSavingSection('insurance')
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('landlord_profiles')
        .update({
          has_landlord_insurance: hasInsurance,
          insurance_acknowledged_at: now,
        })
        .eq('user_id', user.id)
      if (error) throw error
      await onRefresh()
      await refreshProfile()
    } catch (e) {
      setSectionError(messageFromSupabaseError(e))
    } finally {
      setSavingSection(null)
    }
  }

  async function saveLanguages() {
    if (!user?.id) return
    setSectionError(null)
    setSavingSection('languages')
    try {
      const { error } = await supabase
        .from('landlord_profiles')
        .update({ languages_spoken: languagesSpoken })
        .eq('user_id', user.id)
      if (error) throw error
      await onRefresh()
      await refreshProfile()
    } catch (e) {
      setSectionError(messageFromSupabaseError(e))
    } finally {
      setSavingSection(null)
    }
  }

  async function handleConnectStripe() {
    setConnectError(null)
    setConnectLoading(true)
    try {
      const result = await startLandlordStripeConnect('landlord_profile')
      if (!result.ok) throw new Error(result.error)
      if (result.alreadyConnected) await onRefresh()
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not start Stripe setup.')
    } finally {
      setConnectLoading(false)
    }
  }

  const cardLabel =
    listingBilling?.hasPaymentMethod && listingBilling.card
      ? formatStripeCardOnFile(listingBilling.card)
      : null

  const driverLine: ReactNode = driverContent.lineShowLock ? (
    <span className="flex items-start gap-2">
      <Lock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <span>{driverContent.lineText}</span>
    </span>
  ) : (
    driverContent.lineText
  )

  const publishSectionsComplete = readiness.publish.complete
  const requiredLeft = readiness.publish.totalCount - readiness.publish.doneCount

  return (
    <div className="mx-auto w-full max-w-[760px] pb-8">
      <ProfileReadinessDriver
        eyebrow={driverContent.eyebrow}
        title={driverContent.title}
        fraction={driverContent.fraction}
        fractionLabel={driverContent.fractionLabel}
        steps={driverContent.steps}
        progress={driverContent.progress}
        tone={driverContent.tone}
        line={driverLine}
      />

      {sectionError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {sectionError}
        </p>
      ) : null}

      <GroupHeader
        title="Step 1 · Required to publish a listing"
        complete={publishSectionsComplete}
      />

      <div className="flex flex-col gap-3">
        <Section
            id="landlord-section-personal"
            icon={<UserIcon />}
            title="Personal details"
            subtitle="Your name and contact details"
            status={readiness.publish.sections.personal ? 'done' : 'todo'}
            summary={readiness.publish.sections.personal ? formatPersonalSummary(profile) : undefined}
            expanded={expanded === 'personal'}
            onToggle={() => toggleSection('personal')}
          >
            <form onSubmit={(e) => void savePersonal(e)} className="space-y-4">
              <div>
                <p id="ldp-landlord-type-label" className={labelClass}>
                  Landlord type
                </p>
                <div
                  className={`flex flex-wrap gap-2 rounded-admin-md ${fieldErrors.landlordType ? 'ring-1 ring-red-500 p-1 -m-1' : ''}`}
                  role="group"
                  aria-labelledby="ldp-landlord-type-label"
                  aria-invalid={fieldErrors.landlordType ? true : undefined}
                  aria-describedby={fieldErrors.landlordType ? 'ldp-landlord-type-error' : undefined}
                >
                  {LANDLORD_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setLandlordType(opt.value)
                        clearFieldError('landlordType')
                        if (!landlordTypeRequiresCompanyDetails(opt.value)) {
                          clearFieldError('companyName')
                          clearFieldError('abn')
                        }
                      }}
                      className={[
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                        landlordType === opt.value
                          ? 'border-admin-coral bg-admin-coral-tint text-admin-coral'
                          : 'border-admin-line bg-white text-admin-ink-3 hover:border-admin-coral/40',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {fieldErrors.landlordType ? (
                  <p id="ldp-landlord-type-error" className={errClass} role="alert">
                    {fieldErrors.landlordType}
                  </p>
                ) : null}
              </div>
              {needsBiz ? (
                <div className="rounded-xl border border-admin-coral/20 bg-admin-coral-tint/50 p-3.5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-admin-coral-active">
                    Required for {landlordTypeLabel(landlordType)} landlords
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ldp-company-name" className={labelClass}>
                        Company name
                      </label>
                      <input
                        id="ldp-company-name"
                        className={inputClassForError(Boolean(fieldErrors.companyName))}
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value)
                          clearFieldError('companyName')
                        }}
                        aria-invalid={fieldErrors.companyName ? true : undefined}
                        aria-describedby={fieldErrors.companyName ? 'ldp-company-name-error' : undefined}
                      />
                      {fieldErrors.companyName ? (
                        <p id="ldp-company-name-error" className={errClass} role="alert">
                          {fieldErrors.companyName}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="ldp-abn" className={labelClass}>
                        ABN
                      </label>
                      <input
                        id="ldp-abn"
                        className={inputClassForError(Boolean(fieldErrors.abn))}
                        value={abn}
                        onChange={(e) => {
                          setAbn(e.target.value)
                          clearFieldError('abn')
                        }}
                        placeholder="00 000 000 000"
                        aria-invalid={fieldErrors.abn ? true : undefined}
                        aria-describedby={fieldErrors.abn ? 'ldp-abn-error' : undefined}
                      />
                      {fieldErrors.abn ? (
                        <p id="ldp-abn-error" className={errClass} role="alert">
                          {fieldErrors.abn}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ldp-first-name" className={labelClass}>
                    First name
                  </label>
                  <input
                    id="ldp-first-name"
                    className={inputClassForError(Boolean(fieldErrors.firstName))}
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      clearFieldError('firstName')
                    }}
                    aria-invalid={fieldErrors.firstName ? true : undefined}
                    aria-describedby={fieldErrors.firstName ? 'ldp-first-name-error' : undefined}
                  />
                  {fieldErrors.firstName ? (
                    <p id="ldp-first-name-error" className={errClass} role="alert">
                      {fieldErrors.firstName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="ldp-last-name" className={labelClass}>
                    Last name
                  </label>
                  <input
                    id="ldp-last-name"
                    className={inputClassForError(Boolean(fieldErrors.lastName))}
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value)
                      clearFieldError('lastName')
                    }}
                    aria-invalid={fieldErrors.lastName ? true : undefined}
                    aria-describedby={fieldErrors.lastName ? 'ldp-last-name-error' : undefined}
                  />
                  {fieldErrors.lastName ? (
                    <p id="ldp-last-name-error" className={errClass} role="alert">
                      {fieldErrors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="max-w-xs">
                <label htmlFor="ldp-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="ldp-phone"
                  type="tel"
                  className={inputClassForError(Boolean(fieldErrors.phone))}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    clearFieldError('phone')
                  }}
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  aria-describedby={fieldErrors.phone ? 'ldp-phone-error' : undefined}
                />
                {fieldErrors.phone ? (
                  <p id="ldp-phone-error" className={errClass} role="alert">
                    {fieldErrors.phone}
                  </p>
                ) : null}
              </div>
              {validationSection === 'personal' && sectionSaveHint ? (
                <p className="text-sm text-red-700" role="alert">
                  {sectionSaveHint}
                </p>
              ) : null}
              <button type="submit" disabled={savingSection === 'personal'} className={saveBtnClass}>
                {savingSection === 'personal' ? 'Saving…' : 'Save details'}
              </button>
            </form>
          </Section>

        <Section
            id="landlord-section-address"
            icon={<PinIcon />}
            title="Address"
            subtitle="Where you're based"
            status={readiness.publish.sections.address ? 'done' : 'todo'}
            summary={readiness.publish.sections.address ? formatAddressSummary(profile) : undefined}
            expanded={expanded === 'address'}
            onToggle={() => toggleSection('address')}
          >
            <form onSubmit={(e) => void saveAddress(e)} className="space-y-4">
              <div>
                <label htmlFor="ldp-address" className={labelClass}>
                  Street address
                </label>
                <input
                  id="ldp-address"
                  className={inputClassForError(Boolean(fieldErrors.addressLine))}
                  value={addressLine}
                  onChange={(e) => {
                    setAddressLine(e.target.value)
                    clearFieldError('addressLine')
                  }}
                  aria-invalid={fieldErrors.addressLine ? true : undefined}
                  aria-describedby={fieldErrors.addressLine ? 'ldp-address-error' : undefined}
                />
                {fieldErrors.addressLine ? (
                  <p id="ldp-address-error" className={errClass} role="alert">
                    {fieldErrors.addressLine}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="ldp-suburb" className={labelClass}>
                    Suburb
                  </label>
                  <input
                    id="ldp-suburb"
                    className={inputClassForError(Boolean(fieldErrors.suburb))}
                    value={suburb}
                    onChange={(e) => {
                      setSuburb(e.target.value)
                      clearFieldError('suburb')
                    }}
                    aria-invalid={fieldErrors.suburb ? true : undefined}
                    aria-describedby={fieldErrors.suburb ? 'ldp-suburb-error' : undefined}
                  />
                  {fieldErrors.suburb ? (
                    <p id="ldp-suburb-error" className={errClass} role="alert">
                      {fieldErrors.suburb}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="ldp-postcode" className={labelClass}>
                    Postcode
                  </label>
                  <input
                    id="ldp-postcode"
                    className={inputClassForError(Boolean(fieldErrors.postcode))}
                    value={postcode}
                    onChange={(e) => {
                      setPostcode(e.target.value)
                      clearFieldError('postcode')
                    }}
                    aria-invalid={fieldErrors.postcode ? true : undefined}
                    aria-describedby={fieldErrors.postcode ? 'ldp-postcode-error' : undefined}
                  />
                  {fieldErrors.postcode ? (
                    <p id="ldp-postcode-error" className={errClass} role="alert">
                      {fieldErrors.postcode}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ldp-state" className={labelClass}>
                    State
                  </label>
                  <select
                    id="ldp-state"
                    className={inputClassForError(Boolean(fieldErrors.addressState))}
                    value={addressState}
                    onChange={(e) => {
                      const next = e.target.value
                      setAddressState(next)
                      clearFieldError('addressState')
                      if (next.trim().toUpperCase() === 'NSW') {
                        clearFieldError('residenceLocation')
                      }
                    }}
                    aria-invalid={fieldErrors.addressState ? true : undefined}
                    aria-describedby={fieldErrors.addressState ? 'ldp-state-error' : undefined}
                  >
                    {AU_STATE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.addressState ? (
                    <p id="ldp-state-error" className={errClass} role="alert">
                      {fieldErrors.addressState}
                    </p>
                  ) : null}
                </div>
                {showResidence ? (
                  <div>
                    <label htmlFor="ldp-residence" className={labelClass}>
                      Residence location
                    </label>
                    <input
                      id="ldp-residence"
                      className={inputClassForError(Boolean(fieldErrors.residenceLocation))}
                      value={residenceLocation}
                      onChange={(e) => {
                        setResidenceLocation(e.target.value)
                        clearFieldError('residenceLocation')
                      }}
                      placeholder="Suburb where you live"
                      aria-invalid={fieldErrors.residenceLocation ? true : undefined}
                      aria-describedby={fieldErrors.residenceLocation ? 'ldp-residence-error' : undefined}
                    />
                    {fieldErrors.residenceLocation ? (
                      <p id="ldp-residence-error" className={errClass} role="alert">
                        {fieldErrors.residenceLocation}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {showResidence ? (
                <p className="text-xs text-admin-ink-5">
                  Required for landlords outside NSW so we apply the right state tenancy rules.
                </p>
              ) : null}
              {validationSection === 'address' && sectionSaveHint ? (
                <p className="text-sm text-red-700" role="alert">
                  {sectionSaveHint}
                </p>
              ) : null}
              <button type="submit" disabled={savingSection === 'address'} className={saveBtnClass}>
                {savingSection === 'address' ? 'Saving…' : 'Save details'}
              </button>
            </form>
          </Section>

        <Section
            id="landlord-section-about"
            icon={<PhotoIcon />}
            title="About you"
            subtitle="Photo and a short bio for students"
            status={readiness.publish.sections.about ? 'done' : 'todo'}
            summary={readiness.publish.sections.about ? formatAboutSummary(profile) : undefined}
            expanded={expanded === 'about'}
            onToggle={() => toggleSection('about')}
          >
            <form onSubmit={(e) => void saveAbout(e)} className="space-y-4">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover border border-admin-cream-border"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-admin-cream-border bg-admin-cream font-display text-2xl font-bold text-admin-coral-active">
                    {(firstName[0] ?? profile.first_name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <div>
                  <label className="inline-flex cursor-pointer rounded-admin-md border border-admin-line bg-white px-3.5 py-2 text-[13px] font-semibold text-admin-ink hover:bg-admin-surface-2">
                    {photoUploading ? 'Uploading…' : 'Change photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void handlePhotoChange(e)} disabled={photoUploading} />
                  </label>
                  <p className="mt-2 text-xs text-admin-ink-5">JPG or PNG, at least 400×400px — optional</p>
                  {photoError ? <p className="mt-1 text-xs text-red-600">{photoError}</p> : null}
                </div>
              </div>
              <div>
                <label htmlFor="ldp-bio" className={labelClass}>
                  Short bio
                </label>
                <textarea
                  id="ldp-bio"
                  className={`${inputClassForError(Boolean(fieldErrors.bio))} min-h-[88px] resize-y leading-relaxed`}
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value)
                    clearFieldError('bio')
                  }}
                  placeholder={BIO_PLACEHOLDER}
                  rows={3}
                  aria-invalid={fieldErrors.bio ? true : undefined}
                  aria-describedby={fieldErrors.bio ? 'ldp-bio-error' : undefined}
                />
                {fieldErrors.bio ? (
                  <p id="ldp-bio-error" className={errClass} role="alert">
                    {fieldErrors.bio}
                  </p>
                ) : null}
              </div>
              {validationSection === 'about' && sectionSaveHint ? (
                <p className="text-sm text-red-700" role="alert">
                  {sectionSaveHint}
                </p>
              ) : null}
              <button type="submit" disabled={savingSection === 'about'} className={saveBtnClass}>
                {savingSection === 'about' ? 'Saving…' : 'Save details'}
              </button>
            </form>
          </Section>

        <Section
            id="landlord-section-agreements"
            icon={<DocIcon />}
            title="Agreements"
            subtitle="Accept Quni's landlord agreements"
            status={readiness.publish.sections.agreements ? 'done' : 'todo'}
            summary={readiness.publish.sections.agreements ? formatAgreementsSummary(profile) : undefined}
            expanded={expanded === 'agreements'}
            onToggle={() => toggleSection('agreements')}
            editLabel="View"
          >
            <div className="space-y-3">
              {!profile.terms_accepted_at ? (
                <AgreementCheckbox
                  checked={agreeTerms}
                  onChange={(v) => {
                    setAgreeTerms(v)
                    clearFieldError('agreeTerms')
                  }}
                  label={<TermsLabel />}
                  error={fieldErrors.agreeTerms}
                  errorId="ldp-agree-terms-error"
                />
              ) : null}
              {!profile.landlord_terms_accepted_at ? (
                <AgreementCheckbox
                  checked={agreeLandlordTerms}
                  onChange={(v) => {
                    setAgreeLandlordTerms(v)
                    clearFieldError('agreeLandlordTerms')
                  }}
                  label={<LsaLabel />}
                  error={fieldErrors.agreeLandlordTerms}
                  errorId="ldp-agree-lsa-error"
                />
              ) : null}
              {!landlordNonDiscriminationAccepted(profile) ? (
                <AgreementCheckbox
                  checked={agreeNonDiscrimination}
                  onChange={(v) => {
                    setAgreeNonDiscrimination(v)
                    clearFieldError('agreeNonDiscrimination')
                  }}
                  label={<NondiscLabel />}
                  error={fieldErrors.agreeNonDiscrimination}
                  errorId="ldp-agree-nondisc-error"
                />
              ) : null}
              {readiness.publish.sections.agreements ? (
                <p className="text-sm text-admin-ink-4">All agreements accepted.</p>
              ) : (
                <>
                  {validationSection === 'agreements' && sectionSaveHint ? (
                    <p className="text-sm text-red-700" role="alert">
                      {sectionSaveHint}
                    </p>
                  ) : null}
                  <button type="button" onClick={() => void saveAgreements()} disabled={savingSection === 'agreements'} className={saveBtnClass}>
                    {savingSection === 'agreements' ? 'Saving…' : 'Accept agreements'}
                  </button>
                </>
              )}
            </div>
          </Section>
      </div>

      <PublishThresholdMarker complete={publishSectionsComplete} />

      <GroupHeader title="Step 2 · Required to accept bookings" complete={readiness.accept.complete} />

      <div className="mb-3">
        <Section
            id="landlord-section-payouts"
          icon={<BankIcon />}
          title="Payouts & identity"
          subtitle="Get paid and verify your identity"
          status={readiness.accept.complete ? 'done' : 'todo'}
          summary={readiness.accept.complete ? formatPayoutsSummary(profile, cardLabel) : undefined}
          expanded={expanded === 'payouts'}
          onToggle={() => toggleSection('payouts')}
          editLabel="Manage"
        >
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-admin-line-soft bg-admin-surface-2 p-4">
              <ShieldIcon />
              <p className="text-[13.5px] leading-relaxed text-admin-ink-3">
                Payouts run through <strong className="text-admin-ink">Stripe Connect</strong>, which also verifies
                your identity — <strong className="text-admin-ink">no documents to upload</strong>, and Quni never
                stores your ID.
              </p>
            </div>
            <div className="space-y-2.5">
              <PayoutRow
                done={readiness.accept.identityVerified}
                title="Stripe Connect — payouts & identity"
                subtitle="Receive rent and verify who you are."
                statusLabel={readiness.accept.identityVerified ? 'Connected' : undefined}
                action={
                  readiness.accept.identityVerified ? null : (
                    <button type="button" onClick={() => void handleConnectStripe()} disabled={connectLoading} className="rounded-admin-md bg-admin-navy px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                      {connectLoading ? 'Opening Stripe…' : 'Connect Stripe'}
                    </button>
                  )
                }
              />
              {showListingCardRow ? (
                <PayoutRow
                  done={readiness.accept.savedCard}
                  title={
                    <>
                      Saved payment card{' '}
                      <span className="ml-1 rounded-full bg-admin-warning-bg px-1.5 py-0.5 text-[10.5px] font-semibold text-admin-warning-fg align-middle">
                        Listing tier
                      </span>
                    </>
                  }
                  subtitle="Covers the $99 fee per accepted booking. Not charged until you accept one."
                  statusLabel={cardLabel ?? undefined}
                  action={
                    readiness.accept.savedCard ? null : (
                      <button type="button" onClick={() => setCardModalOpen(true)} className="rounded-admin-md border border-admin-line bg-white px-3.5 py-2 text-[13px] font-semibold text-admin-ink hover:bg-admin-surface-2">
                        Add card
                      </button>
                    )
                  }
                />
              ) : managedTierEnabled ? (
                <p className="text-[12.5px] text-admin-ink-5 px-1">
                  Your <strong>Managed tier</strong> needs only Stripe Connect — no saved card required.
                </p>
              ) : null}
            </div>
            {readiness.accept.identityVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-admin-navy-tint px-3 py-1 text-xs font-semibold text-admin-navy">
                Identity verified
              </span>
            ) : null}
            {connectError ? <p className="text-sm text-red-700">{connectError}</p> : null}
          </div>
        </Section>
      </div>

      <OptionalDivider />

      <div className="flex flex-col gap-3">
        <Section
            id="landlord-section-insurance"
            icon={<ShieldIcon />}
            title="Insurance"
            subtitle="Optional — for your own protection, not a Quni requirement"
            status={profile.insurance_acknowledged_at ? 'done' : 'optional'}
            summary={profile.has_landlord_insurance ? 'Landlord insurance confirmed' : undefined}
            expanded={expanded === 'insurance'}
            onToggle={() => toggleSection('insurance')}
          >
            <p className="text-[13.5px] leading-relaxed text-admin-ink-3 mb-3">
              Landlord insurance isn&apos;t required to list or take bookings on Quni, but many landlords choose to
              hold it. Compare specialist policies:
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {INSURANCE_PROVIDERS.map((p) => (
                <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-admin-line bg-white px-3 py-2 text-[13px] font-semibold text-admin-ink hover:bg-admin-surface-2">
                  {p.name}
                </a>
              ))}
            </div>
            <label className="flex gap-3 items-start cursor-pointer text-sm text-admin-ink-2 leading-relaxed">
              <input type="checkbox" checked={hasInsurance} onChange={(e) => setHasInsurance(e.target.checked)} className="mt-1 h-4 w-4 accent-admin-coral" />
              <span>I confirm I hold landlord insurance for my listed properties</span>
            </label>
            <button type="button" onClick={() => void saveInsurance()} disabled={savingSection === 'insurance'} className={`${saveBtnClass} mt-4`}>
              {savingSection === 'insurance' ? 'Saving…' : 'Save'}
            </button>
          </Section>

        <Section
            id="landlord-section-languages"
            icon={<GlobeIcon />}
            title="Languages spoken"
            subtitle="Languages you can help students in"
            status={languagesSpoken.length > 0 ? 'done' : 'optional'}
            summary={languagesSpoken.length > 0 ? formatLanguagesSpoken(languagesSpoken) : undefined}
            expanded={expanded === 'languages'}
            onToggle={() => toggleSection('languages')}
          >
            <p className="text-[13.5px] text-admin-ink-3 mb-3">Select any languages you speak — shown to students browsing your listings.</p>
            <LanguagesSpokenSelector value={languagesSpoken} onChange={setLanguagesSpoken} />
            <button type="button" onClick={() => void saveLanguages()} disabled={savingSection === 'languages'} className={`${saveBtnClass} mt-4`}>
              {savingSection === 'languages' ? 'Saving…' : 'Save languages'}
            </button>
          </Section>
      </div>

      <div className="mt-5 rounded-admin-lg border border-admin-line-soft bg-admin-surface-2 p-5">
        <div className="flex flex-wrap items-center gap-4">
          {publishSectionsComplete ? (
            <Link to="/landlord/property/new" className={saveBtnClass}>
              Add a listing
            </Link>
          ) : (
            <button type="button" disabled className={`${saveBtnClass} opacity-50 cursor-not-allowed`}>
              Add a listing
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 text-[13px] text-admin-ink-4">
            {!publishSectionsComplete ? (
              <>
                <Lock className="h-3.5 w-3.5 text-admin-warning" aria-hidden />
                {requiredLeft} required section{requiredLeft === 1 ? '' : 's'} left
              </>
            ) : !readiness.accept.complete ? (
              'You can publish a listing. Bookings and tenancy agreements (RTA) stay locked until Payouts & identity is complete.'
            ) : (
              'You can publish a listing and accept bookings.'
            )}
          </span>
        </div>
      </div>

      <LandlordListingPaymentModal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        onSuccess={() => {
          setCardModalOpen(false)
          void onRefresh()
        }}
      />
    </div>
  )
}

function GroupHeader({ title, complete }: { title: string; complete?: boolean }) {
  return (
    <div className="mb-2.5 mt-1 flex items-center gap-2.5 px-0.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-admin-ink">{title}</span>
      {complete ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-admin-success-fg">
          ✓ Complete
        </span>
      ) : null}
      <span className="h-px flex-1 bg-admin-line" />
    </div>
  )
}

function PublishThresholdMarker({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <div className="my-4 flex items-center gap-3 rounded-admin-lg border border-admin-success/35 bg-admin-success-bg px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-success text-white">✓</span>
        <div>
          <p className="text-[13.5px] font-bold text-admin-success-fg">Publish threshold cleared — you can list now</p>
          <p className="mt-0.5 text-[12.5px] text-admin-success-fg/85">
            Finish the section below to accept bookings and generate tenancy agreements (RTA).
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="my-4 flex items-center gap-3 rounded-admin-lg border border-dashed border-admin-cream-border bg-admin-surface-2 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-surface-3 text-admin-warning">
        <Lock className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-[13.5px] font-semibold text-admin-ink">Publish threshold</p>
        <p className="mt-0.5 text-[12.5px] text-admin-ink-4">
          Complete Step 1 above to unlock <strong>Add a listing</strong>. The section below is only needed later, to
          accept bookings.
        </p>
      </div>
    </div>
  )
}

function OptionalDivider() {
  return (
    <div className="my-5 flex items-center gap-3 px-0.5">
      <span className="h-px flex-1 bg-admin-line" />
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
        Optional · won&apos;t affect publishing or bookings
      </span>
      <span className="h-px flex-1 bg-admin-line" />
    </div>
  )
}

function AgreementCheckbox({
  checked,
  onChange,
  label,
  error,
  errorId,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  error?: string
  errorId?: string
}) {
  return (
    <div>
      <label
        className={`flex gap-3 items-start cursor-pointer text-sm leading-relaxed ${
          error ? 'text-red-800 rounded-admin-md ring-1 ring-red-500 p-2 -m-2' : 'text-admin-ink-2'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-admin-coral"
          aria-invalid={error ? true : undefined}
          aria-describedby={error && errorId ? errorId : undefined}
        />
        <span>{label}</span>
      </label>
      {error && errorId ? (
        <p id={errorId} className={errClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function TermsLabel() {
  return (
    <>
      I accept the{' '}
      <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-admin-coral hover:underline">
        Terms of Service
      </a>
    </>
  )
}

function LsaLabel() {
  return (
    <>
      I accept the{' '}
      <a href="/landlord-service-agreement" target="_blank" rel="noopener noreferrer" className="font-semibold text-admin-coral hover:underline">
        Landlord Service Agreement
      </a>
    </>
  )
}

function NondiscLabel() {
  return (
    <>
      I accept the{' '}
      <a href="/non-discrimination" target="_blank" rel="noopener noreferrer" className="font-semibold text-admin-coral hover:underline">
        Non-discrimination policy
      </a>
    </>
  )
}

function PayoutRow({
  done,
  title,
  subtitle,
  statusLabel,
  action,
}: {
  done: boolean
  title: ReactNode
  subtitle: string
  statusLabel?: string
  action: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-admin-line-soft px-4 py-3">
      <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-xs ${done ? 'bg-admin-success text-white' : 'border-2 border-admin-line bg-white'}`}>
        {done ? '✓' : ''}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-admin-ink">{title}</p>
        <p className="text-[12.5px] text-admin-ink-4">{subtitle}</p>
      </div>
      {statusLabel ? <span className="shrink-0 text-xs font-semibold text-admin-success-fg">{statusLabel}</span> : action}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
    </svg>
  )
}
