import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
import { prepareProfilePhotoForUpload } from '../lib/prepareProfilePhotoForUpload'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type BookingMessageRow = Database['public']['Tables']['booking_messages']['Row']

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
  booking_messages?: BookingMessageRow[] | null
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

const OCCUPANCY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select' },
  { value: 'sole', label: 'Sole occupant' },
  { value: 'couple', label: 'Couple' },
  { value: 'open', label: 'Flexible' },
]

const MOVE_IN_FLEX_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select' },
  { value: 'exact', label: 'Exact date' },
  { value: 'one_week', label: '± 1 week' },
  { value: 'two_weeks', label: '± 2 weeks' },
]

const BILLS_PREF_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No preference' },
  { value: 'included', label: 'Bills included' },
  { value: 'separate', label: 'Bills separate' },
  { value: 'either', label: 'Either' },
]

const FURNISHING_PREF_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No preference' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'either', label: 'Either' },
]

const STUDENT_PROFILE_DRAFT_KEY = 'student_profile_draft' as const
const STUDENT_PROFILE_DRAFT_VERSION = 1 as const

const SP_GENDER_SET = new Set(GENDER_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_YEAR_SET = new Set(YEAR_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_NATIONALITY_SET = new Set(NATIONALITY_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_STUDENT_TYPE_SET = new Set(STUDENT_TYPE_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_ROOM_PREF_SET = new Set(ROOM_PREF_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_OCC_SET = new Set(OCCUPANCY_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_MOVE_FLEX_SET = new Set(MOVE_IN_FLEX_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_BILLS_SET = new Set(BILLS_PREF_OPTIONS.map((o) => o.value).filter(Boolean))
const SP_FURN_SET = new Set(FURNISHING_PREF_OPTIONS.map((o) => o.value).filter(Boolean))

type StudentProfileDraftV1 = {
  v: typeof STUDENT_PROFILE_DRAFT_VERSION
  firstName: string
  lastName: string
  phone: string
  gender: string
  nationality: string
  yearOfStudy: string
  course: string
  emergencyName: string
  emergencyPhone: string
  isSmoker: boolean
  dateOfBirth: string
  universityId: string
  campusId: string
  studentType: string
  roomPref: string
  budgetMin: string
  budgetMax: string
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

function studentProfileDraftFromState(s: Omit<StudentProfileDraftV1, 'v'>): StudentProfileDraftV1 {
  return { v: STUDENT_PROFILE_DRAFT_VERSION, ...s }
}

function parseStudentProfileDraft(raw: string | null): StudentProfileDraftV1 | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Record<string, unknown>
    if (d.v !== STUDENT_PROFILE_DRAFT_VERSION) return null
    const gender = typeof d.gender === 'string' && (d.gender === '' || SP_GENDER_SET.has(d.gender)) ? d.gender : ''
    const year =
      typeof d.yearOfStudy === 'string' && (d.yearOfStudy === '' || SP_YEAR_SET.has(d.yearOfStudy))
        ? d.yearOfStudy
        : ''
    const nat =
      typeof d.nationality === 'string' && (d.nationality === '' || SP_NATIONALITY_SET.has(d.nationality))
        ? d.nationality
        : ''
    const stu =
      typeof d.studentType === 'string' && (d.studentType === '' || SP_STUDENT_TYPE_SET.has(d.studentType))
        ? d.studentType
        : ''
    const room =
      typeof d.roomPref === 'string' && (d.roomPref === '' || SP_ROOM_PREF_SET.has(d.roomPref)) ? d.roomPref : ''
    const occ =
      typeof d.occupancyType === 'string' && (d.occupancyType === '' || SP_OCC_SET.has(d.occupancyType))
        ? d.occupancyType
        : ''
    const flex =
      typeof d.moveInFlex === 'string' && (d.moveInFlex === '' || SP_MOVE_FLEX_SET.has(d.moveInFlex))
        ? d.moveInFlex
        : ''
    const bills =
      typeof d.billsPref === 'string' && (d.billsPref === '' || SP_BILLS_SET.has(d.billsPref)) ? d.billsPref : ''
    const furn =
      typeof d.furnishingPref === 'string' && (d.furnishingPref === '' || SP_FURN_SET.has(d.furnishingPref))
        ? d.furnishingPref
        : ''
    return {
      v: STUDENT_PROFILE_DRAFT_VERSION,
      firstName: typeof d.firstName === 'string' ? d.firstName : '',
      lastName: typeof d.lastName === 'string' ? d.lastName : '',
      phone: typeof d.phone === 'string' ? d.phone : '',
      gender,
      nationality: nat,
      yearOfStudy: year,
      course: typeof d.course === 'string' ? d.course : '',
      emergencyName: typeof d.emergencyName === 'string' ? d.emergencyName : '',
      emergencyPhone: typeof d.emergencyPhone === 'string' ? d.emergencyPhone : '',
      isSmoker: Boolean(d.isSmoker),
      dateOfBirth: typeof d.dateOfBirth === 'string' ? d.dateOfBirth : '',
      universityId: typeof d.universityId === 'string' ? d.universityId : '',
      campusId: typeof d.campusId === 'string' ? d.campusId : '',
      studentType: stu,
      roomPref: room,
      budgetMin: typeof d.budgetMin === 'string' ? d.budgetMin : '',
      budgetMax: typeof d.budgetMax === 'string' ? d.budgetMax : '',
      bio: typeof d.bio === 'string' ? d.bio : '',
      occupancyType: occ,
      moveInFlex: flex,
      hasPets: Boolean(d.hasPets),
      needsParking: Boolean(d.needsParking),
      billsPref: bills,
      furnishingPref: furn,
      hasGuarantor: Boolean(d.hasGuarantor),
      guarantorName: typeof d.guarantorName === 'string' ? d.guarantorName : '',
    }
  } catch {
    return null
  }
}

function isStudentProfileDraftMeaningful(d: StudentProfileDraftV1): boolean {
  return (
    d.firstName.trim() !== '' ||
    d.lastName.trim() !== '' ||
    d.phone.trim() !== '' ||
    d.gender !== '' ||
    d.nationality !== '' ||
    d.yearOfStudy !== '' ||
    d.course.trim() !== '' ||
    d.emergencyName.trim() !== '' ||
    d.emergencyPhone.trim() !== '' ||
    d.isSmoker ||
    d.dateOfBirth.trim() !== '' ||
    d.universityId.trim() !== '' ||
    d.campusId.trim() !== '' ||
    d.studentType !== '' ||
    d.roomPref !== '' ||
    d.budgetMin.trim() !== '' ||
    d.budgetMax.trim() !== '' ||
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
    case 'awaiting_info':
      return 'bg-sky-100 text-sky-900'
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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    universities: refUniversities,
    loading: refDataLoading,
    error: refDataError,
  } = useUniversityCampusReference('full')
  const [activeTab, setActiveTab] = useState<StudentTab>(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab')
      if (t === 'bookings' || t === 'verification') return t
    } catch {
      /* ignore */
    }
    return 'profile'
  })
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
  const [bio, setBio] = useState('')
  const [occupancyType, setOccupancyType] = useState('')
  const [moveInFlex, setMoveInFlex] = useState('')
  const [hasPets, setHasPets] = useState(false)
  const [needsParking, setNeedsParking] = useState(false)
  const [billsPref, setBillsPref] = useState('')
  const [furnishingPref, setFurnishingPref] = useState('')
  const [hasGuarantor, setHasGuarantor] = useState(false)
  const [guarantorName, setGuarantorName] = useState('')

  const [bookingReplyById, setBookingReplyById] = useState<Record<string, string>>({})
  const [bookingReplyBusy, setBookingReplyBusy] = useState<string | null>(null)

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false)
  const [dangerZoneVisible, setDangerZoneVisible] = useState(false)
  const dangerZoneRef = useRef<HTMLElement>(null)

  const applyProfileToForm = useCallback((prof: StudentRow) => {
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
    setBudgetMin(prof.budget_min_per_week != null ? String(prof.budget_min_per_week) : '')
    setBudgetMax(prof.budget_max_per_week != null ? String(prof.budget_max_per_week) : '')
    setBio(prof.bio?.trim() ?? '')
    setOccupancyType(prof.occupancy_type ?? '')
    setMoveInFlex(prof.move_in_flexibility ?? '')
    setHasPets(prof.has_pets === true)
    setNeedsParking(prof.needs_parking === true)
    setBillsPref(prof.bills_preference ?? '')
    setFurnishingPref(prof.furnishing_preference ?? '')
    setHasGuarantor(prof.has_guarantor === true)
    setGuarantorName(prof.guarantor_name?.trim() ?? '')
  }, [])

  const studentProfileDraftSnapshot = useMemo(
    () =>
      studentProfileDraftFromState({
        firstName,
        lastName,
        phone,
        gender,
        nationality,
        yearOfStudy,
        course,
        emergencyName,
        emergencyPhone,
        isSmoker,
        dateOfBirth,
        universityId,
        campusId,
        studentType,
        roomPref,
        budgetMin,
        budgetMax,
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
      firstName,
      lastName,
      phone,
      gender,
      nationality,
      yearOfStudy,
      course,
      emergencyName,
      emergencyPhone,
      isSmoker,
      dateOfBirth,
      universityId,
      campusId,
      studentType,
      roomPref,
      budgetMin,
      budgetMax,
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

  const handleDraftStartFresh = useCallback(() => {
    try {
      localStorage.removeItem(STUDENT_PROFILE_DRAFT_KEY)
    } catch {
      /* ignore */
    }
    setShowResumeDraftBanner(false)
    resumeDraftBannerDismissedKeyRef.current = location.key
    if (profile) applyProfileToForm(profile)
    setDraftSavedVisible(false)
    if (draftSavedHideTimerRef.current) {
      window.clearTimeout(draftSavedHideTimerRef.current)
      draftSavedHideTimerRef.current = null
    }
  }, [profile, applyProfileToForm, location.key])

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (!user?.id) return
    const background = opts?.background === true
    setLoadError(null)
    if (!background) setLoading(true)
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
      applyProfileToForm(prof)

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile.'
      setLoadError(msg)
      setProfile(null)
    } finally {
      if (!background) setLoading(false)
    }
  }, [user?.id, applyProfileToForm])

  const refreshProfileData = useCallback(() => load({ background: true }), [load])

  const selectStudentTab = useCallback(
    (tab: StudentTab) => {
      setActiveTab(tab)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (tab === 'profile') p.delete('tab')
          else p.set('tab', tab)
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

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

    const parsed = parseStudentProfileDraft(localStorage.getItem(STUDENT_PROFILE_DRAFT_KEY))
    if (parsed && isStudentProfileDraftMeaningful(parsed)) {
      setFirstName(parsed.firstName)
      setLastName(parsed.lastName)
      setPhone(parsed.phone)
      setGender(parsed.gender)
      setNationality(parsed.nationality)
      setYearOfStudy(parsed.yearOfStudy)
      setCourse(parsed.course)
      setEmergencyName(parsed.emergencyName)
      setEmergencyPhone(parsed.emergencyPhone)
      setIsSmoker(parsed.isSmoker)
      setDateOfBirth(parsed.dateOfBirth)
      setUniversityId(parsed.universityId)
      setCampusId(parsed.campusId)
      setStudentType(parsed.studentType)
      setRoomPref(parsed.roomPref)
      setBudgetMin(parsed.budgetMin)
      setBudgetMax(parsed.budgetMax)
      setBio(parsed.bio)
      setOccupancyType(parsed.occupancyType)
      setMoveInFlex(parsed.moveInFlex)
      setHasPets(parsed.hasPets)
      setNeedsParking(parsed.needsParking)
      setBillsPref(parsed.billsPref)
      setFurnishingPref(parsed.furnishingPref)
      setHasGuarantor(parsed.hasGuarantor)
      setGuarantorName(parsed.guarantorName)
      if (resumeDraftBannerDismissedKeyRef.current !== location.key) {
        setShowResumeDraftBanner(true)
      }
    } else {
      setShowResumeDraftBanner(false)
    }
    setDraftSaveEnabled(true)
  }, [loading, profile?.id, location.key])

  useEffect(() => {
    if (!draftSaveEnabled || loading || !profile) return
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STUDENT_PROFILE_DRAFT_KEY, JSON.stringify(studentProfileDraftSnapshot))
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
  }, [studentProfileDraftSnapshot, draftSaveEnabled, loading, profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'bookings') setActiveTab('bookings')
    else if (tab === 'verification') setActiveTab('verification')
    else setActiveTab('profile')
  }, [searchParams])

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
            property:properties ( id, title, slug, rent_per_week, suburb, images ),
            booking_messages ( id, sender_role, message, created_at, sender_id )
          `,
          )
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (!cancelled) {
          const rows = (data ?? []).map((raw) => {
            const r = raw as BookingWithProperty & { booking_messages?: BookingMessageRow[] | null }
            const msgs = [...(r.booking_messages ?? [])].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )
            return { ...r, booking_messages: msgs }
          })
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

    setUploadingPhoto(true)
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
        .from('student_profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('user_id', user.id)
      if (dbErr) throw dbErr

      await load({ background: true })
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
        const rows = await fetchCampusesForUniversityId(universityId.trim(), slug ?? null, {
          onlyWithActiveListings: false,
        })
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
        })
        .eq('user_id', user.id)

      if (uErr) throw uErr

      try {
        localStorage.removeItem(STUDENT_PROFILE_DRAFT_KEY)
      } catch {
        /* ignore */
      }
      await load({ background: true })
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
      {showResumeDraftBanner && (
        <div
          className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          role="region"
          aria-label="Saved draft"
        >
          <p className="text-gray-700">Resume draft? We restored your last saved profile details.</p>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                resumeDraftBannerDismissedKeyRef.current = location.key
                setShowResumeDraftBanner(false)
              }}
              className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-gray-800"
            >
              Continue editing
            </button>
            <button
              type="button"
              onClick={handleDraftStartFresh}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}
      {draftSavedVisible && activeTab === 'profile' && (
        <p className="text-xs text-gray-400 text-right mb-2 tabular-nums" aria-live="polite">
          Draft saved
        </p>
      )}
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
          onClick={() => selectStudentTab('profile')}
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
          onClick={() => selectStudentTab('verification')}
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
          onClick={() => selectStudentTab('bookings')}
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
        <StudentStripePaymentsCard profile={profile} onRefresh={refreshProfileData} />

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
                  <p className="text-xs text-gray-500 mt-2">Larger photos are resized automatically (max 2 MB).</p>
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
              referenceScope="full"
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

            <div className="rounded-xl border border-gray-100 bg-[#FEF9E4]/40 px-4 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Living preferences</h3>
              <p className="text-xs text-gray-600">
                Optional — helps hosts see if you&apos;re a good fit. You can change these anytime.
              </p>
              <div>
                <label htmlFor="st-bio" className={labelClass}>
                  Short bio
                </label>
                <textarea
                  id="st-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={inputClass}
                  placeholder="A few sentences about you"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="st-occ" className={labelClass}>
                    Occupancy
                  </label>
                  <select
                    id="st-occ"
                    value={occupancyType}
                    onChange={(e) => setOccupancyType(e.target.value)}
                    className={inputClass}
                  >
                    {OCCUPANCY_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="st-mflex" className={labelClass}>
                    Move-in flexibility
                  </label>
                  <select
                    id="st-mflex"
                    value={moveInFlex}
                    onChange={(e) => setMoveInFlex(e.target.value)}
                    className={inputClass}
                  >
                    {MOVE_IN_FLEX_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.checked)}
                    className="rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                  />
                  I have pets
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={needsParking}
                    onChange={(e) => setNeedsParking(e.target.checked)}
                    className="rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                  />
                  I need parking
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="st-bills" className={labelClass}>
                    Bills preference
                  </label>
                  <select
                    id="st-bills"
                    value={billsPref}
                    onChange={(e) => setBillsPref(e.target.value)}
                    className={inputClass}
                  >
                    {BILLS_PREF_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="st-furn" className={labelClass}>
                    Furnishing preference
                  </label>
                  <select
                    id="st-furn"
                    value={furnishingPref}
                    onChange={(e) => setFurnishingPref(e.target.value)}
                    className={inputClass}
                  >
                    {FURNISHING_PREF_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={hasGuarantor}
                    onChange={(e) => setHasGuarantor(e.target.checked)}
                    className="rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
                  />
                  I have a guarantor
                </label>
                {hasGuarantor && (
                  <div className="mt-2">
                    <label htmlFor="st-gname" className={labelClass}>
                      Guarantor name (optional)
                    </label>
                    <input
                      id="st-gname"
                      type="text"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                )}
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

        <div className="mt-6 flex justify-center sm:justify-start">
          <button
            type="button"
            id="toggle-student-danger-zone"
            aria-expanded={dangerZoneVisible}
            aria-controls="student-profile-danger-zone"
            onClick={() => {
              setDangerZoneVisible((prev) => {
                const next = !prev
                if (next) {
                  window.setTimeout(() => {
                    dangerZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }, 0)
                }
                return next
              })
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 rounded px-0.5 -mx-0.5"
          >
            {dangerZoneVisible ? 'Hide account deletion' : 'Delete my account'}
          </button>
        </div>

        {dangerZoneVisible && (
        <section
          ref={dangerZoneRef}
          id="student-profile-danger-zone"
          className="mt-6 bg-white rounded-2xl border border-red-200 shadow-sm p-6 sm:p-8 w-full"
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
        )}

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
          <StudentVerificationPanel profile={profile} userId={user.id} onRefresh={refreshProfileData} />
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
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {b.booking_messages && b.booking_messages.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Messages</p>
                          <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {b.booking_messages.map((m) => (
                              <li
                                key={m.id}
                                className={`rounded-lg px-3 py-2 text-sm ${
                                  m.sender_role === 'landlord' ? 'bg-sky-50 text-gray-800' : 'bg-gray-50 text-gray-800'
                                }`}
                              >
                                <span className="text-xs font-semibold text-gray-500">
                                  {m.sender_role === 'landlord' ? 'Host' : 'You'} ·{' '}
                                  {new Date(m.created_at).toLocaleString('en-AU', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </span>
                                <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {b.status === 'awaiting_info' && (
                        <div className="mt-4 border-t border-gray-100 pt-3">
                          <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor={`reply-${b.id}`}>
                            Your reply
                          </label>
                          <textarea
                            id={`reply-${b.id}`}
                            rows={3}
                            value={bookingReplyById[b.id] ?? ''}
                            onChange={(e) =>
                              setBookingReplyById((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            placeholder="Reply to your host…"
                          />
                          <button
                            type="button"
                            disabled={bookingReplyBusy === b.id || !(bookingReplyById[b.id] ?? '').trim()}
                            onClick={async () => {
                              const text = (bookingReplyById[b.id] ?? '').trim()
                              if (!text || !user?.id) return
                              setBookingReplyBusy(b.id)
                              try {
                                const { data: sess } = await supabase.auth.getSession()
                                const uid = sess.session?.user?.id
                                if (!uid) throw new Error('Sign in required.')
                                const { error: insErr } = await supabase.from('booking_messages').insert({
                                  booking_id: b.id,
                                  sender_id: uid,
                                  sender_role: 'student',
                                  message: text,
                                })
                                if (insErr) throw insErr
                                setBookingReplyById((prev) => ({ ...prev, [b.id]: '' }))
                                const { data: fresh } = await supabase
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
                                    property:properties ( id, title, slug, rent_per_week, suburb, images ),
                                    booking_messages ( id, sender_role, message, created_at, sender_id )
                                  `,
                                  )
                                  .eq('id', b.id)
                                  .maybeSingle()
                                if (fresh) {
                                  const r = fresh as BookingWithProperty & {
                                    booking_messages?: BookingMessageRow[] | null
                                  }
                                  const msgs = [...(r.booking_messages ?? [])].sort(
                                    (a, c) =>
                                      new Date(a.created_at).getTime() - new Date(c.created_at).getTime(),
                                  )
                                  setBookings((prev) =>
                                    prev.map((row) =>
                                      row.id === b.id ? { ...row, booking_messages: msgs, status: r.status } : row,
                                    ),
                                  )
                                }
                              } catch (err) {
                                setBookingsError(err instanceof Error ? err.message : 'Could not send reply.')
                              } finally {
                                setBookingReplyBusy(null)
                              }
                            }}
                            className="mt-2 rounded-lg bg-[#FF6F61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
                          >
                            {bookingReplyBusy === b.id ? 'Sending…' : 'Send reply'}
                          </button>
                        </div>
                      )}
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
