import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type { Database } from '../../lib/database.types'
import { generatePropertySlug } from '../../lib/generatePropertySlug'
import {
  PROPERTY_LISTING_TYPE_LABELS,
  ROOM_TYPE_LABELS,
  isPropertyListingType,
  isRoomType,
  type PropertyListingType,
  type RoomType,
} from '../../lib/listings'
import AIDescriptionGenerator from '../../components/AIDescriptionGenerator'
import AIPricingSuggestionModal from '../../components/AIPricingSuggestionModal'
import AiSparkleIcon from '../../components/AiSparkleIcon'
import UniversityCampusSelect from '../../components/UniversityCampusSelect'
import { useUniversityCampusReference } from '../../hooks/useUniversityCampusReference'
import { campusLatLonFromRow } from '../../lib/universityCampusReference'

/** Checkbox styling — single pattern for every landlord form checkbox. */
const LANDLORD_FORM_CHECKBOX_CLASS =
  'h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[#D85A30] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

const LANDLORD_FORM_NAV_SECTIONS: { id: string; label: string }[] = [
  { id: 'section-basic-info', label: 'Basic info' },
  { id: 'section-property-details', label: 'Property details' },
  { id: 'section-inclusions-features', label: 'Inclusions & features' },
  { id: 'section-house-rules', label: 'House rules' },
  { id: 'section-location', label: 'Location' },
  { id: 'section-pricing-availability', label: 'Pricing & availability' },
  { id: 'section-photos', label: 'Photos' },
]

type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']
type FeatureRow = Database['public']['Tables']['features']['Row']
type HouseRulesRefRow = Database['public']['Tables']['house_rules_ref']['Row']
type RulePermitted = 'yes' | 'no' | 'approval'
type PropertyRow = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

type PropertyWithFeatures = PropertyRow & {
  property_features: { feature_id: string }[] | null
  property_house_rules: { rule_id: string; permitted: string }[] | null
  show_add_another_university?: boolean | null
}

type GeoPoint = { lat: number; lon: number }

type NearbyCampusSuggestion = {
  campusId: string
  universityId: string
  campusLabel: string
  universityLabel: string
  distanceKm: number
}

const LISTING_OPTIONS = [
  { value: 'rent' as const, label: 'Rent' },
  { value: 'homestay' as const, label: 'Homestay' },
  { value: 'student_house' as const, label: 'Student House' },
]

const LEASE_OPTIONS = ['Flexible', '6 months', '12 months', '2 years'] as const

const LANDLORD_PROPERTY_DRAFT_KEY = 'landlord_property_draft' as const
const LANDLORD_PROPERTY_DRAFT_VERSION = 1 as const

/** Persisted new-listing draft — property fields only (no admin landlord id or auth). */
type LandlordPropertyDraftV1 = {
  v: typeof LANDLORD_PROPERTY_DRAFT_VERSION
  title: string
  description: string
  listingType: 'rent' | 'homestay' | 'student_house' | ''
  bedrooms: string
  bathrooms: string
  roomType: RoomType | ''
  propertyListingType: PropertyListingType
  furnished: boolean
  linenSupplied: boolean
  weeklyCleaning: boolean
  openToNonStudents: boolean
  selectedFeatureIds: string[]
  address: string
  suburb: string
  state: string
  postcode: string
  universityId: string
  campusId: string
  latitude: number | null
  longitude: number | null
  showAddAnotherUniversity: boolean
  rentPerWeek: string
  bond: string
  leaseLength: string
  availableFrom: string
  images: string[]
  isRegisteredRoomingHouse: boolean
  roomingHouseRegistrationNumber: string
}

function landlordPropertyDraftFromState(
  s: Omit<LandlordPropertyDraftV1, 'v'>,
): LandlordPropertyDraftV1 {
  return { v: LANDLORD_PROPERTY_DRAFT_VERSION, ...s }
}

function parseDraftListingType(raw: unknown): LandlordPropertyDraftV1['listingType'] {
  if (raw === 'rent' || raw === 'homestay' || raw === 'student_house' || raw === '') return raw
  return 'rent'
}

function parseDraftRoomType(raw: unknown): RoomType | '' {
  if (raw === '') return ''
  if (typeof raw === 'string' && isRoomType(raw)) return raw
  return 'single'
}

function parseDraftLeaseLength(raw: unknown): LandlordPropertyDraftV1['leaseLength'] {
  if (typeof raw === 'string' && (LEASE_OPTIONS as readonly string[]).includes(raw)) return raw
  return 'Flexible'
}

function parseLandlordPropertyDraft(raw: string | null): LandlordPropertyDraftV1 | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Record<string, unknown>
    if (d.v !== LANDLORD_PROPERTY_DRAFT_VERSION) return null

    const propertyListingType: PropertyListingType =
      typeof d.propertyListingType === 'string' && isPropertyListingType(d.propertyListingType)
        ? d.propertyListingType
        : 'entire_property'

    const draft: LandlordPropertyDraftV1 = {
      v: LANDLORD_PROPERTY_DRAFT_VERSION,
      title: typeof d.title === 'string' ? d.title : '',
      description: typeof d.description === 'string' ? d.description : '',
      listingType: parseDraftListingType(d.listingType),
      bedrooms: typeof d.bedrooms === 'string' ? d.bedrooms : '1',
      bathrooms: typeof d.bathrooms === 'string' ? d.bathrooms : '1',
      roomType: parseDraftRoomType(d.roomType),
      propertyListingType,
      furnished: Boolean(d.furnished),
      linenSupplied: Boolean(d.linenSupplied),
      weeklyCleaning: Boolean(d.weeklyCleaning),
      openToNonStudents: Boolean(d.openToNonStudents),
      selectedFeatureIds: Array.isArray(d.selectedFeatureIds)
        ? d.selectedFeatureIds.filter((x): x is string => typeof x === 'string')
        : [],
      address: typeof d.address === 'string' ? d.address : '',
      suburb: typeof d.suburb === 'string' ? d.suburb : '',
      state: typeof d.state === 'string' ? d.state : 'NSW',
      postcode: typeof d.postcode === 'string' ? d.postcode : '',
      universityId: typeof d.universityId === 'string' ? d.universityId : '',
      campusId: typeof d.campusId === 'string' ? d.campusId : '',
      latitude: typeof d.latitude === 'number' && Number.isFinite(d.latitude) ? d.latitude : null,
      longitude: typeof d.longitude === 'number' && Number.isFinite(d.longitude) ? d.longitude : null,
      showAddAnotherUniversity: Boolean(d.showAddAnotherUniversity),
      rentPerWeek: typeof d.rentPerWeek === 'string' ? d.rentPerWeek : '',
      bond: typeof d.bond === 'string' ? d.bond : '',
      leaseLength: parseDraftLeaseLength(d.leaseLength),
      availableFrom: typeof d.availableFrom === 'string' ? d.availableFrom : '',
      images: Array.isArray(d.images) ? d.images.filter((x): x is string => typeof x === 'string') : [],
      isRegisteredRoomingHouse: Boolean(d.isRegisteredRoomingHouse),
      roomingHouseRegistrationNumber:
        typeof d.roomingHouseRegistrationNumber === 'string' ? d.roomingHouseRegistrationNumber : '',
    }
    return draft
  } catch {
    return null
  }
}

function isLandlordPropertyDraftMeaningful(d: LandlordPropertyDraftV1): boolean {
  return (
    d.title.trim() !== '' ||
    d.description.trim() !== '' ||
    d.address.trim() !== '' ||
    d.suburb.trim() !== '' ||
    d.postcode.trim() !== '' ||
    d.rentPerWeek.trim() !== '' ||
    d.bond.trim() !== '' ||
    d.availableFrom.trim() !== '' ||
    d.images.length > 0 ||
    d.selectedFeatureIds.length > 0 ||
    d.universityId.trim() !== '' ||
    d.campusId.trim() !== '' ||
    d.listingType !== 'rent' ||
    d.bedrooms !== '1' ||
    d.bathrooms !== '1' ||
    d.roomType !== 'single' ||
    d.propertyListingType !== 'entire_property' ||
    d.furnished ||
    d.linenSupplied ||
    d.weeklyCleaning ||
    d.openToNonStudents ||
    d.showAddAnotherUniversity
  )
}

const ROOM_ENTRIES = Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][]
const PROPERTY_TYPE_ENTRIES = Object.entries(PROPERTY_LISTING_TYPE_LABELS) as [PropertyListingType, string][]

const MAX_IMAGES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024
const BUCKET = 'property-images'

function pathFromPropertyImageUrl(url: string): string | null {
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

function sectionClass(title: string, children: ReactNode, sectionId?: string) {
  return (
    <section
      id={sectionId}
      className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm scroll-mt-24"
    >
      <div className="bg-[#FF6F61] px-4 py-3 sm:px-6 lg:px-8">
        <h2 className="text-base font-medium text-white">{title}</h2>
      </div>
      <div className="bg-white p-4 sm:p-6 lg:p-8">{children}</div>
    </section>
  )
}

export default function LandlordPropertyFormPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, role } = useAuthContext()

  const propertyId = useMemo(() => {
    const m = matchPath({ path: '/landlord/property/edit/:id', end: true }, location.pathname)
    return m?.params.id ?? null
  }, [location.pathname])
  const isEdit = Boolean(propertyId)

  const landlordProfile = role === 'landlord' && profile ? (profile as LandlordProfileRow) : null

  const { universities: uniRefRows, campuses: campusRefRows, loading: refsLoading } =
    useUniversityCampusReference('full')

  const [pageError, setPageError] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [landlordOptions, setLandlordOptions] = useState<{ id: string; label: string }[]>([])
  const [existingSlug, setExistingSlug] = useState<string | null>(null)

  const [adminLandlordId, setAdminLandlordId] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listingType, setListingType] = useState<'rent' | 'homestay' | 'student_house' | ''>('rent')

  const [bedrooms, setBedrooms] = useState('1')
  const [bathrooms, setBathrooms] = useState('1')
  const [roomType, setRoomType] = useState<RoomType | ''>('single')
  const [propertyListingType, setPropertyListingType] = useState<PropertyListingType>('entire_property')
  const [isRegisteredRoomingHouse, setIsRegisteredRoomingHouse] = useState(false)
  const [roomingHouseRegistrationNumber, setRoomingHouseRegistrationNumber] = useState('')
  const [furnished, setFurnished] = useState(false)
  const [linenSupplied, setLinenSupplied] = useState(false)
  const [weeklyCleaning, setWeeklyCleaning] = useState(false)
  const [openToNonStudents, setOpenToNonStudents] = useState(false)
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set())
  const [houseRulesRef, setHouseRulesRef] = useState<HouseRulesRefRow[]>([])
  const [selectedRules, setSelectedRules] = useState<Partial<Record<string, RulePermitted>>>({})
  const [houseRules, setHouseRules] = useState('')
  const [houseRulesResetAck, setHouseRulesResetAck] = useState(false)
  const [houseRulesResetError, setHouseRulesResetError] = useState<string | null>(null)

  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('NSW')
  const [postcode, setPostcode] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [campusId, setCampusId] = useState('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const [nearbyCampusSuggestions, setNearbyCampusSuggestions] = useState<NearbyCampusSuggestion[]>([])
  const [nearbyCampusLoading, setNearbyCampusLoading] = useState(false)
  const [nearbyCampusError, setNearbyCampusError] = useState<string | null>(null)
  const [nearbyLookupNonce, setNearbyLookupNonce] = useState(0)

  // When a user manually edits the university/campus dropdown while geocoding is in-flight,
  // we don't want the auto-fill to overwrite their selection.
  const manualUniCampusSelectionRef = useRef(false)
  /** True after loading an existing listing that already had university/campus in DB — never auto-fill over those. */
  const skipNearbyAutoFillOverwriteRef = useRef(false)

  const [showAddAnotherUniversity, setShowAddAnotherUniversity] = useState(false)
  const [addAnotherUniversityHelpOpen, setAddAnotherUniversityHelpOpen] = useState(false)
  const addAnotherUniversityHelpRef = useRef<HTMLDivElement>(null)

  const addressDirtyRef = useRef(false)
  /** Normalised address at last edit load — used to detect unchanged address vs DB. */
  const loadedPropertyAddressSigRef = useRef('')
  /**
   * On edit, if the listing had no university/campus in DB, do not auto-fill the nearest match into
   * state on open (that made the form look "saved" while DB stayed null). User picks from the list
   * or changes address; new listings still auto-fill.
   */
  const editDeferNearbyAutoFillRef = useRef(false)
  const lastNearbySigRef = useRef<string>('')
  const geoCacheRef = useRef<Map<string, GeoPoint | null>>(new Map())
  const geoCacheLoadedRef = useRef(false)
  const nearbyRequestIdRef = useRef(0)
  const editModeGeocodeFiredRef = useRef(false)
  const universityIdRef = useRef<string>(universityId)
  const campusIdRef = useRef<string>(campusId)

  const [rentPerWeek, setRentPerWeek] = useState('')
  const [pricingSuggestionOpen, setPricingSuggestionOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('section-basic-info')
  const weeklyRentNum = useMemo(() => {
    const t = rentPerWeek.trim()
    if (!t) return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }, [rentPerWeek])

  const nearbyUniversitiesForAi = useMemo(() => {
    const u = uniRefRows.find((x) => x.id === universityId)
    return u?.name ? [u.name] : []
  }, [universityId, uniRefRows])

  const amenitiesForAi = useMemo(
    () => features.filter((f) => selectedFeatureIds.has(f.id)).map((f) => f.name),
    [features, selectedFeatureIds],
  )

  const [bond, setBond] = useState('')
  const [leaseLength, setLeaseLength] = useState<string>('Flexible')
  const [availableFrom, setAvailableFrom] = useState('')

  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  const landlordPropertyDraftSnapshot = useMemo(
    () =>
      landlordPropertyDraftFromState({
        title,
        description,
        listingType,
        bedrooms,
        bathrooms,
        roomType,
        propertyListingType,
        furnished,
        linenSupplied,
        weeklyCleaning,
        openToNonStudents,
        selectedFeatureIds: [...selectedFeatureIds],
        address,
        suburb,
        state,
        postcode,
        universityId,
        campusId,
        latitude,
        longitude,
        showAddAnotherUniversity,
        rentPerWeek,
        bond,
        leaseLength,
        availableFrom,
        images,
        isRegisteredRoomingHouse,
        roomingHouseRegistrationNumber,
      }),
    [
      title,
      description,
      listingType,
      bedrooms,
      bathrooms,
      roomType,
      propertyListingType,
      isRegisteredRoomingHouse,
      roomingHouseRegistrationNumber,
      furnished,
      linenSupplied,
      weeklyCleaning,
      openToNonStudents,
      selectedFeatureIds,
      address,
      suburb,
      state,
      postcode,
      universityId,
      campusId,
      latitude,
      longitude,
      showAddAnotherUniversity,
      rentPerWeek,
      bond,
      leaseLength,
      availableFrom,
      images,
    ],
  )

  const restoredLocationKeyRef = useRef<string | null>(null)
  /** When set to `location.key`, do not show the resume banner again after re-fetch/re-load on the same navigation. */
  const resumeDraftBannerDismissedKeyRef = useRef<string | null>(null)
  const draftSavedHideTimerRef = useRef<number | null>(null)
  const [draftSaveEnabled, setDraftSaveEnabled] = useState(false)
  const [showResumeDraftBanner, setShowResumeDraftBanner] = useState(false)
  const [draftSavedVisible, setDraftSavedVisible] = useState(false)

  const toggleFeature = useCallback((id: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setRulePermitted = useCallback((ruleId: string, raw: string) => {
    setSelectedRules((prev) => {
      const next: Partial<Record<string, RulePermitted>> = { ...prev }
      if (raw === '') {
        delete next[ruleId]
      } else if (raw === 'yes' || raw === 'no' || raw === 'approval') {
        next[ruleId] = raw
      }
      return next
    })
  }, [])

  const applyNearbySuggestion = useCallback((s: NearbyCampusSuggestion) => {
    editDeferNearbyAutoFillRef.current = false
    manualUniCampusSelectionRef.current = true
    universityIdRef.current = s.universityId
    campusIdRef.current = s.campusId
    setUniversityId(s.universityId)
    setCampusId(s.campusId)
  }, [])

  const handleDraftStartFresh = useCallback(() => {
    try {
      localStorage.removeItem(LANDLORD_PROPERTY_DRAFT_KEY)
    } catch {
      /* ignore */
    }
    setShowResumeDraftBanner(false)
    resumeDraftBannerDismissedKeyRef.current = location.key
    setTitle('')
    setDescription('')
    setListingType('rent')
    setBedrooms('1')
    setBathrooms('1')
    setRoomType('single')
    setPropertyListingType('entire_property')
    setIsRegisteredRoomingHouse(false)
    setRoomingHouseRegistrationNumber('')
    setFurnished(false)
    setLinenSupplied(false)
    setWeeklyCleaning(false)
    setOpenToNonStudents(false)
    setSelectedFeatureIds(new Set())
    setSelectedRules({})
    setHouseRules('')
    setHouseRulesResetError(null)
    setHouseRulesResetAck(false)
    setAddress('')
    setSuburb('')
    setState('NSW')
    setPostcode('')
    setLatitude(null)
    setLongitude(null)
    universityIdRef.current = ''
    campusIdRef.current = ''
    setUniversityId('')
    setCampusId('')
    manualUniCampusSelectionRef.current = false
    skipNearbyAutoFillOverwriteRef.current = false
    editDeferNearbyAutoFillRef.current = false
    loadedPropertyAddressSigRef.current = ''
    addressDirtyRef.current = false
    lastNearbySigRef.current = ''
    setNearbyCampusSuggestions([])
    setNearbyCampusError(null)
    setShowAddAnotherUniversity(false)
    setRentPerWeek('')
    setBond('')
    setLeaseLength('Flexible')
    setAvailableFrom('')
    setImages([])
    setAdminLandlordId('')
    setDraftSavedVisible(false)
    if (draftSavedHideTimerRef.current) {
      window.clearTimeout(draftSavedHideTimerRef.current)
      draftSavedHideTimerRef.current = null
    }
  }, [location.key])

  const loadPage = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) {
      setLoadingPage(false)
      return
    }
    setPageError(null)
    setLoadingPage(true)
    try {
      const { data: featData, error: featErr } = await supabase
        .from('features')
        .select('id, name, icon')
        .order('name')
      if (featErr) throw featErr
      setFeatures((featData ?? []) as FeatureRow[])

      const { data: hrData, error: hrErr } = await supabase
        .from('house_rules_ref')
        .select('id, name, icon, sort_order')
        .order('sort_order')
      if (hrErr) throw hrErr
      setHouseRulesRef((hrData ?? []) as HouseRulesRefRow[])

      if (!isEdit || !propertyId) {
        skipNearbyAutoFillOverwriteRef.current = false
        manualUniCampusSelectionRef.current = false
        editDeferNearbyAutoFillRef.current = false
        editModeGeocodeFiredRef.current = false
        loadedPropertyAddressSigRef.current = ''
        setShowAddAnotherUniversity(false)
        // If the user navigated here from an edit route without unmounting,
        // ensure we don't carry over stale university/campus selections.
        setUniversityId('')
        setCampusId('')
        universityIdRef.current = ''
        campusIdRef.current = ''
        setSelectedRules({})
        setHouseRules('')
        setHouseRulesResetError(null)
        setHouseRulesResetAck(false)
      }

      if (role === 'admin') {
        const { data: ll, error: llErr } = await supabase
          .from('landlord_profiles')
          .select('id, full_name, email, first_name, last_name')
          .order('full_name')
        if (llErr) throw llErr
        const opts =
          (ll ?? []).map((r) => {
            const row = r as Pick<
              LandlordProfileRow,
              'id' | 'full_name' | 'email' | 'first_name' | 'last_name'
            >
            const name =
              [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
              row.full_name?.trim() ||
              row.email ||
              row.id
            return { id: row.id, label: name }
          }) ?? []
        setLandlordOptions(opts)
      }

      if (isEdit && propertyId && role === 'landlord' && !landlordProfile) {
        setLoadingPage(false)
        return
      }

      if (isEdit && propertyId) {
        const { data: propRaw, error: pErr } = await supabase
          .from('properties')
          .select(`*, property_features ( feature_id ), property_house_rules ( rule_id, permitted )`)
          .eq('id', propertyId)
          .single()
        if (pErr) throw pErr
        const prop = propRaw as PropertyWithFeatures

        const canEdit =
          role === 'admin' ||
          (landlordProfile && prop.landlord_id === landlordProfile.id)
        if (!canEdit) {
          setPageError('You do not have permission to edit this listing.')
          setLoadingPage(false)
          return
        }

        setExistingSlug(prop.slug)
        setTitle(prop.title)
        setDescription(prop.description ?? '')
        setListingType(prop.listing_type ?? 'rent')
        setBedrooms(prop.bedrooms != null ? String(prop.bedrooms) : '1')
        setBathrooms(prop.bathrooms != null ? String(prop.bathrooms) : '1')
        setRoomType(prop.room_type ?? 'single')
        setPropertyListingType(
          prop.property_type && isPropertyListingType(prop.property_type) ? prop.property_type : 'entire_property',
        )
        setIsRegisteredRoomingHouse(Boolean(prop.is_registered_rooming_house))
        setRoomingHouseRegistrationNumber(
          typeof prop.rooming_house_registration_number === 'string' ? prop.rooming_house_registration_number : '',
        )
        setFurnished(Boolean(prop.furnished))
        setLinenSupplied(Boolean(prop.linen_supplied))
        setWeeklyCleaning(Boolean(prop.weekly_cleaning_service))
        setOpenToNonStudents(Boolean(prop.open_to_non_students))
        setAddress(prop.address ?? '')
        setSuburb(prop.suburb ?? '')
        setState(prop.state ?? 'NSW')
        setPostcode(prop.postcode ?? '')
        setLatitude(prop.latitude ?? null)
        setLongitude(prop.longitude ?? null)
        setUniversityId(prop.university_id ?? '')
        setCampusId(prop.campus_id ?? '')
        universityIdRef.current = prop.university_id ?? ''
        campusIdRef.current = prop.campus_id ?? ''
        manualUniCampusSelectionRef.current = Boolean(prop.university_id || prop.campus_id)
        skipNearbyAutoFillOverwriteRef.current = Boolean(prop.university_id || prop.campus_id)
        // Persisted explicit user preference (default false for older rows / new listings).
        setShowAddAnotherUniversity(Boolean(prop.show_add_another_university ?? false))
        loadedPropertyAddressSigRef.current = [
          prop.address ?? '',
          prop.suburb ?? '',
          prop.state ?? 'NSW',
          prop.postcode ?? '',
        ]
          .map((x) => x.trim())
          .join('|')
          .toLowerCase()
        editDeferNearbyAutoFillRef.current = !prop.university_id && !prop.campus_id
        setRentPerWeek(String(prop.rent_per_week ?? ''))
        setBond(prop.bond != null ? String(prop.bond) : '')
        setLeaseLength(prop.lease_length ?? 'Flexible')
        setAvailableFrom(prop.available_from ? prop.available_from.slice(0, 10) : '')
        setImages(Array.isArray(prop.images) ? [...prop.images] : [])
        const pf = prop.property_features
        setSelectedFeatureIds(new Set((pf ?? []).map((x) => x.feature_id)))
        const phr = prop.property_house_rules
        const nextRules: Partial<Record<string, RulePermitted>> = {}
        for (const row of phr ?? []) {
          const p = row.permitted
          if (p === 'yes' || p === 'no' || p === 'approval') nextRules[row.rule_id] = p
        }
        setSelectedRules(nextRules)
        setHouseRules(typeof prop.house_rules === 'string' ? prop.house_rules : '')
      }
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Could not load form.')
    } finally {
      setLoadingPage(false)
    }
  }, [user?.id, isEdit, propertyId, role, landlordProfile?.id])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    if (!houseRulesResetAck) return
    const t = window.setTimeout(() => setHouseRulesResetAck(false), 3000)
    return () => window.clearTimeout(t)
  }, [houseRulesResetAck])

  useEffect(() => {
    return () => {
      if (draftSavedHideTimerRef.current) {
        window.clearTimeout(draftSavedHideTimerRef.current)
        draftSavedHideTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isEdit || !loadingPage) return
    restoredLocationKeyRef.current = null
  }, [isEdit, loadingPage])

  useEffect(() => {
    if (isEdit) {
      setDraftSaveEnabled(false)
      setShowResumeDraftBanner(false)
      return
    }
    if (loadingPage) {
      setDraftSaveEnabled(false)
      return
    }

    if (restoredLocationKeyRef.current === location.key) {
      setDraftSaveEnabled(true)
      return
    }
    restoredLocationKeyRef.current = location.key

    const parsed = parseLandlordPropertyDraft(localStorage.getItem(LANDLORD_PROPERTY_DRAFT_KEY))
    if (parsed && isLandlordPropertyDraftMeaningful(parsed)) {
      const valid = new Set(features.map((f) => f.id))
      const featureIds = parsed.selectedFeatureIds.filter((id) => valid.has(id))

      setTitle(parsed.title)
      setDescription(parsed.description)
      setListingType(parsed.listingType)
      setBedrooms(parsed.bedrooms)
      setBathrooms(parsed.bathrooms)
      setRoomType(parsed.roomType)
      setPropertyListingType(parsed.propertyListingType)
      setIsRegisteredRoomingHouse(parsed.isRegisteredRoomingHouse)
      setRoomingHouseRegistrationNumber(parsed.roomingHouseRegistrationNumber)
      setFurnished(parsed.furnished)
      setLinenSupplied(parsed.linenSupplied)
      setWeeklyCleaning(parsed.weeklyCleaning)
      setOpenToNonStudents(parsed.openToNonStudents)
      setSelectedFeatureIds(new Set(featureIds))
      setAddress(parsed.address)
      setSuburb(parsed.suburb)
      setState(parsed.state)
      setPostcode(parsed.postcode)
      setLatitude(parsed.latitude)
      setLongitude(parsed.longitude)
      universityIdRef.current = parsed.universityId
      campusIdRef.current = parsed.campusId
      setUniversityId(parsed.universityId)
      setCampusId(parsed.campusId)
      const hasUni = Boolean(parsed.universityId.trim() || parsed.campusId.trim())
      manualUniCampusSelectionRef.current = hasUni
      skipNearbyAutoFillOverwriteRef.current = hasUni
      setShowAddAnotherUniversity(parsed.showAddAnotherUniversity)
      setRentPerWeek(parsed.rentPerWeek)
      setBond(parsed.bond)
      setLeaseLength(parsed.leaseLength)
      setAvailableFrom(parsed.availableFrom)
      setImages([...parsed.images])

      const addrDirty =
        Boolean(parsed.address.trim()) ||
        Boolean(parsed.suburb.trim()) ||
        Boolean(parsed.postcode.trim()) ||
        parsed.state.trim().toUpperCase() !== 'NSW'
      addressDirtyRef.current = addrDirty
      lastNearbySigRef.current = ''
      if (addrDirty) {
        setNearbyLookupNonce((n) => n + 1)
      }

      if (resumeDraftBannerDismissedKeyRef.current !== location.key) {
        setShowResumeDraftBanner(true)
      }
    } else {
      setShowResumeDraftBanner(false)
    }
    setDraftSaveEnabled(true)
  }, [isEdit, loadingPage, location.key, features])

  useEffect(() => {
    if (isEdit || !draftSaveEnabled || loadingPage) return
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(LANDLORD_PROPERTY_DRAFT_KEY, JSON.stringify(landlordPropertyDraftSnapshot))
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
  }, [landlordPropertyDraftSnapshot, isEdit, draftSaveEnabled, loadingPage])

  useEffect(() => {
    if (!isEdit || loadingPage) return
    if (editModeGeocodeFiredRef.current) return
    const addr = address.trim()
    const sub = suburb.trim()
    const st = state.trim()
    const pc = postcode.trim()
    if (!addr || !sub || !st || !pc) return
    const t = window.setTimeout(() => {
      if (editModeGeocodeFiredRef.current) return
      editModeGeocodeFiredRef.current = true
      addressDirtyRef.current = true
      lastNearbySigRef.current = ''
      setNearbyLookupNonce((n) => n + 1)
    }, 500)
    return () => window.clearTimeout(t)
  }, [isEdit, loadingPage, address, suburb, state, postcode])

  useEffect(() => {
    if (!addAnotherUniversityHelpOpen) return
    const close = (e: MouseEvent) => {
      if (addAnotherUniversityHelpRef.current && !addAnotherUniversityHelpRef.current.contains(e.target as Node)) {
        setAddAnotherUniversityHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [addAnotherUniversityHelpOpen])

  useEffect(() => {
    const root = document.documentElement
    const prev = root.style.scrollBehavior
    root.style.scrollBehavior = 'smooth'
    return () => {
      root.style.scrollBehavior = prev
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || loadingPage || pageError) return
    if (role === 'landlord' && !landlordProfile) return

    const sections = document.querySelectorAll<HTMLElement>('section[id^="section-"]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [isSupabaseConfigured, loadingPage, pageError, role, landlordProfile])

  // Keep a small local cache so we don't repeatedly geocode the same suburb/address.
  // (Also helps Nominatim rate limits while the user types.)
  useEffect(() => {
    if (geoCacheLoadedRef.current) return
    geoCacheLoadedRef.current = true
    const GEO_CACHE_LS_KEY = 'quni_geo_cache_v1'
    const GEO_CACHE_LS_TTL_MS = 1000 * 60 * 60 * 24 * 30
    try {
      const raw = localStorage.getItem(GEO_CACHE_LS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, { lat?: number; lon?: number; ts: number }>
      const now = Date.now()
      for (const [k, v] of Object.entries(parsed ?? {})) {
        if (!v || typeof v.lat !== 'number' || typeof v.lon !== 'number' || typeof v.ts !== 'number') continue
        if (now - v.ts > GEO_CACHE_LS_TTL_MS) continue
        geoCacheRef.current.set(k, { lat: v.lat, lon: v.lon })
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    universityIdRef.current = universityId
  }, [universityId])

  useEffect(() => {
    campusIdRef.current = campusId
  }, [campusId])

  function haversineKm(a: GeoPoint, b: GeoPoint): number {
    const R = 6371 // Earth radius km
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lon - a.lon)
    const sLat1 = toRad(a.lat)
    const sLat2 = toRad(b.lat)
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(sLat1) * Math.cos(sLat2)
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    return R * c
  }

  async function geocodeCached(query: string, signal?: AbortSignal): Promise<GeoPoint | null> {
    const GEO_CACHE_LS_KEY = 'quni_geo_cache_v1'
    const GEO_CACHE_LS_TTL_MS = 1000 * 60 * 60 * 24 * 30

    const norm = query.trim().toLowerCase()
    if (!norm) return null

    const known = geoCacheRef.current.get(norm)
    if (known !== undefined) return known

    let lat: number | null = null
    let lon: number | null = null
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal })
      const body = await res.json().catch(() => null)
      if (res.ok && body?.ok === true && typeof body.lat === 'number' && typeof body.lon === 'number') {
        lat = body.lat
        lon = body.lon
      }
    } catch {
      // ignore network errors; treat as cache miss
    }

    const pt = lat != null && lon != null ? { lat, lon } : null
    geoCacheRef.current.set(norm, pt)

    try {
      const raw = localStorage.getItem(GEO_CACHE_LS_KEY)
      const parsed = raw
        ? (JSON.parse(raw) as Record<string, { lat?: number; lon?: number; ts: number }>)
        : {}
      parsed[norm] = pt ? { lat: pt.lat, lon: pt.lon, ts: Date.now() } : { ts: Date.now() }
      localStorage.setItem(GEO_CACHE_LS_KEY, JSON.stringify(parsed))
      // Soft TTL cleanup (avoid unbounded growth)
      const cutoff = Date.now() - GEO_CACHE_LS_TTL_MS
      for (const [k, v] of Object.entries(parsed)) {
        if (!v || typeof v.ts !== 'number' || v.ts < cutoff) delete parsed[k]
      }
      localStorage.setItem(GEO_CACHE_LS_KEY, JSON.stringify(parsed))
    } catch {
      /* ignore */
    }

    return pt
  }

  useEffect(() => {
    const campusCount = campusRefRows.length
    const uniCount = uniRefRows.length
    if (!addressDirtyRef.current) return
    if (refsLoading) return
    if (campusCount === 0 || uniCount === 0) return

    const addr = address.trim()
    const sub = suburb.trim()
    const st = state.trim()
    const pc = postcode.trim()
    const allAddressFieldsFilled = Boolean(addr && sub && st && pc)

    if (!allAddressFieldsFilled) {
      nearbyRequestIdRef.current += 1
      setNearbyCampusLoading(false)
      setNearbyCampusSuggestions([])
      setNearbyCampusError(null)
      lastNearbySigRef.current = ''
      return
    }

    const sig = [addr, sub, st, pc].join('|').toLowerCase()
    if (sig.length < 6) return
    if (sig === lastNearbySigRef.current) return

    const timeout = window.setTimeout(() => {
      const requestId = ++nearbyRequestIdRef.current
      lastNearbySigRef.current = sig
      void (async () => {
        setNearbyCampusLoading(true)
        setNearbyCampusError(null)
        setNearbyCampusSuggestions([])

        const fullAddressQuery = [addr, sub, st, pc, 'Australia'].join(', ')

        const ac = new AbortController()
        try {
          const propertyPoint = await geocodeCached(fullAddressQuery, ac.signal)
          if (!propertyPoint) {
            setNearbyCampusError('We could not find your address. Please check it and try again.')
            setNearbyCampusLoading(false)
            return
          }

          // Keep lat/lng in sync for saving (and for future map/SEO features).
          setLatitude(propertyPoint.lat)
          setLongitude(propertyPoint.lon)

          const stateNorm = state.trim().toUpperCase()
          const candidates = campusRefRows.filter((c) => {
            const cSub = c.suburb?.trim() ?? ''
            const cUni = c.university_id ?? ''
            const cState = c.state?.trim().toUpperCase() ?? ''
            if (!cSub || !cUni) return false
            if (!stateNorm) return true
            return cState === stateNorm
          })

          // Fallback if the state match was too strict.
          const effectiveCandidates = candidates.length > 0 ? candidates : campusRefRows.filter((c) => (c.suburb?.trim() ?? '') !== '' && c.university_id != null)

          if (effectiveCandidates.length === 0) {
            setNearbyCampusError('No campus reference data found to compare against.')
            setNearbyCampusLoading(false)
            return
          }

          const uniById = new Map<string, string>(uniRefRows.map((u) => [u.id, u.name]))

          const campusPointById = new Map<string, GeoPoint>()
          const campusGeoQueryById = new Map<string, string>()
          for (const c of effectiveCandidates) {
            const fromDb = campusLatLonFromRow(c)
            if (fromDb) {
              campusPointById.set(c.id, fromDb)
            } else {
              const cState = (c.state ?? stateNorm).trim()
              const q = `${c.name}, ${c.suburb}, ${cState}, Australia`.replace(/\s+/g, ' ').trim()
              campusGeoQueryById.set(c.id, q)
            }
          }

          const uniqueGeoQueries = [...new Set([...campusGeoQueryById.values()])].slice(0, 30)
          const coordsByQuery = new Map<string, GeoPoint>()

          for (const q of uniqueGeoQueries) {
            if (requestId !== nearbyRequestIdRef.current) return
            const pt = await geocodeCached(q, ac.signal)
            if (pt) coordsByQuery.set(q, pt)
            // Light pacing to reduce rate limit risk.
            await new Promise((r) => window.setTimeout(r, 150))
          }

          const suggestions: NearbyCampusSuggestion[] = []
          for (const c of effectiveCandidates) {
            if (requestId !== nearbyRequestIdRef.current) return
            const pt =
              campusPointById.get(c.id) ??
              (() => {
                const q = campusGeoQueryById.get(c.id)
                return q ? coordsByQuery.get(q) : undefined
              })()
            if (!pt) continue
            const uName = c.university_id ? uniById.get(c.university_id) ?? '' : ''
            if (!c.university_id) continue
            const distKm = haversineKm(propertyPoint, pt)
            suggestions.push({
              campusId: c.id,
              universityId: c.university_id,
              campusLabel: c.suburb?.trim() ? `${c.name} (${c.suburb})` : c.name,
              universityLabel: uName || c.university_id,
              distanceKm: distKm,
            })
          }

          suggestions.sort((a, b) => a.distanceKm - b.distanceKm)
          // Show a handful of nearby options so landlords can pick from a shortlist.
          // The closest one is auto-filled if the landlord hasn't selected anything yet.
          const top = suggestions.slice(0, 5)

          if (top.length === 0) {
            setNearbyCampusError('Could not determine nearby campuses from your address.')
            setNearbyCampusLoading(false)
            return
          }

          setNearbyCampusSuggestions(top)
          setNearbyCampusLoading(false)

          if (
            isEdit &&
            editDeferNearbyAutoFillRef.current &&
            loadedPropertyAddressSigRef.current !== '' &&
            sig !== loadedPropertyAddressSigRef.current
          ) {
            editDeferNearbyAutoFillRef.current = false
          }

          const addressUnchangedFromLoaded =
            isEdit &&
            loadedPropertyAddressSigRef.current !== '' &&
            sig === loadedPropertyAddressSigRef.current

          const deferAutoApplyNearby =
            isEdit && editDeferNearbyAutoFillRef.current && addressUnchangedFromLoaded

          // Auto-select for new listings (and edits after address change / once defer cleared), unless we
          // must preserve DB-loaded values or the user already chose something.
          if (
            !deferAutoApplyNearby &&
            !skipNearbyAutoFillOverwriteRef.current &&
            !manualUniCampusSelectionRef.current &&
            !universityIdRef.current.trim() &&
            !campusIdRef.current.trim()
          ) {
            setUniversityId(top[0].universityId)
            setCampusId(top[0].campusId)
            universityIdRef.current = top[0].universityId
            campusIdRef.current = top[0].campusId
          }
        } finally {
          ac.abort()
        }
      })()
    }, 800)

    return () => window.clearTimeout(timeout)
  }, [address, postcode, suburb, state, campusRefRows, uniRefRows, refsLoading, isEdit, nearbyLookupNonce])

  const removeImage = useCallback(
    async (url: string) => {
      setImages((prev) => prev.filter((u) => u !== url))
      if (user?.id) {
        const path = pathFromPropertyImageUrl(url)
        if (path && path.startsWith(`${user.id}/`)) {
          await supabase.storage.from(BUCKET).remove([path])
        }
      }
    },
    [user?.id],
  )

  const onPickImages = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !user?.id) return
      setUploadingImage(true)
      setSubmitError(null)
      try {
        const next = [...images]
        for (let i = 0; i < files.length; i++) {
          if (next.length >= MAX_IMAGES) break
          const file = files[i]
          if (file.size > MAX_FILE_BYTES) {
            setSubmitError(`Each image must be at most 5MB (${file.name} is too large).`)
            continue
          }
          if (!file.type.startsWith('image/')) continue
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg'
          const objectPath = `${user.id}/${crypto.randomUUID()}.${safeExt}`
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
            cacheControl: '3600',
            upsert: false,
          })
          if (upErr) throw upErr
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
          next.push(pub.publicUrl)
        }
        setImages(next)
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Upload failed.')
      } finally {
        setUploadingImage(false)
      }
    },
    [user?.id, images],
  )

  async function savePropertyFeatures(pid: string, ids: string[]) {
    const { error: delErr } = await supabase.from('property_features').delete().eq('property_id', pid)
    if (delErr) throw delErr
    if (ids.length === 0) return
    const { error: insErr } = await supabase
      .from('property_features')
      .insert(ids.map((feature_id) => ({ property_id: pid, feature_id })))
    if (insErr) throw insErr
  }

  async function savePropertyHouseRules(pid: string, rules: Partial<Record<string, RulePermitted>>) {
    const { error: delErr } = await supabase.from('property_house_rules').delete().eq('property_id', pid)
    if (delErr) throw delErr
    const rows = Object.entries(rules).filter(
      (e): e is [string, RulePermitted] => e[1] === 'yes' || e[1] === 'no' || e[1] === 'approval',
    )
    if (rows.length === 0) return
    const { error: insErr } = await supabase.from('property_house_rules').insert(
      rows.map(([rule_id, permitted]) => ({ property_id: pid, rule_id, permitted })),
    )
    if (insErr) throw insErr
  }

  async function resetHouseRulesToPlatformDefault() {
    setHouseRulesResetError(null)
    const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (sessErr || !token) {
      setHouseRulesResetError('Could not load default. Please try again.')
      return
    }
    try {
      const res = await fetch('/api/platform/house-rules-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      })
      const body = (await res.json().catch(() => null)) as { default?: unknown } | null
      if (!res.ok || typeof body?.default !== 'string') {
        setHouseRulesResetError('Could not load default. Please try again.')
        return
      }
      setHouseRules(body.default)
      setHouseRulesResetAck(true)
    } catch {
      setHouseRulesResetError('Could not load default. Please try again.')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!user?.id) return
    // If the nearby-campus lookup overlay is up, it can intercept clicks and make the
    // submit button feel unresponsive. Always close it on submit.
    setNearbyCampusLoading(false)

    const t = title.trim()
    if (!t) {
      setSubmitError('Title is required.')
      return
    }
    const rent = Number(rentPerWeek)
    if (!Number.isFinite(rent) || rent <= 0) {
      setSubmitError('Rent per week must be a positive number.')
      return
    }

    let landlordId: string | null = landlordProfile?.id ?? null
    if (role === 'admin') {
      if (isEdit && propertyId) {
        const { data: existing } = await supabase.from('properties').select('landlord_id').eq('id', propertyId).single()
        landlordId = (existing as { landlord_id: string | null } | null)?.landlord_id ?? null
      } else {
        landlordId = adminLandlordId.trim() || null
        if (!landlordId) {
          setSubmitError('Select a landlord for this listing.')
          return
        }
      }
    }

    if (!landlordId) {
      setSubmitError('Landlord profile is missing. Complete landlord onboarding first.')
      return
    }

    const featureIds = [...selectedFeatureIds]

    const topSuggest = nearbyCampusSuggestions[0]
    const uniFromForm = universityId.trim()
    const campusFromForm = campusId.trim()

    // If "Add another university" is OFF, we treat the nearby suggestions as the source of truth
    // and ignore whatever is currently in the dropdown (it may be stale from earlier auto-fill).
    // If the checkbox is ON, we persist the explicit dropdown selection (or nulls).
    const resolvedUniversityId = showAddAnotherUniversity ? (uniFromForm || null) : topSuggest?.universityId?.trim() || null
    const resolvedCampusId = showAddAnotherUniversity ? (campusFromForm || null) : topSuggest?.campusId?.trim() || null

    // Ensure coordinates are persisted on every save/publish.
    // Nearby-campus lookup usually sets these, but we also geocode here as a fallback so
    // listings always have latitude/longitude when address fields are present.
    const addr = address.trim()
    const sub = suburb.trim()
    const st = state.trim()
    const pc = postcode.trim()
    const canGeocode = Boolean(addr && sub && st && pc)
    let resolvedLat = latitude
    let resolvedLon = longitude
    if (canGeocode && (resolvedLat == null || resolvedLon == null)) {
      const fullAddressQuery = [addr, sub, st, pc, 'Australia'].join(', ')
      const pt = await geocodeCached(fullAddressQuery)
      if (pt) {
        resolvedLat = pt.lat
        resolvedLon = pt.lon
        setLatitude(pt.lat)
        setLongitude(pt.lon)
      }
    }

    const baseFields: PropertyUpdate & { show_add_another_university?: boolean } = {
      title: t,
      description: description.trim() || null,
      listing_type: listingType || null,
      bedrooms: Math.max(0, parseInt(bedrooms, 10) || 0),
      bathrooms: Math.max(0, parseInt(bathrooms, 10) || 0),
      room_type: roomType || null,
      property_type: propertyListingType,
      furnished,
      linen_supplied: linenSupplied,
      weekly_cleaning_service: weeklyCleaning,
      address: address.trim() || null,
      suburb: suburb.trim() || null,
      state: state.trim() || 'NSW',
      postcode: postcode.trim() || null,
      latitude: resolvedLat ?? null,
      longitude: resolvedLon ?? null,
      university_id: resolvedUniversityId,
      campus_id: resolvedCampusId,
      show_add_another_university: showAddAnotherUniversity,
      open_to_non_students: openToNonStudents,
      is_registered_rooming_house: isRegisteredRoomingHouse,
      rooming_house_registration_number:
        isRegisteredRoomingHouse && roomingHouseRegistrationNumber.trim()
          ? roomingHouseRegistrationNumber.trim()
          : null,
      rent_per_week: rent,
      bond: bond.trim() ? Number(bond) : null,
      lease_length: leaseLength || null,
      available_from: availableFrom.trim() || null,
      images: images.length ? images : null,
      house_rules: houseRules.trim() || null,
    }

    setSubmitting(true)
    try {
      if (isEdit && propertyId) {
        const { data: updatedRow, error: upErr } = await supabase
          .from('properties')
          .update(baseFields)
          .eq('id', propertyId)
          .select('university_id, campus_id')
          .single()
        if (upErr) throw upErr
        const uRow = updatedRow as { university_id: string | null; campus_id: string | null } | null
        if (
          uRow &&
          (uRow.university_id !== resolvedUniversityId || uRow.campus_id !== resolvedCampusId)
        ) {
          console.warn('University/campus IDs did not persist as expected (update)', {
            resolvedUniversityId,
            resolvedCampusId,
            updatedUniversityId: uRow.university_id,
            updatedCampusId: uRow.campus_id,
            showAddAnotherUniversity,
          })
        }
        await savePropertyFeatures(propertyId, featureIds)
        await savePropertyHouseRules(propertyId, selectedRules)
        const slug = existingSlug ?? generatePropertySlug(t)
        navigate(`/properties/${slug}`, { replace: true })
      } else {
        const slug = generatePropertySlug(t)
        const { data: inserted, error: insErr } = await supabase
          .from('properties')
          .insert({
            ...baseFields,
            title: t,
            slug,
            landlord_id: landlordId,
            status: 'active',
            featured: false,
          } as PropertyInsert & { show_add_another_university?: boolean })
          .select('id, university_id, campus_id')
          .single()
        if (insErr) throw insErr
        const insertedRow = inserted as { id: string; university_id: string | null; campus_id: string | null }
        const newId = insertedRow.id
        if (insertedRow.university_id !== resolvedUniversityId || insertedRow.campus_id !== resolvedCampusId) {
          console.warn('University/campus IDs did not persist as expected', {
            resolvedUniversityId,
            resolvedCampusId,
            insertedUniversityId: insertedRow.university_id,
            insertedCampusId: insertedRow.campus_id,
          })
        }
        await savePropertyFeatures(newId, featureIds)
        await savePropertyHouseRules(newId, selectedRules)
        try {
          localStorage.removeItem(LANDLORD_PROPERTY_DRAFT_KEY)
        } catch {
          /* ignore */
        }
        navigate('/landlord-dashboard', { replace: true })
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-sm text-gray-600">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loadingPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <p className="text-red-700 text-sm">{pageError}</p>
        <Link to="/landlord-dashboard" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (role === 'landlord' && !landlordProfile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-sm text-gray-600">
        <Link to="/landlord-profile" className="text-indigo-600 font-medium">
          Complete your landlord profile
        </Link>{' '}
        before creating a listing.
      </div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-clip bg-[#d4e9e2] pb-16">
      <div className="mx-auto w-full min-w-0 max-w-[1200px] px-6 py-8">
        <div className="mb-8">
          <Link
            to="/landlord-dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
          >
            ← Landlord dashboard
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isEdit ? 'Edit listing' : 'New listing'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isEdit ? 'Update your property details and photos.' : 'Create a new property on Quni.'}
              </p>
            </div>
            {!isEdit && draftSavedVisible && (
              <p className="text-xs text-gray-400 shrink-0 mt-1 tabular-nums" aria-live="polite">
                Draft saved
              </p>
            )}
          </div>
        </div>

        {!isEdit && showResumeDraftBanner && (
          <div
            className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            role="region"
            aria-label="Saved draft"
          >
            <p className="text-gray-700">Resume draft? We restored your last saved listing details.</p>
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

        <form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-8">
          <nav
            className="sticky top-16 z-10 -mx-6 bg-[#d4e9e2] px-0 py-2 sm:px-6"
            aria-label="Jump to section"
          >
            <div className="flex w-full flex-wrap gap-0 sm:w-auto sm:flex-nowrap sm:gap-2 sm:overflow-x-auto sm:px-0">
              {LANDLORD_FORM_NAV_SECTIONS.map(({ id, label }) => {
                const isActive = activeSection === id
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={
                      isActive
                        ? 'flex min-h-0 h-auto min-w-0 flex-1 basis-1/4 items-center justify-center whitespace-nowrap rounded-full border-0 bg-[#D85A30] px-1 py-1.5 text-center text-xs font-medium text-white outline outline-1 outline-[#D85A30] transition-colors sm:w-auto sm:flex-none sm:basis-auto sm:border sm:border-[#D85A30] sm:outline-none sm:px-3 sm:py-1.5 sm:text-sm'
                        : 'flex min-h-0 h-auto min-w-0 flex-1 basis-1/4 items-center justify-center whitespace-nowrap rounded-full border-0 bg-white px-1 py-1.5 text-center text-xs font-medium text-[#D85A30] outline outline-1 outline-[#D85A30] transition-colors hover:bg-[#D85A30] hover:text-white sm:w-auto sm:flex-none sm:basis-auto sm:border sm:border-[#D85A30] sm:outline-none sm:px-3 sm:py-1.5 sm:text-sm'
                    }
                  >
                    {label}
                  </a>
                )
              })}
            </div>
          </nav>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {submitError}
            </div>
          )}

          {role === 'admin' && !isEdit && (
            <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Listing owner</h2>
              <label htmlFor="admin-landlord" className={labelClass}>
                Landlord <span className="text-red-500">*</span>
              </label>
              <select
                id="admin-landlord"
                required
                value={adminLandlordId}
                onChange={(e) => setAdminLandlordId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select landlord…</option>
                {landlordOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </section>
          )}

          {sectionClass(
            'Basic information',
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-title" className={labelClass}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="pf-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-listing" className={labelClass}>
                  Listing type
                </label>
                <select
                  id="pf-listing"
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value as typeof listingType)}
                  className={inputClass}
                >
                  {LISTING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-desc" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="pf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={inputClass}
                />
                <AIDescriptionGenerator
                  roomType={roomType ? ROOM_TYPE_LABELS[roomType] : ''}
                  weeklyRent={weeklyRentNum}
                  suburb={suburb}
                  nearbyUniversities={nearbyUniversitiesForAi}
                  amenities={amenitiesForAi}
                  furnished={furnished}
                  existingDescription={description}
                  onGenerated={setDescription}
                />
              </div>
            </div>,
            'section-basic-info',
          )}

          {sectionClass(
            'Property details',
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pf-bed" className={labelClass}>
                    Bedrooms
                  </label>
                  <input
                    id="pf-bed"
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pf-bath" className={labelClass}>
                    Bathrooms
                  </label>
                  <input
                    id="pf-bath"
                    type="number"
                    min={0}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pf-room" className={labelClass}>
                  Room type
                </label>
                <select
                  id="pf-room"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as RoomType)}
                  className={inputClass}
                >
                  {ROOM_ENTRIES.map(([v, lab]) => (
                    <option key={v} value={v}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-property-type" className={labelClass}>
                  Property type
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Used for student booking and bond guidance. This is separate from the room layout above.
                </p>
                <select
                  id="pf-property-type"
                  value={propertyListingType}
                  onChange={(e) => setPropertyListingType(e.target.value as PropertyListingType)}
                  className={inputClass}
                >
                  {PROPERTY_TYPE_ENTRIES.map(([v, lab]) => (
                    <option key={v} value={v}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-rooming-house" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="pf-rooming-house"
                    type="checkbox"
                    checked={isRegisteredRoomingHouse}
                    onChange={(e) => {
                      const on = e.target.checked
                      setIsRegisteredRoomingHouse(on)
                      if (!on) setRoomingHouseRegistrationNumber('')
                    }}
                    className={LANDLORD_FORM_CHECKBOX_CLASS}
                  />
                  <span className="text-sm text-gray-700">This property is a registered rooming house</span>
                </label>
                {isRegisteredRoomingHouse ? (
                  <div className="mt-3 pl-6">
                    <label htmlFor="pf-rooming-reg" className={labelClass}>
                      Rooming house registration number
                    </label>
                    <input
                      id="pf-rooming-reg"
                      type="text"
                      value={roomingHouseRegistrationNumber}
                      onChange={(e) => setRoomingHouseRegistrationNumber(e.target.value)}
                      className={inputClass}
                      autoComplete="off"
                    />
                  </div>
                ) : null}
              </div>
            </div>,
            'section-property-details',
          )}

          {sectionClass(
            'Inclusions & features',
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-700">Inclusions</p>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 lg:grid-cols-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={furnished}
                      onChange={(e) => setFurnished(e.target.checked)}
                      className={LANDLORD_FORM_CHECKBOX_CLASS}
                    />
                    <span className="text-sm text-gray-700">Fully furnished</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linenSupplied}
                      onChange={(e) => setLinenSupplied(e.target.checked)}
                      className={LANDLORD_FORM_CHECKBOX_CLASS}
                    />
                    <span className="text-sm text-gray-700">Linen supplied</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weeklyCleaning}
                      onChange={(e) => setWeeklyCleaning(e.target.checked)}
                      className={LANDLORD_FORM_CHECKBOX_CLASS}
                    />
                    <span className="text-sm text-gray-700">Weekly cleaning service</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-700">Property features</p>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {features.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFeatureIds.has(f.id)}
                        onChange={() => toggleFeature(f.id)}
                        className={LANDLORD_FORM_CHECKBOX_CLASS}
                      />
                      <span className="text-sm text-gray-700">{f.name}</span>
                    </label>
                  ))}
                  {features.length === 0 && (
                    <p className="col-span-full text-xs text-gray-500">No features in database.</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-3">Tenant eligibility</p>
                <label htmlFor="pf-open-non-students" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="pf-open-non-students"
                    type="checkbox"
                    checked={openToNonStudents}
                    onChange={(e) => setOpenToNonStudents(e.target.checked)}
                    className={LANDLORD_FORM_CHECKBOX_CLASS}
                  />
                  <span className="text-sm text-gray-700">Open to non-students</span>
                </label>
                <p className="mt-2 pl-6 text-xs leading-snug text-gray-600">
                  When unchecked, only tenants with full student verification can see and enquire on this listing. Verified
                  students can always see all active listings.
                </p>
              </div>
            </div>,
            'section-inclusions-features',
          )}

          {sectionClass(
            'House rules',
            <div className="space-y-6">
              <div className="space-y-2">
                {houseRulesRef.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-700">
                      <span className="shrink-0 text-base" aria-hidden>
                        {r.icon}
                      </span>
                      <span>{r.name}</span>
                    </span>
                    <select
                      aria-label={`${r.name} permitted`}
                      value={selectedRules[r.id] ?? ''}
                      onChange={(e) => setRulePermitted(r.id, e.target.value)}
                      className="w-36 shrink-0 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#D85A30]"
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="approval">Approval</option>
                    </select>
                  </div>
                ))}
                {houseRulesRef.length === 0 && (
                  <p className="text-xs text-gray-500">No house rules reference data.</p>
                )}
              </div>
              <div className="space-y-3 border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-600">
                  These are your property's house rules. They will be shown to students and included in the tenancy
                  agreement. Customise them to suit your property.
                </p>
                <textarea
                  id="pf-house-rules"
                  aria-label="House rules text"
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  rows={18}
                  className={inputClass}
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void resetHouseRulesToPlatformDefault()}
                    className="self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    Reset to platform default
                  </button>
                  {houseRulesResetAck ? (
                    <p className="text-sm text-emerald-700" role="status">
                      Reset to platform default
                    </p>
                  ) : null}
                  {houseRulesResetError ? (
                    <p className="text-sm text-red-600" role="alert">
                      {houseRulesResetError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>,
            'section-house-rules',
          )}

          {sectionClass(
            'Location',
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-addr" className={labelClass}>
                  Address
                </label>
                <input
                  id="pf-addr"
                  value={address}
                  onChange={(e) => {
                    addressDirtyRef.current = true
                    setAddress(e.target.value)
                  }}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pf-suburb" className={labelClass}>
                    Suburb
                  </label>
                  <input
                    id="pf-suburb"
                    value={suburb}
                    onChange={(e) => {
                      addressDirtyRef.current = true
                      setSuburb(e.target.value)
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="pf-state" className={labelClass}>
                    State
                  </label>
                  <input
                    id="pf-state"
                    value={state}
                    onChange={(e) => {
                      addressDirtyRef.current = true
                      setState(e.target.value)
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pf-pc" className={labelClass}>
                  Postcode
                </label>
                <input
                  id="pf-pc"
                  value={postcode}
                  onChange={(e) => {
                    addressDirtyRef.current = true
                    setPostcode(e.target.value)
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>Nearest university campus</span>
                <p className="text-xs text-gray-500 mb-2">
                  We list the closest campuses from your address. <span className="font-medium text-gray-700">New</span>{' '}
                  listings save the nearest match automatically unless you override.{' '}
                  <span className="font-medium text-gray-700">Editing</span> a listing that has no campus saved yet: tap a
                  suggestion to select it (or use Add another university below)—we won’t assume a campus until you choose
                  one or save after an address change.
                </p>

                {nearbyCampusError && (
                  <p className="text-xs text-red-600 mt-2" role="alert">
                    {nearbyCampusError}
                  </p>
                )}
                {nearbyCampusSuggestions.length > 0 && (
                  <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Suggested closest campuses</p>
                    <div className="space-y-2">
                      {nearbyCampusSuggestions.map((s) => (
                        <button
                          key={s.campusId}
                          type="button"
                          onClick={() => applyNearbySuggestion(s)}
                          className="flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-2 py-2 text-left hover:bg-white hover:border-gray-200 hover:shadow-sm transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {s.universityLabel}: {s.campusLabel}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {s.distanceKm < 10 ? s.distanceKm.toFixed(1) : Math.round(s.distanceKm)} km away
                            </p>
                          </div>
                          <div className="shrink-0 text-[11px] text-gray-500">
                            {universityId === s.universityId && campusId === s.campusId ? 'Selected' : 'Tap to select'}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                      Based on approximate geocoding from your address.
                    </p>
                  </div>
                )}

                <div className="mt-4" ref={addAnotherUniversityHelpRef}>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="pf-add-another-uni" className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="pf-add-another-uni"
                        checked={showAddAnotherUniversity}
                        onChange={(e) => {
                          setShowAddAnotherUniversity(e.target.checked)
                          if (!e.target.checked) setAddAnotherUniversityHelpOpen(false)
                        }}
                        disabled={refsLoading || nearbyCampusLoading}
                        className={LANDLORD_FORM_CHECKBOX_CLASS}
                      />
                      <span className="text-sm text-gray-700">Add another university (optional)</span>
                    </label>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      aria-label="Help: additional university"
                      aria-expanded={addAnotherUniversityHelpOpen}
                      onClick={() => setAddAnotherUniversityHelpOpen((o) => !o)}
                    >
                      ?
                    </button>
                  </div>
                  {addAnotherUniversityHelpOpen && (
                    <div
                      role="tooltip"
                      className="mt-2 max-w-sm rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-md"
                    >
                      You can choose one additional university and campus for this listing—for example if your property
                      is a better fit for a campus other than the closest match we suggested above.
                    </div>
                  )}
                </div>

                {showAddAnotherUniversity && (
                  <div className="mt-4">
                    <UniversityCampusSelect
                      universityId={universityId || null}
                      campusId={campusId || null}
                      onUniversityChange={(id) => {
                        manualUniCampusSelectionRef.current = true
                        universityIdRef.current = id
                        setUniversityId(id)
                        campusIdRef.current = ''
                        setCampusId('')
                      }}
                      onCampusChange={(id) => {
                        manualUniCampusSelectionRef.current = true
                        campusIdRef.current = id
                        setCampusId(id)
                      }}
                      referenceScope="full"
                      showState
                      disabled={refsLoading || nearbyCampusLoading}
                      labelClassName={labelClass}
                      universitySelectClassName={inputClass}
                      campusSelectClassName={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
                      universityLabel="University"
                      campusLabel="Campus"
                      universityIdAttr="pf-uni"
                      campusIdAttr="pf-campus"
                    />
                  </div>
                )}
              </div>
            </div>,
            'section-location',
          )}

          {sectionClass(
            'Pricing & availability',
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="pf-rent" className={labelClass}>
                    Rent per week ($) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPricingSuggestionOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FF6B6B] hover:underline"
                  >
                    <AiSparkleIcon className="h-3.5 w-3.5 shrink-0" />
                    Get AI price suggestion
                  </button>
                </div>
                <input
                  id="pf-rent"
                  type="number"
                  min={1}
                  step={1}
                  value={rentPerWeek}
                  onChange={(e) => setRentPerWeek(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-bond" className={labelClass}>
                  Bond ($)
                </label>
                <input
                  id="pf-bond"
                  type="number"
                  min={0}
                  step={1}
                  value={bond}
                  onChange={(e) => setBond(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pf-lease" className={labelClass}>
                  Lease length
                </label>
                <select
                  id="pf-lease"
                  value={leaseLength}
                  onChange={(e) => setLeaseLength(e.target.value)}
                  className={inputClass}
                >
                  {LEASE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pf-from" className={labelClass}>
                  Available from
                </label>
                <input
                  id="pf-from"
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>,
            'section-pricing-availability',
          )}

          {sectionClass(
            'Property photos',
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Up to {MAX_IMAGES} images, max 5MB each. Public bucket: {BUCKET}</p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImage || images.length >= MAX_IMAGES}
                onChange={(e) => void onPickImages(e.target.files)}
                className="block text-sm text-gray-600"
              />
              {uploadingImage && <p className="text-xs text-gray-500">Uploading…</p>}
              <div className="flex flex-wrap gap-3">
                {images.map((url) => (
                  <div key={url} className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => void removeImage(url)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>,
            'section-photos',
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gray-900 text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish listing'}
            </button>
            <Link
              to="/landlord-dashboard"
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {nearbyCampusLoading && !submitting && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campus-search-overlay-title"
          aria-busy="true"
        >
          <div className="max-w-sm w-full rounded-2xl bg-white shadow-xl border border-gray-100 px-8 py-10 text-center">
            <div
              className="mx-auto h-12 w-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-5"
              aria-hidden
            />
            <p id="campus-search-overlay-title" className="text-base font-semibold text-gray-900">
              Finding nearby campuses
            </p>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Working out which university campuses are closest to your address. This may take a few seconds.
            </p>
          </div>
        </div>
      )}

      <AIPricingSuggestionModal
        isOpen={pricingSuggestionOpen}
        onClose={() => setPricingSuggestionOpen(false)}
        onAccept={(price) => setRentPerWeek(String(price))}
        roomType={roomType ? ROOM_TYPE_LABELS[roomType] : ''}
        suburb={suburb}
        nearbyUniversities={nearbyUniversitiesForAi}
        amenities={amenitiesForAi}
        furnished={furnished}
      />
    </div>
  )
}
