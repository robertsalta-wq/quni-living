import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Lock, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { withSentryMonitoring } from '../../../lib/supabaseErrorMonitor'
import { useAuthContext } from '../../../context/AuthContext'
import type { Database } from '../../../lib/database.types'
import { formatDisplayName } from '../../../lib/formatDisplayName'
import { isValidAuPhone } from '../../../lib/studentOnboarding'
import { prepareProfilePhotoForUpload } from '../../../lib/prepareProfilePhotoForUpload'
import LanguagesSpokenSelector from '../../profile/LanguagesSpokenSelector'
import { normalizeLanguagesSpoken, type SpokenLanguageCode } from '../../../lib/languagesSpoken'
import {
  buildLandlordReadinessDriverContent,
  computeLandlordReadiness,
  isLandlordAboutSectionComplete,
  isLandlordAddressSectionComplete,
  isLandlordAgreementsSectionComplete,
  isLandlordPersonalSectionComplete,
  landlordTypeRequiresCompanyDetails,
} from '../../../lib/landlordProfileReadiness'
import {
  landlordNonDiscriminationAccepted,
  nonDiscriminationAcceptancePatch,
} from '../../../lib/nonDiscriminationPolicy'
import { messageFromSupabaseError } from '../../../lib/supabaseErrorMessage'
import LandlordListingPaymentModal from '../LandlordListingPaymentModal'
import { startLandlordStripeConnect } from '../../../lib/startLandlordStripeConnect'
import {
  formatStripeCardOnFile,
  type LandlordListingBillingSnapshot,
} from '../../../lib/landlordListingBilling'
import { usePlatformFeatures } from '../../../context/PlatformFeaturesContext'
import { landlordDashboardProfilePath } from '../../../lib/landlordDashboardProfilePaths'
import { listingSectionDrillInActionBarItemSpecs } from '../../../lib/appChromeBarItems'
import { useSetAppChromeActions, type AppActionBarItem } from '../../appShell/AppChromeActionsContext'
import LandlordProfileHub from './LandlordProfileHub'
import LandlordProfileDrillInShell from './LandlordProfileDrillInShell'
import {
  isLandlordProfileHubSectionId,
  type LandlordProfileHubSectionId,
} from './profileHubSections'

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
  'w-full rounded-[10px] border border-[#D8D3C7] bg-white px-3.5 py-3 text-[15px] text-[var(--quni-ink)] outline-none focus:border-[var(--quni-coral)] focus:shadow-[0_0_0_3px_rgba(255,111,97,0.18)]'
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-4)]'
const errClass = 'text-red-600 text-xs mt-1'

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
    ? `${inputClass} border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]`
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

function aboutSectionFieldErrors(draft: Pick<LandlordRow, 'bio'>): Record<string, string> {
  if (isLandlordAboutSectionComplete(draft as LandlordRow)) return {}
  return draft.bio?.trim() ? {} : { bio: 'Bio is required.' }
}

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

function landlordTypeLabel(value: string | null | undefined): string {
  const v = value?.trim()
  const opt = LANDLORD_TYPE_OPTIONS.find((o) => o.value === v)
  return opt?.label ?? v ?? ''
}

type Props = {
  profile: LandlordRow
  onRefresh: () => Promise<void>
  sectionParam: string | null
  listingBilling: LandlordListingBillingSnapshot | null
}

export default function LandlordMobileProfileTab({
  profile,
  onRefresh,
  sectionParam,
  listingBilling,
}: Props) {
  const navigate = useNavigate()
  const { user, refreshProfile, signOut } = useAuthContext()
  const { managedTierEnabled } = usePlatformFeatures()

  const isDrillIn = isLandlordProfileHubSectionId(sectionParam)
  const sectionId: LandlordProfileHubSectionId | null = isDrillIn ? sectionParam : null
  const hubPath = landlordDashboardProfilePath()

  const email = user?.email ?? profile.email ?? null

  const readiness = useMemo(() => computeLandlordReadiness(profile), [profile])
  const driverContent = useMemo(() => buildLandlordReadinessDriverContent(readiness), [readiness])

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const draftTimerRef = useRef<number | null>(null)

  const showResidence = addressState.trim().toUpperCase() !== 'NSW'
  const needsBiz = landlordTypeRequiresCompanyDetails(landlordType)
  const showListingCardRow = listingBilling?.moduleEnabled !== false
  const saving = savingSection === sectionId

  useEffect(() => {
    setFirstName(profile.first_name?.trim() ?? '')
    setLastName(profile.last_name?.trim() ?? '')
    setPhone(profile.phone?.trim() ?? '')
    setLandlordType(profile.landlord_type?.trim() ?? '')
    setCompanyName(profile.company_name?.trim() ?? '')
    setAbn(profile.abn?.trim() ?? '')
    setAddressLine(profile.address?.trim() ?? '')
    setSuburb(profile.suburb?.trim() ?? '')
    setPostcode(profile.postcode?.trim() ?? '')
    setAddressState(profile.state?.trim() || 'NSW')
    setResidenceLocation(profile.residence_location?.trim() ?? '')
    setBio(profile.bio?.trim() ?? '')
    setLanguagesSpoken(normalizeLanguagesSpoken(profile.languages_spoken))
    setHasInsurance(profile.has_landlord_insurance === true)
  }, [profile])

  useEffect(() => {
    if (isDrillIn) {
      setSectionError(null)
      setSectionSaveHint(null)
      setValidationSection(null)
      setFieldErrors({})
    }
  }, [sectionId, isDrillIn])

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

  async function savePersonal(): Promise<boolean> {
    if (!user?.id) return false
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
      return false
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
      return true
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, PERSONAL_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  async function saveAddress(): Promise<boolean> {
    if (!user?.id) return false
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
      return false
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
      return true
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, ADDRESS_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  async function saveAbout(): Promise<boolean> {
    if (!user?.id) return false
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    const errors = aboutSectionFieldErrors({ bio })
    if (Object.keys(errors).length > 0) {
      applyValidationErrors('about', errors)
      return false
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
      return true
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, ABOUT_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  async function saveAgreements(): Promise<boolean> {
    if (!user?.id) return false
    setSectionError(null)
    setSectionSaveHint(null)
    setValidationSection(null)
    const errors = agreementsSectionFieldErrors(profile, agreeTerms, agreeLandlordTerms, agreeNonDiscrimination)
    if (Object.keys(errors).length > 0) {
      applyValidationErrors('agreements', errors)
      return false
    }
    const now = new Date().toISOString()
    const patch: Record<string, string> = {}
    if (!profile.terms_accepted_at && agreeTerms) patch.terms_accepted_at = now
    if (!profile.landlord_terms_accepted_at && agreeLandlordTerms) patch.landlord_terms_accepted_at = now
    if (!landlordNonDiscriminationAccepted(profile) && agreeNonDiscrimination) {
      Object.assign(patch, nonDiscriminationAcceptancePatch(now))
    }
    if (Object.keys(patch).length === 0) return true
    setSavingSection('agreements')
    try {
      const { error } = await supabase.from('landlord_profiles').update(patch).eq('user_id', user.id)
      if (error) throw error
      setAgreeTerms(false)
      setAgreeLandlordTerms(false)
      setAgreeNonDiscrimination(false)
      await onRefresh()
      await refreshProfile()
      return true
    } catch {
      setFieldErrors((prev) => mergeSectionFieldErrors(prev, AGREEMENT_FIELD_KEYS, {}))
      setSectionError(SAVE_WRITE_FAILURE)
      setSectionSaveHint(null)
      setValidationSection(null)
      return false
    } finally {
      setSavingSection(null)
    }
  }

  async function saveInsurance(): Promise<boolean> {
    if (!user?.id) return false
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
      return true
    } catch (e) {
      setSectionError(messageFromSupabaseError(e))
      return false
    } finally {
      setSavingSection(null)
    }
  }

  async function saveLanguages(): Promise<boolean> {
    if (!user?.id) return false
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
      return true
    } catch (e) {
      setSectionError(messageFromSupabaseError(e))
      return false
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

  async function handleDrillInSave() {
    if (!sectionId) return
    if (sectionId === 'payouts') {
      navigate(hubPath)
      return
    }
    let ok = false
    switch (sectionId) {
      case 'personal':
        ok = await savePersonal()
        break
      case 'address':
        ok = await saveAddress()
        break
      case 'about':
        ok = await saveAbout()
        break
      case 'agreements':
        ok = readiness.publish.sections.agreements ? true : await saveAgreements()
        break
      case 'insurance':
        ok = await saveInsurance()
        break
      case 'languages':
        ok = await saveLanguages()
        break
    }
    if (ok) navigate(hubPath)
  }

  const actionItems: AppActionBarItem[] | null =
    !isDrillIn || !sectionId
      ? null
      : listingSectionDrillInActionBarItemSpecs({ saving }).map((spec) => ({
          ...spec,
          icon: spec.primary ? Check : X,
          ...(spec.id === 'cancel' ? { to: hubPath } : { onClick: () => void handleDrillInSave() }),
        }))

  useSetAppChromeActions(actionItems)

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

  const paymentModal = (
    <LandlordListingPaymentModal
      open={cardModalOpen}
      onClose={() => setCardModalOpen(false)}
      onSuccess={() => {
        setCardModalOpen(false)
        void onRefresh()
      }}
    />
  )

  if (!isDrillIn || !sectionId) {
    return (
      <>
        <LandlordProfileHub
          profile={profile}
          email={email}
          listingBilling={listingBilling}
          readiness={readiness}
          driverLine={driverLine}
          onSignOut={() => void signOut()}
          onDeleteAccount={() => setDeleteModalOpen(true)}
        />
        {deleteModalOpen ? (
          <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} />
        ) : null}
        {paymentModal}
      </>
    )
  }

  return (
    <>
      <LandlordProfileDrillInShell sectionId={sectionId} error={sectionError}>
        {sectionId === 'personal' ? (
          <PersonalSectionForm
            email={email}
            firstName={firstName}
            lastName={lastName}
            phone={phone}
            landlordType={landlordType}
            companyName={companyName}
            abn={abn}
            needsBiz={needsBiz}
            fieldErrors={fieldErrors}
            validationSection={validationSection}
            sectionSaveHint={sectionSaveHint}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onPhoneChange={setPhone}
            onLandlordTypeChange={setLandlordType}
            onCompanyNameChange={setCompanyName}
            onAbnChange={setAbn}
            clearFieldError={clearFieldError}
          />
        ) : null}

        {sectionId === 'address' ? (
          <AddressSectionForm
            addressLine={addressLine}
            suburb={suburb}
            postcode={postcode}
            addressState={addressState}
            residenceLocation={residenceLocation}
            showResidence={showResidence}
            fieldErrors={fieldErrors}
            validationSection={validationSection}
            sectionSaveHint={sectionSaveHint}
            onAddressLineChange={setAddressLine}
            onSuburbChange={setSuburb}
            onPostcodeChange={setPostcode}
            onAddressStateChange={setAddressState}
            onResidenceLocationChange={setResidenceLocation}
            clearFieldError={clearFieldError}
          />
        ) : null}

        {sectionId === 'about' ? (
          <AboutSectionForm
            profile={profile}
            firstName={firstName}
            bio={bio}
            photoUploading={photoUploading}
            photoError={photoError}
            fieldErrors={fieldErrors}
            validationSection={validationSection}
            sectionSaveHint={sectionSaveHint}
            onBioChange={setBio}
            onPhotoChange={handlePhotoChange}
            clearFieldError={clearFieldError}
          />
        ) : null}

        {sectionId === 'agreements' ? (
          <AgreementsSectionForm
            profile={profile}
            agreeTerms={agreeTerms}
            agreeLandlordTerms={agreeLandlordTerms}
            agreeNonDiscrimination={agreeNonDiscrimination}
            fieldErrors={fieldErrors}
            validationSection={validationSection}
            sectionSaveHint={sectionSaveHint}
            agreementsComplete={readiness.publish.sections.agreements}
            onAgreeTermsChange={setAgreeTerms}
            onAgreeLandlordTermsChange={setAgreeLandlordTerms}
            onAgreeNonDiscriminationChange={setAgreeNonDiscrimination}
            clearFieldError={clearFieldError}
          />
        ) : null}

        {sectionId === 'payouts' ? (
          <PayoutsSectionForm
            readiness={readiness}
            cardLabel={cardLabel}
            showListingCardRow={showListingCardRow}
            managedTierEnabled={managedTierEnabled}
            connectLoading={connectLoading}
            connectError={connectError}
            onConnectStripe={() => void handleConnectStripe()}
            onAddCard={() => setCardModalOpen(true)}
          />
        ) : null}

        {sectionId === 'insurance' ? (
          <InsuranceSectionForm hasInsurance={hasInsurance} onHasInsuranceChange={setHasInsurance} />
        ) : null}

        {sectionId === 'languages' ? (
          <LanguagesSectionForm languagesSpoken={languagesSpoken} onLanguagesChange={setLanguagesSpoken} />
        ) : null}
      </LandlordProfileDrillInShell>
      {paymentModal}
    </>
  )
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <p id="delete-account-title" className="text-[15px] leading-relaxed text-[var(--quni-ink)]">
          To delete your landlord account, email{' '}
          <a
            href="mailto:hello@quni.com.au"
            className="font-semibold text-[var(--quni-coral)] hover:underline"
          >
            hello@quni.com.au
          </a>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-[10px] bg-[var(--quni-coral)] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[var(--quni-coral-hover)]"
        >
          Close
        </button>
      </div>
    </div>
  )
}

type PersonalSectionFormProps = {
  email: string | null
  firstName: string
  lastName: string
  phone: string
  landlordType: string
  companyName: string
  abn: string
  needsBiz: boolean
  fieldErrors: Record<string, string>
  validationSection: string | null
  sectionSaveHint: string | null
  onFirstNameChange: (v: string) => void
  onLastNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onLandlordTypeChange: (v: string) => void
  onCompanyNameChange: (v: string) => void
  onAbnChange: (v: string) => void
  clearFieldError: (field: string) => void
}

function PersonalSectionForm({
  email,
  firstName,
  lastName,
  phone,
  landlordType,
  companyName,
  abn,
  needsBiz,
  fieldErrors,
  validationSection,
  sectionSaveHint,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onLandlordTypeChange,
  onCompanyNameChange,
  onAbnChange,
  clearFieldError,
}: PersonalSectionFormProps) {
  return (
    <div className="space-y-[22px]">
      <div>
        <p id="lmp-landlord-type-label" className={labelClass}>
          Landlord type
        </p>
        <div
          className={`flex flex-wrap gap-2 ${fieldErrors.landlordType ? 'rounded-[10px] ring-1 ring-red-500 p-1 -m-1' : ''}`}
          role="group"
          aria-labelledby="lmp-landlord-type-label"
          aria-invalid={fieldErrors.landlordType ? true : undefined}
          aria-describedby={fieldErrors.landlordType ? 'lmp-landlord-type-error' : undefined}
        >
          {LANDLORD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onLandlordTypeChange(opt.value)
                clearFieldError('landlordType')
                if (!landlordTypeRequiresCompanyDetails(opt.value)) {
                  clearFieldError('companyName')
                  clearFieldError('abn')
                }
              }}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                landlordType === opt.value
                  ? 'border-[var(--quni-coral)] bg-[rgba(255,111,97,0.08)] text-[var(--quni-coral-active)]'
                  : 'border-[#D8D3C7] bg-white text-[var(--quni-ink-3)] hover:border-[var(--quni-coral)]/40',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {fieldErrors.landlordType ? (
          <p id="lmp-landlord-type-error" className={errClass} role="alert">
            {fieldErrors.landlordType}
          </p>
        ) : null}
      </div>

      {needsBiz ? (
        <div className="rounded-xl border border-[rgba(255,111,97,0.25)] bg-[rgba(255,111,97,0.06)] p-3.5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--quni-coral-active)]">
            Required for {landlordTypeLabel(landlordType)} landlords
          </p>
          <div>
            <label htmlFor="lmp-company-name" className={labelClass}>
              Company name
            </label>
            <input
              id="lmp-company-name"
              className={inputClassForError(Boolean(fieldErrors.companyName))}
              value={companyName}
              onChange={(e) => {
                onCompanyNameChange(e.target.value)
                clearFieldError('companyName')
              }}
              aria-invalid={fieldErrors.companyName ? true : undefined}
              aria-describedby={fieldErrors.companyName ? 'lmp-company-name-error' : undefined}
            />
            {fieldErrors.companyName ? (
              <p id="lmp-company-name-error" className={errClass} role="alert">
                {fieldErrors.companyName}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="lmp-abn" className={labelClass}>
              ABN
            </label>
            <input
              id="lmp-abn"
              className={inputClassForError(Boolean(fieldErrors.abn))}
              value={abn}
              onChange={(e) => {
                onAbnChange(e.target.value)
                clearFieldError('abn')
              }}
              placeholder="00 000 000 000"
              aria-invalid={fieldErrors.abn ? true : undefined}
              aria-describedby={fieldErrors.abn ? 'lmp-abn-error' : undefined}
            />
            {fieldErrors.abn ? (
              <p id="lmp-abn-error" className={errClass} role="alert">
                {fieldErrors.abn}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lmp-first-name" className={labelClass}>
            First name
          </label>
          <input
            id="lmp-first-name"
            className={inputClassForError(Boolean(fieldErrors.firstName))}
            value={firstName}
            onChange={(e) => {
              onFirstNameChange(e.target.value)
              clearFieldError('firstName')
            }}
            aria-invalid={fieldErrors.firstName ? true : undefined}
            aria-describedby={fieldErrors.firstName ? 'lmp-first-name-error' : undefined}
          />
          {fieldErrors.firstName ? (
            <p id="lmp-first-name-error" className={errClass} role="alert">
              {fieldErrors.firstName}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="lmp-last-name" className={labelClass}>
            Last name
          </label>
          <input
            id="lmp-last-name"
            className={inputClassForError(Boolean(fieldErrors.lastName))}
            value={lastName}
            onChange={(e) => {
              onLastNameChange(e.target.value)
              clearFieldError('lastName')
            }}
            aria-invalid={fieldErrors.lastName ? true : undefined}
            aria-describedby={fieldErrors.lastName ? 'lmp-last-name-error' : undefined}
          />
          {fieldErrors.lastName ? (
            <p id="lmp-last-name-error" className={errClass} role="alert">
              {fieldErrors.lastName}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="lmp-phone" className={labelClass}>
          Phone
        </label>
        <input
          id="lmp-phone"
          type="tel"
          className={inputClassForError(Boolean(fieldErrors.phone))}
          value={phone}
          onChange={(e) => {
            onPhoneChange(e.target.value)
            clearFieldError('phone')
          }}
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? 'lmp-phone-error' : undefined}
        />
        {fieldErrors.phone ? (
          <p id="lmp-phone-error" className={errClass} role="alert">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="lmp-email" className={labelClass}>
          Email
        </label>
        <input
          id="lmp-email"
          type="email"
          readOnly
          value={email ?? ''}
          className={`${inputClass} bg-[var(--quni-surface-2)] text-[var(--quni-ink-4)]`}
        />
        <p className="mt-1.5 text-xs text-[var(--quni-ink-5)]">
          Students never see your email — messages stay inside Quni.
        </p>
      </div>

      {validationSection === 'personal' && sectionSaveHint ? (
        <p className="text-sm text-red-700" role="alert">
          {sectionSaveHint}
        </p>
      ) : null}
    </div>
  )
}

type AddressSectionFormProps = {
  addressLine: string
  suburb: string
  postcode: string
  addressState: string
  residenceLocation: string
  showResidence: boolean
  fieldErrors: Record<string, string>
  validationSection: string | null
  sectionSaveHint: string | null
  onAddressLineChange: (v: string) => void
  onSuburbChange: (v: string) => void
  onPostcodeChange: (v: string) => void
  onAddressStateChange: (v: string) => void
  onResidenceLocationChange: (v: string) => void
  clearFieldError: (field: string) => void
}

function AddressSectionForm({
  addressLine,
  suburb,
  postcode,
  addressState,
  residenceLocation,
  showResidence,
  fieldErrors,
  validationSection,
  sectionSaveHint,
  onAddressLineChange,
  onSuburbChange,
  onPostcodeChange,
  onAddressStateChange,
  onResidenceLocationChange,
  clearFieldError,
}: AddressSectionFormProps) {
  return (
    <div className="space-y-[22px]">
      <div>
        <label htmlFor="lmp-address" className={labelClass}>
          Street address
        </label>
        <input
          id="lmp-address"
          className={inputClassForError(Boolean(fieldErrors.addressLine))}
          value={addressLine}
          onChange={(e) => {
            onAddressLineChange(e.target.value)
            clearFieldError('addressLine')
          }}
          aria-invalid={fieldErrors.addressLine ? true : undefined}
          aria-describedby={fieldErrors.addressLine ? 'lmp-address-error' : undefined}
        />
        {fieldErrors.addressLine ? (
          <p id="lmp-address-error" className={errClass} role="alert">
            {fieldErrors.addressLine}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="lmp-suburb" className={labelClass}>
            Suburb
          </label>
          <input
            id="lmp-suburb"
            className={inputClassForError(Boolean(fieldErrors.suburb))}
            value={suburb}
            onChange={(e) => {
              onSuburbChange(e.target.value)
              clearFieldError('suburb')
            }}
            aria-invalid={fieldErrors.suburb ? true : undefined}
            aria-describedby={fieldErrors.suburb ? 'lmp-suburb-error' : undefined}
          />
          {fieldErrors.suburb ? (
            <p id="lmp-suburb-error" className={errClass} role="alert">
              {fieldErrors.suburb}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="lmp-postcode" className={labelClass}>
            Postcode
          </label>
          <input
            id="lmp-postcode"
            className={inputClassForError(Boolean(fieldErrors.postcode))}
            value={postcode}
            onChange={(e) => {
              onPostcodeChange(e.target.value)
              clearFieldError('postcode')
            }}
            aria-invalid={fieldErrors.postcode ? true : undefined}
            aria-describedby={fieldErrors.postcode ? 'lmp-postcode-error' : undefined}
          />
          {fieldErrors.postcode ? (
            <p id="lmp-postcode-error" className={errClass} role="alert">
              {fieldErrors.postcode}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lmp-state" className={labelClass}>
            State
          </label>
          <select
            id="lmp-state"
            className={inputClassForError(Boolean(fieldErrors.addressState))}
            value={addressState}
            onChange={(e) => {
              const next = e.target.value
              onAddressStateChange(next)
              clearFieldError('addressState')
              if (next.trim().toUpperCase() === 'NSW') {
                clearFieldError('residenceLocation')
              }
            }}
            aria-invalid={fieldErrors.addressState ? true : undefined}
            aria-describedby={fieldErrors.addressState ? 'lmp-state-error' : undefined}
          >
            {AU_STATE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {fieldErrors.addressState ? (
            <p id="lmp-state-error" className={errClass} role="alert">
              {fieldErrors.addressState}
            </p>
          ) : null}
        </div>
        {showResidence ? (
          <div>
            <label htmlFor="lmp-residence" className={labelClass}>
              Residence location
            </label>
            <input
              id="lmp-residence"
              className={inputClassForError(Boolean(fieldErrors.residenceLocation))}
              value={residenceLocation}
              onChange={(e) => {
                onResidenceLocationChange(e.target.value)
                clearFieldError('residenceLocation')
              }}
              placeholder="Suburb where you live"
              aria-invalid={fieldErrors.residenceLocation ? true : undefined}
              aria-describedby={fieldErrors.residenceLocation ? 'lmp-residence-error' : undefined}
            />
            {fieldErrors.residenceLocation ? (
              <p id="lmp-residence-error" className={errClass} role="alert">
                {fieldErrors.residenceLocation}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {showResidence ? (
        <p className="text-xs text-[var(--quni-ink-5)]">
          Required for landlords outside NSW so we apply the right state tenancy rules.
        </p>
      ) : null}

      {validationSection === 'address' && sectionSaveHint ? (
        <p className="text-sm text-red-700" role="alert">
          {sectionSaveHint}
        </p>
      ) : null}
    </div>
  )
}

type AboutSectionFormProps = {
  profile: LandlordRow
  firstName: string
  bio: string
  photoUploading: boolean
  photoError: string | null
  fieldErrors: Record<string, string>
  validationSection: string | null
  sectionSaveHint: string | null
  onBioChange: (v: string) => void
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
  clearFieldError: (field: string) => void
}

function AboutSectionForm({
  profile,
  firstName,
  bio,
  photoUploading,
  photoError,
  fieldErrors,
  validationSection,
  sectionSaveHint,
  onBioChange,
  onPhotoChange,
  clearFieldError,
}: AboutSectionFormProps) {
  return (
    <div className="space-y-[22px]">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover border border-[var(--quni-line)]"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-3)] font-display text-2xl font-bold text-[var(--quni-coral-active)]">
            {(firstName[0] ?? profile.first_name?.[0] ?? '?').toUpperCase()}
          </span>
        )}
        <div>
          <label className="inline-flex cursor-pointer rounded-[10px] border border-[#D8D3C7] bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]">
            {photoUploading ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onPhotoChange}
              disabled={photoUploading}
            />
          </label>
          <p className="mt-2 text-xs text-[var(--quni-ink-5)]">JPG or PNG, at least 400×400px — optional</p>
          {photoError ? <p className="mt-1 text-xs text-red-600">{photoError}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="lmp-bio" className={labelClass}>
          Short bio
        </label>
        <textarea
          id="lmp-bio"
          className={`${inputClassForError(Boolean(fieldErrors.bio))} min-h-[88px] resize-y leading-relaxed`}
          value={bio}
          onChange={(e) => {
            onBioChange(e.target.value)
            clearFieldError('bio')
          }}
          placeholder={BIO_PLACEHOLDER}
          rows={3}
          aria-invalid={fieldErrors.bio ? true : undefined}
          aria-describedby={fieldErrors.bio ? 'lmp-bio-error' : undefined}
        />
        {fieldErrors.bio ? (
          <p id="lmp-bio-error" className={errClass} role="alert">
            {fieldErrors.bio}
          </p>
        ) : null}
      </div>

      {validationSection === 'about' && sectionSaveHint ? (
        <p className="text-sm text-red-700" role="alert">
          {sectionSaveHint}
        </p>
      ) : null}
    </div>
  )
}

type AgreementsSectionFormProps = {
  profile: LandlordRow
  agreeTerms: boolean
  agreeLandlordTerms: boolean
  agreeNonDiscrimination: boolean
  fieldErrors: Record<string, string>
  validationSection: string | null
  sectionSaveHint: string | null
  agreementsComplete: boolean
  onAgreeTermsChange: (v: boolean) => void
  onAgreeLandlordTermsChange: (v: boolean) => void
  onAgreeNonDiscriminationChange: (v: boolean) => void
  clearFieldError: (field: string) => void
}

function AgreementsSectionForm({
  profile,
  agreeTerms,
  agreeLandlordTerms,
  agreeNonDiscrimination,
  fieldErrors,
  validationSection,
  sectionSaveHint,
  agreementsComplete,
  onAgreeTermsChange,
  onAgreeLandlordTermsChange,
  onAgreeNonDiscriminationChange,
  clearFieldError,
}: AgreementsSectionFormProps) {
  return (
    <div className="space-y-3">
      {!profile.terms_accepted_at ? (
        <AgreementCheckbox
          checked={agreeTerms}
          onChange={(v) => {
            onAgreeTermsChange(v)
            clearFieldError('agreeTerms')
          }}
          label={<TermsLabel />}
          error={fieldErrors.agreeTerms}
          errorId="lmp-agree-terms-error"
        />
      ) : null}
      {!profile.landlord_terms_accepted_at ? (
        <AgreementCheckbox
          checked={agreeLandlordTerms}
          onChange={(v) => {
            onAgreeLandlordTermsChange(v)
            clearFieldError('agreeLandlordTerms')
          }}
          label={<LsaLabel />}
          error={fieldErrors.agreeLandlordTerms}
          errorId="lmp-agree-lsa-error"
        />
      ) : null}
      {!landlordNonDiscriminationAccepted(profile) ? (
        <AgreementCheckbox
          checked={agreeNonDiscrimination}
          onChange={(v) => {
            onAgreeNonDiscriminationChange(v)
            clearFieldError('agreeNonDiscrimination')
          }}
          label={<NondiscLabel />}
          error={fieldErrors.agreeNonDiscrimination}
          errorId="lmp-agree-nondisc-error"
        />
      ) : null}
      {agreementsComplete ? (
        <p className="text-sm text-[var(--quni-ink-4)]">All agreements accepted.</p>
      ) : validationSection === 'agreements' && sectionSaveHint ? (
        <p className="text-sm text-red-700" role="alert">
          {sectionSaveHint}
        </p>
      ) : null}
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
          error ? 'text-red-800 rounded-[10px] ring-1 ring-red-500 p-2 -m-2' : 'text-[var(--quni-ink-2)]'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--quni-coral)]"
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
      <a
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--quni-coral)] hover:underline"
      >
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--quni-coral)] hover:underline"
      >
        Privacy Policy
      </a>
    </>
  )
}

function LsaLabel() {
  return (
    <>
      I accept the{' '}
      <a
        href="/landlord-service-agreement"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--quni-coral)] hover:underline"
      >
        Landlord Service Agreement
      </a>
    </>
  )
}

function NondiscLabel() {
  return (
    <>
      I accept the{' '}
      <a
        href="/non-discrimination"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--quni-coral)] hover:underline"
      >
        Non-discrimination policy
      </a>
    </>
  )
}

type PayoutsSectionFormProps = {
  readiness: ReturnType<typeof computeLandlordReadiness>
  cardLabel: string | null
  showListingCardRow: boolean
  managedTierEnabled: boolean
  connectLoading: boolean
  connectError: string | null
  onConnectStripe: () => void
  onAddCard: () => void
}

function PayoutsSectionForm({
  readiness,
  cardLabel,
  showListingCardRow,
  managedTierEnabled,
  connectLoading,
  connectError,
  onConnectStripe,
  onAddCard,
}: PayoutsSectionFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-[var(--quni-line-soft)] bg-[var(--quni-surface-2)] p-4">
        <ShieldIcon />
        <p className="text-[13.5px] leading-relaxed text-[var(--quni-ink-3)]">
          Payouts run through <strong className="text-[var(--quni-ink)]">Stripe Connect</strong>, which also verifies
          your identity — <strong className="text-[var(--quni-ink)]">no documents to upload</strong>, and Quni never
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
              <button
                type="button"
                onClick={onConnectStripe}
                disabled={connectLoading}
                className="rounded-[10px] bg-[var(--quni-navy)] px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
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
                <span className="ml-1 rounded-full bg-[var(--quni-warning-bg)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--quni-warning-fg)] align-middle">
                  Listing tier
                </span>
              </>
            }
            subtitle="Covers the $99 fee per accepted booking. Not charged until you accept one."
            statusLabel={cardLabel ?? undefined}
            action={
              readiness.accept.savedCard ? null : (
                <button
                  type="button"
                  onClick={onAddCard}
                  className="rounded-[10px] border border-[#D8D3C7] bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]"
                >
                  Add card
                </button>
              )
            }
          />
        ) : managedTierEnabled ? (
          <p className="text-[12.5px] text-[var(--quni-ink-5)] px-1">
            Your <strong>Managed tier</strong> needs only Stripe Connect — no saved card required.
          </p>
        ) : null}
      </div>
      {readiness.accept.identityVerified ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--quni-navy-tint)] px-3 py-1 text-xs font-semibold text-[var(--quni-navy)]">
          Identity verified
        </span>
      ) : null}
      {connectError ? <p className="text-sm text-red-700">{connectError}</p> : null}
    </div>
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
    <div className="flex items-center gap-3 rounded-xl border border-[var(--quni-line-soft)] px-4 py-3">
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-xs ${
          done ? 'bg-[var(--quni-success)] text-white' : 'border-2 border-[var(--quni-line)] bg-white'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--quni-ink)]">{title}</p>
        <p className="text-[12.5px] text-[var(--quni-ink-4)]">{subtitle}</p>
      </div>
      {statusLabel ? (
        <span className="shrink-0 text-xs font-semibold text-[var(--quni-success-fg)]">{statusLabel}</span>
      ) : (
        action
      )}
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-[var(--quni-ink-3)]"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function InsuranceSectionForm({
  hasInsurance,
  onHasInsuranceChange,
}: {
  hasInsurance: boolean
  onHasInsuranceChange: (v: boolean) => void
}) {
  return (
    <div>
      <p className="text-[13.5px] leading-relaxed text-[var(--quni-ink-3)] mb-3">
        Landlord insurance isn&apos;t required to list or take bookings on Quni, but many landlords choose to hold it.
        Compare specialist policies:
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {INSURANCE_PROVIDERS.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C7] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]"
          >
            {p.name}
          </a>
        ))}
      </div>
      <label className="flex gap-3 items-start cursor-pointer text-sm text-[var(--quni-ink-2)] leading-relaxed">
        <input
          type="checkbox"
          checked={hasInsurance}
          onChange={(e) => onHasInsuranceChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--quni-coral)]"
        />
        <span>I confirm I hold landlord insurance for my listed properties</span>
      </label>
    </div>
  )
}

function LanguagesSectionForm({
  languagesSpoken,
  onLanguagesChange,
}: {
  languagesSpoken: SpokenLanguageCode[]
  onLanguagesChange: (v: SpokenLanguageCode[]) => void
}) {
  return (
    <div>
      <p className="text-[13.5px] text-[var(--quni-ink-3)] mb-3">
        Select any languages you speak — shown to students browsing your listings.
      </p>
      <LanguagesSpokenSelector value={languagesSpoken} onChange={onLanguagesChange} />
    </div>
  )
}
