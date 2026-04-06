import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { withSentryMonitoring } from '../../lib/supabaseErrorMonitor'
import { useAuthContext } from '../../context/AuthContext'
import PageHeroBand from '../../components/PageHeroBand'
import UniversityCampusSelect from '../../components/UniversityCampusSelect'
import {
  BUDGET_RANGE_OPTIONS,
  GENDER_OPTIONS,
  hasClientStudentOnboardingComplete,
  inferStudentOnboardingStep,
  isValidAuPhone,
  LEASE_LENGTH_OPTIONS,
  markStudentOnboardingCompleteClient,
  STUDY_LEVEL_OPTIONS,
  budgetRangeToMinMax,
  minMaxToBudgetRange,
  isNonStudentAccommodationRoute,
  type BudgetRangeValue,
  type StudentProfileRow,
} from '../../lib/studentOnboarding'
import { consumePostAuthRedirect } from '../../lib/postAuthRedirect'
import { looksLikeMissingDbColumn, messageFromSupabaseError } from '../../lib/supabaseErrorMessage'
import { reportFormError } from '../../lib/reportFormError'
import { prepareProfilePhotoForUpload } from '../../lib/prepareProfilePhotoForUpload'

const PROFILE_PHOTO_BUCKET = 'student-avatars'
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

const STUDENT_ONBOARDING_DRAFT_KEY = 'student_onboarding_draft' as const
const STUDENT_ONBOARDING_DRAFT_VERSION = 1 as const

const BUDGET_RANGE_VALUE_SET = new Set<string>(BUDGET_RANGE_OPTIONS.map((o) => o.value))
const STUDY_LEVEL_VALUE_SET = new Set<string>(STUDY_LEVEL_OPTIONS.map((o) => o.value))
const GENDER_VALUE_SET = new Set<string>(GENDER_OPTIONS.map((o) => o.value))
const LEASE_LENGTH_VALUE_SET = new Set<string>(LEASE_LENGTH_OPTIONS.map((o) => o.value))

const ONBOARD_OCC_SET = new Set(['sole', 'couple', 'open'])
const ONBOARD_MOVE_FLEX_SET = new Set(['exact', 'one_week', 'two_weeks'])
const ONBOARD_BILLS_SET = new Set(['included', 'separate', 'either'])
const ONBOARD_FURN_SET = new Set(['furnished', 'unfurnished', 'either'])

/** Local draft — profile-style fields only; terms acceptance is never persisted. */
type StudentOnboardingDraftV1 = {
  v: typeof STUDENT_ONBOARDING_DRAFT_VERSION
  step: 1 | 2 | 3
  firstName: string
  lastName: string
  universityId: string
  campusId: string
  course: string
  studyLevel: string
  gender: string
  phone: string
  budgetRange: BudgetRangeValue | ''
  moveInDate: string
  leaseLength: string
  avatarUrl: string | null
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  emergencyEmail: string
  bio: string
  occupancyType: string
  moveInFlex: string
  hasPets: boolean
  needsParking: boolean
  billsPref: string
  furnishingPref: string
  hasGuarantor: boolean
  guarantorName: string
}

function studentOnboardingDraftFromState(
  s: Omit<StudentOnboardingDraftV1, 'v'>,
): StudentOnboardingDraftV1 {
  return { v: STUDENT_ONBOARDING_DRAFT_VERSION, ...s }
}

function parseStudentOnboardingDraft(raw: string | null): StudentOnboardingDraftV1 | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Record<string, unknown>
    if (d.v !== STUDENT_ONBOARDING_DRAFT_VERSION) return null
    const step = d.step === 1 || d.step === 2 || d.step === 3 ? d.step : 1
    const budgetRaw = typeof d.budgetRange === 'string' && BUDGET_RANGE_VALUE_SET.has(d.budgetRange) ? d.budgetRange : ''
    const study =
      typeof d.studyLevel === 'string' && (d.studyLevel === '' || STUDY_LEVEL_VALUE_SET.has(d.studyLevel))
        ? d.studyLevel
        : ''
    const gen =
      typeof d.gender === 'string' && (d.gender === '' || GENDER_VALUE_SET.has(d.gender)) ? d.gender : ''
    const lease =
      typeof d.leaseLength === 'string' && (d.leaseLength === '' || LEASE_LENGTH_VALUE_SET.has(d.leaseLength))
        ? d.leaseLength
        : ''
    return {
      v: STUDENT_ONBOARDING_DRAFT_VERSION,
      step,
      firstName: typeof d.firstName === 'string' ? d.firstName : '',
      lastName: typeof d.lastName === 'string' ? d.lastName : '',
      universityId: typeof d.universityId === 'string' ? d.universityId : '',
      campusId: typeof d.campusId === 'string' ? d.campusId : '',
      course: typeof d.course === 'string' ? d.course : '',
      studyLevel: study,
      gender: gen,
      phone: typeof d.phone === 'string' ? d.phone : '',
      budgetRange: budgetRaw as BudgetRangeValue | '',
      moveInDate: typeof d.moveInDate === 'string' ? d.moveInDate : '',
      leaseLength: lease,
      avatarUrl: typeof d.avatarUrl === 'string' && d.avatarUrl.trim() !== '' ? d.avatarUrl : null,
      emergencyName: typeof d.emergencyName === 'string' ? d.emergencyName : '',
      emergencyRelationship: typeof d.emergencyRelationship === 'string' ? d.emergencyRelationship : '',
      emergencyPhone: typeof d.emergencyPhone === 'string' ? d.emergencyPhone : '',
      emergencyEmail: typeof d.emergencyEmail === 'string' ? d.emergencyEmail : '',
      bio: typeof d.bio === 'string' ? d.bio : '',
      occupancyType:
        typeof d.occupancyType === 'string' && (d.occupancyType === '' || ONBOARD_OCC_SET.has(d.occupancyType))
          ? d.occupancyType
          : '',
      moveInFlex:
        typeof d.moveInFlex === 'string' && (d.moveInFlex === '' || ONBOARD_MOVE_FLEX_SET.has(d.moveInFlex))
          ? d.moveInFlex
          : '',
      hasPets: Boolean(d.hasPets),
      needsParking: Boolean(d.needsParking),
      billsPref:
        typeof d.billsPref === 'string' && (d.billsPref === '' || ONBOARD_BILLS_SET.has(d.billsPref))
          ? d.billsPref
          : '',
      furnishingPref:
        typeof d.furnishingPref === 'string' && (d.furnishingPref === '' || ONBOARD_FURN_SET.has(d.furnishingPref))
          ? d.furnishingPref
          : '',
      hasGuarantor: Boolean(d.hasGuarantor),
      guarantorName: typeof d.guarantorName === 'string' ? d.guarantorName : '',
    }
  } catch {
    return null
  }
}

function isStudentOnboardingDraftMeaningful(d: StudentOnboardingDraftV1): boolean {
  return (
    d.step === 2 ||
    d.step === 3 ||
    d.firstName.trim() !== '' ||
    d.lastName.trim() !== '' ||
    d.universityId.trim() !== '' ||
    d.campusId.trim() !== '' ||
    d.course.trim() !== '' ||
    d.studyLevel !== '' ||
    d.gender !== '' ||
    d.phone.trim() !== '' ||
    d.budgetRange !== '' ||
    d.moveInDate.trim() !== '' ||
    d.leaseLength !== '' ||
    (d.avatarUrl != null && d.avatarUrl.trim() !== '') ||
    d.emergencyName.trim() !== '' ||
    d.emergencyRelationship.trim() !== '' ||
    d.emergencyPhone.trim() !== '' ||
    d.emergencyEmail.trim() !== '' ||
    d.bio.trim() !== '' ||
    d.occupancyType !== '' ||
    d.moveInFlex !== '' ||
    d.hasPets ||
    d.needsParking ||
    d.billsPref !== '' ||
    d.furnishingPref !== '' ||
    d.hasGuarantor ||
    d.guarantorName.trim() !== ''
  )
}

function studyLevelToYear(level: string): number | null {
  const m: Record<string, number> = {
    year_1: 1,
    year_2: 2,
    year_3: 3,
    year_4: 4,
    postgraduate: 5,
    phd: 6,
  }
  return m[level] ?? null
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:border-[#FF6F61]'
const selectClass = inputClass
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const errClass = 'text-red-600 text-xs mt-1'

export default function StudentOnboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, refreshProfile } = useAuthContext()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<StudentProfileRow | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [welcome, setWelcome] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [partialSaveHint, setPartialSaveHint] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Step 1
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [course, setCourse] = useState('')
  const [studyLevel, setStudyLevel] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [budgetRange, setBudgetRange] = useState<BudgetRangeValue | ''>('')
  const [moveInDate, setMoveInDate] = useState('')
  const [leaseLength, setLeaseLength] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Step 2
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyRelationship, setEmergencyRelationship] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyEmail, setEmergencyEmail] = useState('')
  const [bio, setBio] = useState('')
  const [occupancyType, setOccupancyType] = useState('')
  const [moveInFlex, setMoveInFlex] = useState('')
  const [hasPets, setHasPets] = useState(false)
  const [needsParking, setNeedsParking] = useState(false)
  const [billsPref, setBillsPref] = useState('')
  const [furnishingPref, setFurnishingPref] = useState('')
  const [hasGuarantor, setHasGuarantor] = useState(false)
  const [guarantorName, setGuarantorName] = useState('')

  // Step 3
  const [termsAccepted, setTermsAccepted] = useState(false)

  const studentOnboardingDraftSnapshot = useMemo(
    () =>
      studentOnboardingDraftFromState({
        step,
        firstName,
        lastName,
        universityId,
        campusId,
        course,
        studyLevel,
        gender,
        phone,
        budgetRange,
        moveInDate,
        leaseLength,
        avatarUrl,
        emergencyName,
        emergencyRelationship,
        emergencyPhone,
        emergencyEmail,
        bio,
        occupancyType,
        moveInFlex,
        hasPets,
        needsParking,
        billsPref,
        furnishingPref,
        hasGuarantor,
        guarantorName,
      }),
    [
      step,
      firstName,
      lastName,
      universityId,
      campusId,
      course,
      studyLevel,
      gender,
      phone,
      budgetRange,
      moveInDate,
      leaseLength,
      avatarUrl,
      emergencyName,
      emergencyRelationship,
      emergencyPhone,
      emergencyEmail,
      bio,
      occupancyType,
      moveInFlex,
      hasPets,
      needsParking,
      billsPref,
      furnishingPref,
      hasGuarantor,
      guarantorName,
    ],
  )

  const restoredLocationKeyRef = useRef<string | null>(null)
  const resumeDraftBannerDismissedKeyRef = useRef<string | null>(null)
  const draftSavedHideTimerRef = useRef<number | null>(null)
  const [draftSaveEnabled, setDraftSaveEnabled] = useState(false)
  const [showResumeDraftBanner, setShowResumeDraftBanner] = useState(false)
  const [draftSavedVisible, setDraftSavedVisible] = useState(false)

  const hydrateFromProfile = useCallback((p: StudentProfileRow) => {
    setFirstName(p.first_name?.trim() ?? '')
    setLastName(p.last_name?.trim() ?? '')
    setUniversityId(p.university_id ?? '')
    setCampusId(p.campus_id ?? '')
    setCourse(p.course?.trim() ?? '')
    setStudyLevel(p.study_level?.trim() ?? '')
    setGender(p.gender?.trim() ?? '')
    setPhone(p.phone?.trim() ?? '')
    setBudgetRange(minMaxToBudgetRange(p.budget_min_per_week, p.budget_max_per_week))
    setMoveInDate(p.preferred_move_in_date ? p.preferred_move_in_date.slice(0, 10) : '')
    setLeaseLength(p.preferred_lease_length?.trim() ?? '')
    setAvatarUrl(p.avatar_url?.trim() ?? null)
    setEmergencyName(p.emergency_contact_name?.trim() ?? '')
    setEmergencyRelationship(p.emergency_contact_relationship?.trim() ?? '')
    setEmergencyPhone(p.emergency_contact_phone?.trim() ?? '')
    setEmergencyEmail(p.emergency_contact_email?.trim() ?? '')
    setBio(p.bio?.trim() ?? '')
    setOccupancyType(p.occupancy_type ?? '')
    setMoveInFlex(p.move_in_flexibility ?? '')
    setHasPets(p.has_pets === true)
    setNeedsParking(p.needs_parking === true)
    setBillsPref(p.bills_preference ?? '')
    setFurnishingPref(p.furnishing_preference ?? '')
    setHasGuarantor(p.has_guarantor === true)
    setGuarantorName(p.guarantor_name?.trim() ?? '')
    setStep(inferStudentOnboardingStep(p, p.accommodation_verification_route))
  }, [])

  const handleDraftStartFresh = useCallback(() => {
    try {
      localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY)
    } catch {
      /* ignore */
    }
    setShowResumeDraftBanner(false)
    resumeDraftBannerDismissedKeyRef.current = location.key
    if (profile) {
      hydrateFromProfile(profile)
    }
    setTermsAccepted(false)
    setFormError(null)
    setFieldErrors({})
    setPartialSaveHint(null)
    setDraftSavedVisible(false)
    if (draftSavedHideTimerRef.current) {
      window.clearTimeout(draftSavedHideTimerRef.current)
      draftSavedHideTimerRef.current = null
    }
  }, [profile, hydrateFromProfile, location.key])

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
    if (welcome) {
      setDraftSaveEnabled(false)
      setShowResumeDraftBanner(false)
      return
    }
    if (loading || !profile) {
      setDraftSaveEnabled(false)
      return
    }

    if (restoredLocationKeyRef.current === location.key) {
      setDraftSaveEnabled(true)
      return
    }
    restoredLocationKeyRef.current = location.key

    const parsed = parseStudentOnboardingDraft(localStorage.getItem(STUDENT_ONBOARDING_DRAFT_KEY))
    if (parsed && isStudentOnboardingDraftMeaningful(parsed)) {
      setStep(parsed.step)
      setFirstName(parsed.firstName)
      setLastName(parsed.lastName)
      setUniversityId(parsed.universityId)
      setCampusId(parsed.campusId)
      setCourse(parsed.course)
      setStudyLevel(parsed.studyLevel)
      setGender(parsed.gender)
      setPhone(parsed.phone)
      setBudgetRange(parsed.budgetRange)
      setMoveInDate(parsed.moveInDate)
      setLeaseLength(parsed.leaseLength)
      setAvatarUrl(parsed.avatarUrl)
      setEmergencyName(parsed.emergencyName)
      setEmergencyRelationship(parsed.emergencyRelationship)
      setEmergencyPhone(parsed.emergencyPhone)
      setEmergencyEmail(parsed.emergencyEmail)
      setBio(parsed.bio)
      setOccupancyType(parsed.occupancyType)
      setMoveInFlex(parsed.moveInFlex)
      setHasPets(parsed.hasPets)
      setNeedsParking(parsed.needsParking)
      setBillsPref(parsed.billsPref)
      setFurnishingPref(parsed.furnishingPref)
      setHasGuarantor(parsed.hasGuarantor)
      setGuarantorName(parsed.guarantorName)
      setTermsAccepted(false)
      if (resumeDraftBannerDismissedKeyRef.current !== location.key) {
        setShowResumeDraftBanner(true)
      }
    } else {
      setShowResumeDraftBanner(false)
    }
    setDraftSaveEnabled(true)
  }, [welcome, loading, profile?.id, location.key])

  useEffect(() => {
    if (welcome || !draftSaveEnabled || loading || !profile) return
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STUDENT_ONBOARDING_DRAFT_KEY, JSON.stringify(studentOnboardingDraftSnapshot))
      } catch {
        /* quota / private mode */
      }
      setDraftSavedVisible(true)
      if (draftSavedHideTimerRef.current) window.clearTimeout(draftSavedHideTimerRef.current)
      draftSavedHideTimerRef.current = window.setTimeout(() => {
        setDraftSavedVisible(false)
        draftSavedHideTimerRef.current = null
      }, 2200)
    }, 500)
    return () => window.clearTimeout(id)
  }, [studentOnboardingDraftSnapshot, welcome, draftSaveEnabled, loading, profile?.id])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const profRes = await withSentryMonitoring('StudentOnboarding/fetch-profile', () =>
          supabase.from('student_profiles').select('*').eq('user_id', user.id).single(),
        )
        if (cancelled) return
        if (profRes.error) {
          setLoadError(profRes.error.message)
          setProfile(null)
          return
        }
        const row = profRes.data as StudentProfileRow
        if (
          row.onboarding_complete === true ||
          (user.id && hasClientStudentOnboardingComplete(user.id))
        ) {
          navigate('/listings', { replace: true })
          return
        }
        setProfile(row)
        hydrateFromProfile(row)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, navigate, hydrateFromProfile])

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
      const { error: dbErr } = await withSentryMonitoring('StudentOnboarding/update-avatar-url', () =>
        supabase
          .from('student_profiles')
          .update({ avatar_url: pub.publicUrl })
          .eq('user_id', user.id),
      )
      if (dbErr) throw dbErr
      setAvatarUrl(pub.publicUrl)
      await refreshProfile()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setPhotoError(
        msg.includes('Bucket not found') || msg.includes('not found')
          ? 'Photo storage is not set up yet. Create a public bucket named "student-avatars" and run supabase/storage_student_profile_photos.sql.'
          : msg,
      )
    } finally {
      setPhotoUploading(false)
    }
  }

  const isIdentityPath = isNonStudentAccommodationRoute(profile?.accommodation_verification_route)

  function validateStep1(): boolean {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required.'
    if (!lastName.trim()) e.lastName = 'Last name is required.'
    if (!isIdentityPath) {
      if (!universityId) e.universityId = 'Select your university.'
      if (!course.trim()) e.course = 'Enter your course or degree.'
      if (!studyLevel) e.studyLevel = 'Select your year of study.'
    }
    if (!gender) e.gender = 'Select an option.'
    if (!phone.trim()) e.phone = 'Phone number is required.'
    else if (!isValidAuPhone(phone)) e.phone = 'Enter a valid phone number.'
    if (!budgetRange) e.budgetRange = 'Select a weekly budget range.'
    if (!moveInDate) e.moveInDate = 'Choose a preferred move-in date.'
    if (!leaseLength) e.leaseLength = 'Select a preferred lease length.'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {}
    if (!emergencyName.trim()) e.emergencyName = 'Name is required.'
    if (!emergencyRelationship.trim()) e.emergencyRelationship = 'Relationship is required.'
    if (!emergencyPhone.trim()) e.emergencyPhone = 'Phone is required.'
    else if (!isValidAuPhone(emergencyPhone)) e.emergencyPhone = 'Enter a valid phone number.'
    if (emergencyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyEmail.trim())) {
      e.emergencyEmail = 'Enter a valid email address.'
    }
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function saveStep1(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setPartialSaveHint(null)
    if (!validateStep1() || !user?.id) return
    const { min, max } = budgetRangeToMinMax(budgetRange as BudgetRangeValue)
    const combined = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null
    const yearNum = isIdentityPath ? null : studyLevelToYear(studyLevel)

    const corePayload = isIdentityPath
      ? {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: combined,
          university_id: null,
          campus_id: null,
          course: null,
          year_of_study: null,
          study_level: null,
          gender,
          phone: phone.trim(),
          budget_min_per_week: min,
          budget_max_per_week: max,
        }
      : {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: combined,
          university_id: universityId,
          campus_id: universityId ? campusId.trim() || null : null,
          course: course.trim(),
          year_of_study: yearNum,
          gender,
          phone: phone.trim(),
          budget_min_per_week: min,
          budget_max_per_week: max,
        }
    const onboardingExtras = isIdentityPath
      ? {
          study_level: null,
          preferred_move_in_date: moveInDate,
          preferred_lease_length: leaseLength,
        }
      : {
          study_level: studyLevel,
          preferred_move_in_date: moveInDate,
          preferred_lease_length: leaseLength,
        }
    const fullPayload = { ...corePayload, ...onboardingExtras }
    const bootstrapPayload = isIdentityPath
      ? {
          full_name: combined,
          university_id: null,
          campus_id: null,
          course: null,
          year_of_study: null,
          phone: phone.trim(),
        }
      : {
          full_name: combined,
          university_id: universityId,
          campus_id: universityId ? campusId.trim() || null : null,
          course: course.trim(),
          year_of_study: yearNum,
          phone: phone.trim(),
        }

    setSubmitting(true)
    try {
      let { error } = await withSentryMonitoring('StudentOnboarding/update-step1-full', () =>
        supabase.from('student_profiles').update(fullPayload).eq('user_id', user.id),
      )

      if (error && looksLikeMissingDbColumn(error)) {
        const r = await withSentryMonitoring('StudentOnboarding/update-step1-core', () =>
          supabase.from('student_profiles').update(corePayload).eq('user_id', user.id),
        )
        error = r.error
        if (!error) {
          setPartialSaveHint(
            'Move-in date and lease length will save after your project runs `supabase/student_onboarding.sql` in the SQL Editor. You can continue for now.',
          )
        }
      }

      if (error && looksLikeMissingDbColumn(error)) {
        const r = await withSentryMonitoring('StudentOnboarding/update-step1-bootstrap', () =>
          supabase.from('student_profiles').update(bootstrapPayload).eq('user_id', user.id),
        )
        error = r.error
        if (!error) {
          setPartialSaveHint(
            'Your database is missing some student profile columns. We saved the basics — run `supabase/student_profile_extend.sql` and `supabase/student_onboarding.sql`, then update your profile under Student profile.',
          )
        }
      }

      if (error) {
        const msg = messageFromSupabaseError(error)
        const hint = looksLikeMissingDbColumn(error)
          ? ' Run `supabase/student_profile_extend.sql` and `supabase/student_onboarding.sql` in Supabase → SQL Editor.'
          : /row level security|rls|42501|permission denied/i.test(msg)
            ? ' If this is an RLS error, confirm policies allow students to update their own row.'
            : ''
        const formErrMsg = msg + hint
        setFormError(formErrMsg)
        if (formErrMsg) reportFormError('StudentOnboarding', 'formError', formErrMsg, { sentry: true })
        return
      }

      setStep(2)
      setFieldErrors({})
      await refreshProfile()
      const { data } = await withSentryMonitoring('StudentOnboarding/fetch-profile-after-step1', () =>
        supabase.from('student_profiles').select('*').eq('user_id', user.id).single(),
      )
      if (data) setProfile(data as StudentProfileRow)
      try {
        localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY)
      } catch {
        /* ignore */
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function saveStep2(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setPartialSaveHint(null)
    if (!validateStep2() || !user?.id) return
    setSubmitting(true)
    try {
      const fullPayload = {
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_relationship: emergencyRelationship.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_contact_email: emergencyEmail.trim() || null,
        bio: bio.trim() || null,
        occupancy_type: occupancyType ? (occupancyType as 'sole' | 'couple' | 'open') : null,
        move_in_flexibility: moveInFlex ? (moveInFlex as 'exact' | 'one_week' | 'two_weeks') : null,
        has_pets: hasPets,
        needs_parking: needsParking,
        bills_preference: billsPref ? (billsPref as 'included' | 'separate' | 'either') : null,
        furnishing_preference: furnishingPref
          ? (furnishingPref as 'furnished' | 'unfurnished' | 'either')
          : null,
        has_guarantor: hasGuarantor,
        guarantor_name: hasGuarantor && guarantorName.trim() ? guarantorName.trim() : null,
      }
      const corePayload = {
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
      }

      let { error } = await withSentryMonitoring('StudentOnboarding/update-step2-full', () =>
        supabase.from('student_profiles').update(fullPayload).eq('user_id', user.id),
      )

      if (error && looksLikeMissingDbColumn(error)) {
        const r = await withSentryMonitoring('StudentOnboarding/update-step2-core', () =>
          supabase.from('student_profiles').update(corePayload).eq('user_id', user.id),
        )
        error = r.error
        if (!error) {
          setPartialSaveHint(
            'Emergency relationship and email will save after `supabase/student_onboarding.sql` is applied. Name and phone were saved.',
          )
        }
      }

      if (error) {
        const formErrMsg =
          messageFromSupabaseError(error) +
          (looksLikeMissingDbColumn(error)
            ? ' Run `supabase/student_profile_extend.sql` and `supabase/student_onboarding.sql` in Supabase.'
            : '')
        setFormError(formErrMsg)
        if (formErrMsg) reportFormError('StudentOnboarding', 'formError', formErrMsg, { sentry: true })
        return
      }

      setStep(3)
      setFieldErrors({})
      await refreshProfile()
      const { data } = await withSentryMonitoring('StudentOnboarding/fetch-profile-after-step2', () =>
        supabase.from('student_profiles').select('*').eq('user_id', user.id).single(),
      )
      if (data) setProfile(data as StudentProfileRow)
      try {
        localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY)
      } catch {
        /* ignore */
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function saveStep3(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setPartialSaveHint(null)
    if (!termsAccepted) {
      setFieldErrors({
        terms: 'Please accept the Terms of Service and Privacy Policy to continue.',
      })
      return
    }
    setFieldErrors({})
    if (!user?.id) return
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const fullPayload = {
        onboarding_complete: true,
        terms_accepted_at: now,
      }
      let { error } = await withSentryMonitoring('StudentOnboarding/complete-onboarding-full', () =>
        supabase.from('student_profiles').update(fullPayload).eq('user_id', user.id),
      )

      if (error && looksLikeMissingDbColumn(error)) {
        const r = await withSentryMonitoring('StudentOnboarding/complete-onboarding-minimal', () =>
          supabase.from('student_profiles').update({ onboarding_complete: true }).eq('user_id', user.id),
        )
        error = r.error
        if (!error) {
          setPartialSaveHint(
            '`terms_accepted_at` will record after `supabase/student_onboarding.sql` adds that column.',
          )
        }
      }

      if (error) {
        if (looksLikeMissingDbColumn(error)) {
          markStudentOnboardingCompleteClient(user.id)
          setPartialSaveHint(
            'The database is missing onboarding columns. Run `supabase/student_onboarding.sql` in Supabase → SQL Editor so completion and terms acceptance are stored. You can continue using the site on this device for now.',
          )
          await refreshProfile()
          try {
            localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY)
          } catch {
            /* ignore */
          }
          setWelcome(true)
          return
        }
        const formErrMsg = messageFromSupabaseError(error)
        setFormError(formErrMsg)
        if (formErrMsg) reportFormError('StudentOnboarding', 'formError', formErrMsg, { sentry: true })
        return
      }

      await refreshProfile()
      try {
        localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY)
      } catch {
        /* ignore */
      }
      // Keep post-onboarding routing consistent with the student flow:
      // once `onboarding_complete` is persisted, skip the completion screen and land on listings.
      consumePostAuthRedirect()
      navigate('/listings', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  function goBack() {
    setFormError(null)
    setFieldErrors({})
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  function finishToListings() {
    consumePostAuthRedirect()
    navigate('/listings', { state: { studentOnboardingWelcome: true }, replace: true })
  }

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

  if (role && role !== 'student') {
    return <Navigate to="/" replace />
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
        <p className="text-red-700 text-sm">{loadError ?? 'Profile not found.'}</p>
        <Link to="/student-dashboard" className="text-sm text-[#FF6F61] font-medium mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (profile.onboarding_complete === true || (user.id && hasClientStudentOnboardingComplete(user.id))) {
    return <Navigate to="/listings" replace />
  }

  const stepLabel = welcome ? 'Done' : `Step ${step} of 3`

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-stone-50 pb-16">
      <PageHeroBand
        title="Welcome to Quni Living"
        subtitle={!welcome ? stepLabel : undefined}
        subtitleClassName="text-white/85 text-sm sm:text-base mt-2 font-semibold tracking-wide"
      />

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-8">
        {!welcome && showResumeDraftBanner && (
          <div
            className="mb-4 rounded-xl border border-[#FF6F61]/25 bg-[#FF6F61]/8 px-4 py-3 text-sm text-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            role="region"
            aria-label="Saved draft"
          >
            <p className="text-stone-700">Resume draft? We restored your last saved answers.</p>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  resumeDraftBannerDismissedKeyRef.current = location.key
                  setShowResumeDraftBanner(false)
                }}
                className="rounded-lg bg-[#FF6F61] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#e85d52]"
              >
                Continue editing
              </button>
              <button
                type="button"
                onClick={handleDraftStartFresh}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Start fresh
              </button>
            </div>
          </div>
        )}
        {!welcome && draftSavedVisible && (
          <p className="text-xs text-stone-400 text-right mb-2 tabular-nums" aria-live="polite">
            Draft saved
          </p>
        )}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-stone-900/5 px-5 py-8 sm:px-8 sm:py-10">
          {welcome ? (
            <div className="text-center space-y-6">
              {partialSaveHint && (
                <div className="text-left rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {partialSaveHint}
                </div>
              )}
              <p className="font-display text-xl sm:text-2xl font-bold text-stone-900 text-balance">
                You&apos;re all set! Let&apos;s find your perfect home.
              </p>
              <button
                type="button"
                onClick={finishToListings}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6F61] text-white px-6 py-3.5 text-sm font-semibold hover:bg-[#e85d52] transition-colors shadow-sm"
              >
                Browse listings →
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-8">
                {([1, 2, 3] as const).map((n) => (
                  <div
                    key={n}
                    className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[#FF6F61]' : 'bg-stone-200'}`}
                    aria-hidden
                  />
                ))}
              </div>

              {formError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {formError}
                </div>
              )}

              {partialSaveHint && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {partialSaveHint}
                </div>
              )}

              {step === 1 && (
                <form onSubmit={saveStep1} className="space-y-5">
                  <h2 className="text-lg font-bold text-stone-900">About you</h2>
                  <p className="text-sm text-stone-600">
                    {isIdentityPath
                      ? 'Tell us a bit about yourself so we can match you with homes listed as open to non-students.'
                      : 'Tell us a bit about yourself so we can match you with the right homes.'}
                  </p>

                  <div className="flex flex-col items-center gap-3 pb-2">
                    <div className="h-24 w-24 rounded-full bg-stone-100 overflow-hidden ring-2 ring-stone-200 flex items-center justify-center text-stone-400 text-2xl font-semibold">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(firstName[0] || lastName[0] || '?').toUpperCase()}</span>
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <span className="text-sm font-medium text-[#FF6F61] hover:underline">Upload photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={photoUploading} />
                    </label>
                    {photoUploading && <p className="text-xs text-stone-500">Uploading…</p>}
                    {photoError && <p className={errClass}>{photoError}</p>}
                    <p className="text-xs text-stone-500 text-center max-w-xs">
                      Optional — skip for now and add a photo anytime in your profile.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="so-fn" className={labelClass}>
                        First name
                      </label>
                      <input
                        id="so-fn"
                        value={firstName}
                        onChange={(ev) => setFirstName(ev.target.value)}
                        className={inputClass}
                        autoComplete="given-name"
                      />
                      {fieldErrors.firstName && <p className={errClass}>{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label htmlFor="so-ln" className={labelClass}>
                        Last name
                      </label>
                      <input
                        id="so-ln"
                        value={lastName}
                        onChange={(ev) => setLastName(ev.target.value)}
                        className={inputClass}
                        autoComplete="family-name"
                      />
                      {fieldErrors.lastName && <p className={errClass}>{fieldErrors.lastName}</p>}
                    </div>
                  </div>

                  {!isIdentityPath && (
                    <>
                      <div>
                        <UniversityCampusSelect
                          universityId={universityId || null}
                          campusId={campusId || null}
                          onUniversityChange={(id) => {
                            setUniversityId(id)
                            setCampusId('')
                          }}
                          onCampusChange={setCampusId}
                          referenceScope="full"
                          required
                          showState
                          labelClassName={labelClass}
                          universitySelectClassName={selectClass}
                          campusSelectClassName={selectClass}
                          universityIdAttr="so-uni"
                          campusIdAttr="so-campus"
                        />
                        {fieldErrors.universityId && <p className={errClass}>{fieldErrors.universityId}</p>}
                      </div>

                      <div>
                        <label htmlFor="so-course" className={labelClass}>
                          Course / degree
                        </label>
                        <input
                          id="so-course"
                          value={course}
                          onChange={(ev) => setCourse(ev.target.value)}
                          placeholder="e.g. Bachelor of Commerce"
                          className={inputClass}
                        />
                        {fieldErrors.course && <p className={errClass}>{fieldErrors.course}</p>}
                      </div>

                      <div>
                        <label htmlFor="so-year" className={labelClass}>
                          Year of study
                        </label>
                        <select
                          id="so-year"
                          value={studyLevel}
                          onChange={(ev) => setStudyLevel(ev.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select</option>
                          {STUDY_LEVEL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.studyLevel && <p className={errClass}>{fieldErrors.studyLevel}</p>}
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="so-gender" className={labelClass}>
                      Gender
                    </label>
                    <select
                      id="so-gender"
                      value={gender}
                      onChange={(ev) => setGender(ev.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select</option>
                      {GENDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.gender && <p className={errClass}>{fieldErrors.gender}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-phone" className={labelClass}>
                      Phone number
                    </label>
                    <input
                      id="so-phone"
                      value={phone}
                      onChange={(ev) => setPhone(ev.target.value)}
                      placeholder="04xx xxx xxx or +61…"
                      className={inputClass}
                      autoComplete="tel"
                    />
                    {fieldErrors.phone && <p className={errClass}>{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-budget" className={labelClass}>
                      Weekly budget
                    </label>
                    <select
                      id="so-budget"
                      value={budgetRange}
                      onChange={(ev) => setBudgetRange(ev.target.value as BudgetRangeValue | '')}
                      className={selectClass}
                    >
                      <option value="">Select range</option>
                      {BUDGET_RANGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.budgetRange && <p className={errClass}>{fieldErrors.budgetRange}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-movein" className={labelClass}>
                      Preferred move-in date
                    </label>
                    <input
                      id="so-movein"
                      type="date"
                      value={moveInDate}
                      onChange={(ev) => setMoveInDate(ev.target.value)}
                      className={inputClass}
                    />
                    {fieldErrors.moveInDate && <p className={errClass}>{fieldErrors.moveInDate}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-lease" className={labelClass}>
                      Preferred lease length
                    </label>
                    <select
                      id="so-lease"
                      value={leaseLength}
                      onChange={(ev) => setLeaseLength(ev.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select</option>
                      {LEASE_LENGTH_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.leaseLength && <p className={errClass}>{fieldErrors.leaseLength}</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-6 py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Saving…' : 'Continue →'}
                    </button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={saveStep2} className="space-y-5">
                  <h2 className="text-lg font-bold text-stone-900">Emergency contact</h2>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    This information is only shared with your landlord after a booking is confirmed. It helps ensure your
                    safety and wellbeing during your tenancy.
                  </p>

                  <div>
                    <label htmlFor="so-en-name" className={labelClass}>
                      Emergency contact name
                    </label>
                    <input
                      id="so-en-name"
                      value={emergencyName}
                      onChange={(ev) => setEmergencyName(ev.target.value)}
                      className={inputClass}
                    />
                    {fieldErrors.emergencyName && <p className={errClass}>{fieldErrors.emergencyName}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-en-rel" className={labelClass}>
                      Relationship
                    </label>
                    <input
                      id="so-en-rel"
                      value={emergencyRelationship}
                      onChange={(ev) => setEmergencyRelationship(ev.target.value)}
                      placeholder="e.g. Mother, Father, Guardian"
                      className={inputClass}
                    />
                    {fieldErrors.emergencyRelationship && <p className={errClass}>{fieldErrors.emergencyRelationship}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-en-phone" className={labelClass}>
                      Emergency contact phone
                    </label>
                    <input
                      id="so-en-phone"
                      value={emergencyPhone}
                      onChange={(ev) => setEmergencyPhone(ev.target.value)}
                      className={inputClass}
                      autoComplete="tel"
                    />
                    {fieldErrors.emergencyPhone && <p className={errClass}>{fieldErrors.emergencyPhone}</p>}
                  </div>

                  <div>
                    <label htmlFor="so-en-email" className={labelClass}>
                      Emergency contact email <span className="text-stone-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="so-en-email"
                      type="email"
                      value={emergencyEmail}
                      onChange={(ev) => setEmergencyEmail(ev.target.value)}
                      className={inputClass}
                      autoComplete="email"
                    />
                    {fieldErrors.emergencyEmail && <p className={errClass}>{fieldErrors.emergencyEmail}</p>}
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-[#FEF9E4]/50 px-4 py-4 space-y-4">
                    <h3 className="text-sm font-bold text-stone-900">Living preferences</h3>
                    <p className="text-xs text-stone-600">Optional — helps landlords see if you&apos;re a good fit.</p>
                    <div>
                      <label htmlFor="so-bio" className={labelClass}>
                        Short bio
                      </label>
                      <textarea
                        id="so-bio"
                        rows={3}
                        value={bio}
                        onChange={(ev) => setBio(ev.target.value)}
                        className={inputClass}
                        placeholder="A few sentences about you"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="so-occ" className={labelClass}>
                          Occupancy
                        </label>
                        <select
                          id="so-occ"
                          value={occupancyType}
                          onChange={(ev) => setOccupancyType(ev.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select</option>
                          <option value="sole">Sole occupant</option>
                          <option value="couple">Couple</option>
                          <option value="open">Flexible</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="so-mflex" className={labelClass}>
                          Move-in flexibility
                        </label>
                        <select
                          id="so-mflex"
                          value={moveInFlex}
                          onChange={(ev) => setMoveInFlex(ev.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select</option>
                          <option value="exact">Exact date</option>
                          <option value="one_week">± 1 week</option>
                          <option value="two_weeks">± 2 weeks</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-stone-800">
                        <input
                          type="checkbox"
                          checked={hasPets}
                          onChange={(ev) => setHasPets(ev.target.checked)}
                          className="rounded border-stone-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                        />
                        I have pets
                      </label>
                      <label className="flex items-center gap-2 text-sm text-stone-800">
                        <input
                          type="checkbox"
                          checked={needsParking}
                          onChange={(ev) => setNeedsParking(ev.target.checked)}
                          className="rounded border-stone-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                        />
                        I need parking
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="so-bills" className={labelClass}>
                          Bills preference
                        </label>
                        <select
                          id="so-bills"
                          value={billsPref}
                          onChange={(ev) => setBillsPref(ev.target.value)}
                          className={selectClass}
                        >
                          <option value="">No preference</option>
                          <option value="included">Bills included</option>
                          <option value="separate">Bills separate</option>
                          <option value="either">Either</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="so-furn" className={labelClass}>
                          Furnishing preference
                        </label>
                        <select
                          id="so-furn"
                          value={furnishingPref}
                          onChange={(ev) => setFurnishingPref(ev.target.value)}
                          className={selectClass}
                        >
                          <option value="">No preference</option>
                          <option value="furnished">Furnished</option>
                          <option value="unfurnished">Unfurnished</option>
                          <option value="either">Either</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm text-stone-800">
                        <input
                          type="checkbox"
                          checked={hasGuarantor}
                          onChange={(ev) => setHasGuarantor(ev.target.checked)}
                          className="rounded border-stone-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                        />
                        I have a guarantor
                      </label>
                      {hasGuarantor && (
                        <div className="mt-2">
                          <label htmlFor="so-gname" className={labelClass}>
                            Guarantor name (optional)
                          </label>
                          <input
                            id="so-gname"
                            value={guarantorName}
                            onChange={(ev) => setGuarantorName(ev.target.value)}
                            className={inputClass}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-sm font-medium text-stone-600 hover:text-stone-900 order-2 sm:order-1"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="order-1 sm:order-2 inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-6 py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Saving…' : 'Continue →'}
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={saveStep3} className="space-y-6">
                  <h2 className="text-lg font-bold text-stone-900">Terms &amp; welcome</h2>
                  <p className="text-sm text-stone-600">
                    Almost there — confirm you agree to our policies before you start browsing.
                  </p>

                  <label
                    htmlFor="so-terms-accept"
                    className="relative z-10 flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed touch-manipulation"
                  >
                    <span className="flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px] -ml-2 pl-2 self-start rounded-lg active:bg-stone-50/80">
                      <input
                        id="so-terms-accept"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(ev) => {
                          setTermsAccepted(ev.target.checked)
                          setFieldErrors((prev) => ({ ...prev, terms: '' }))
                        }}
                        className="h-5 w-5 rounded border-stone-300 text-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61] accent-[#FF6F61]"
                      />
                    </span>
                    <span className="pt-2.5 min-w-0">
                      I agree to the{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-[1] text-[#FF6F61] font-medium underline underline-offset-2"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-[1] text-[#FF6F61] font-medium underline underline-offset-2"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  {fieldErrors.terms && <p className={errClass}>{fieldErrors.terms}</p>}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-sm font-medium text-stone-600 hover:text-stone-900 order-2 sm:order-1"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="order-1 sm:order-2 inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-6 py-3 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Saving…' : 'Complete setup →'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
