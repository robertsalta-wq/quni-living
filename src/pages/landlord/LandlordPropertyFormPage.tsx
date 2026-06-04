import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type { Database } from '../../lib/database.types'
import { generatePropertySlug } from '../../lib/generatePropertySlug'
import { ROOM_TYPE_LABELS, isPropertyListingType, isRoomType, type PropertyListingType, type RoomType } from '../../lib/listings'
import {
  ACCOMMODATION_UI_OPTIONS,
  accommodationChoiceFromFields,
  fieldsFromAccommodationChoice,
  normalizeAccommodationForSave,
  roomForRentOptions,
  roomingHouseFieldErrors,
  showRoomForRentSelect,
  type AccommodationUiChoice,
} from '../../lib/landlordAccommodationChoice'
import {
  isQldOnSiteBoarderLodgerListing,
  parseRoomsRentedToResidents,
  qldOnSiteListingCallout,
  qldRoomsRentedFieldError,
} from '../../lib/tenancy/qldBoarderLodger'
import AIDescriptionGenerator from '../../components/AIDescriptionGenerator'
import PropertyPhotoReorderGrid from '../../components/landlord/PropertyPhotoReorderGrid'
import {
  normalizePropertyImages,
  serializePropertyImages,
  type PropertyImage,
} from '../../lib/propertyImages'
import { prepareProfilePhotoForUpload } from '../../lib/prepareProfilePhotoForUpload'
import FieldHelpHint from '../../components/FieldHelpHint'
import { buildGeocodeQueryCandidates } from '../../lib/normalizeAustralianAddressForGeocode'
import AIPricingSuggestionModal from '../../components/AIPricingSuggestionModal'
import AiSparkleIcon from '../../components/AiSparkleIcon'
import { maxWeeklyRentForProperty } from '../../lib/pricing/resolveWeeklyRent'
import { findParkingFeatureId } from '../../lib/pricing/parkingFeature'
import UniversityCampusSelect from '../../components/UniversityCampusSelect'
import { useUniversityCampusReference } from '../../hooks/useUniversityCampusReference'
import { campusLatLonFromRow } from '../../lib/universityCampusReference'
import {
  fetchLockedPricingSnapshotsForProperty,
  fetchPricingForPropertyTier,
  formatFeeForDisplay,
  formatListingTierAcceptanceFee,
  landlordNetWeeklyAfterManagedFee,
  resolvePropertyTierFromListing,
  type PricingCell,
} from '../../lib/pricing'
import { resolveServiceTierAvailability } from '../../lib/serviceTier'
import { usePlatformFeatures, useServiceTierResolverOptions } from '../../context/PlatformFeaturesContext'
import {
  MANAGED_COMING_SOON_SHORT,
  MANAGED_LANDLORD_PROPERTY_FORM_HINT,
} from '../../lib/managedComingSoonCopy'
import { LISTING_TIER_ADDRESS_ON_LEASE_NOTICE } from '../../lib/listingTierAddressNotice'
import {
  canSwitchPropertyServiceTier,
  INTENDED_LANDLORD_SERVICE_TIER_KEY,
  landlordServiceTierTitle,
  parseLandlordServiceTier,
  type LandlordServiceTier,
} from '../../lib/landlordServiceTier'
import UserDashboardBreadcrumb from '../../components/dashboard/UserDashboardBreadcrumb'
import { userDashboardBreadcrumbs } from '../../lib/userDashboardNav'
import LandlordPropertyFt6600ComplianceFields, {
  emptyLandlordFt6600ComplianceFormState,
  ft6600ComplianceColumnsFromFormState,
  ft6600ComplianceFormStateFromProperty,
  missingFt6600ComplianceFieldLabelsFromForm,
  type LandlordFt6600ComplianceFormState,
} from '../../components/landlord/LandlordPropertyFt6600ComplianceFields'
import { nswFt6600ComplianceBlockedMessage } from '../../../api/lib/documents/propertyFt6600Compliance.js'
import { looksLikeMissingDbColumn, messageFromSupabaseError } from '../../lib/supabaseErrorMessage'

const FT6600_COMPLIANCE_MIGRATION_HINT =
  'Run supabase/property_ft6600_compliance_apply_and_reload.sql in the Supabase SQL editor (same project as production — check Settings → API → Project URL matches your live site). If columns already exist, the script still reloads the API schema cache; wait 30 seconds, hard-refresh, then save again.'

function submitErrorMessageFromUnknown(err: unknown, showComplianceSection: boolean): string {
  const msg = messageFromSupabaseError(err)
  if (!looksLikeMissingDbColumn(err)) return msg
  if (
    showComplianceSection &&
    /smoke_alarm|strata_oc|water_usage_charged|electricity_embedded|gas_embedded|strata_bylaws/i.test(msg)
  ) {
    return `${msg} ${FT6600_COMPLIANCE_MIGRATION_HINT}`
  }
  if (/linen_supplied|weekly_cleaning/i.test(msg)) {
    return `${msg} Run supabase/property_form_extend.sql in the Supabase SQL editor, then save again.`
  }
  return `${msg} A database migration may be missing — check the supabase/migrations folder.`
}

/** Checkbox styling — single pattern for every landlord form checkbox. */
const LANDLORD_FORM_CHECKBOX_CLASS =
  'h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[#D85A30] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'

const LANDLORD_FORM_NAV_SECTIONS: { id: string; label: string }[] = [
  { id: 'section-basic-info', label: 'Basic info' },
  { id: 'section-property-details', label: 'Property details' },
  { id: 'section-inclusions-features', label: 'Inclusions' },
  { id: 'section-ft6600-compliance', label: 'Compliance' },
  { id: 'section-house-rules', label: 'Rules' },
  { id: 'section-location', label: 'Location' },
  { id: 'section-description', label: 'Description' },
  { id: 'section-pricing-availability', label: 'Pricing' },
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

const LEASE_OPTIONS = ['Flexible', '6 months', '12 months', '2 years'] as const

const LANDLORD_PROPERTY_DRAFT_KEY = 'landlord_property_draft' as const
const LANDLORD_PROPERTY_DRAFT_VERSION = 1 as const

/** Persisted new-listing draft — property fields only (no admin landlord id or auth). */
type LandlordPropertyDraftV1 = {
  v: typeof LANDLORD_PROPERTY_DRAFT_VERSION
  title: string
  description: string
  bedrooms: string
  bathrooms: string
  roomsRentedToResidents: string
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
  maxOccupants: string
  coupleSurchargePerWeek: string
  parkingSurchargePerWeek: string
  parkingAvailable: boolean
  bond: string
  leaseLength: string
  availableFrom: string
  /** Serialized via `serializePropertyImages` when persisted to localStorage. */
  images: string[]
  isRegisteredRoomingHouse: boolean
  roomingHouseRegistrationNumber: string
  serviceTier: LandlordServiceTier
  houseRules: string
  selectedRules: Partial<Record<string, RulePermitted>>
}

function parseDraftSelectedRules(raw: unknown): Partial<Record<string, RulePermitted>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<string, RulePermitted>> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && (v === 'yes' || v === 'no' || v === 'approval')) out[k] = v
  }
  return out
}

function persistLandlordPropertyDraftToStorage(draft: LandlordPropertyDraftV1): void {
  try {
    localStorage.setItem(LANDLORD_PROPERTY_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
}

function landlordPropertyDraftFromState(
  s: Omit<LandlordPropertyDraftV1, 'v'>,
): LandlordPropertyDraftV1 {
  return { v: LANDLORD_PROPERTY_DRAFT_VERSION, ...s }
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
      bedrooms: typeof d.bedrooms === 'string' ? d.bedrooms : '1',
      bathrooms: typeof d.bathrooms === 'string' ? d.bathrooms : '1',
      roomsRentedToResidents:
        typeof d.roomsRentedToResidents === 'string' ? d.roomsRentedToResidents : '1',
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
      maxOccupants: typeof d.maxOccupants === 'string' ? d.maxOccupants : '1',
      coupleSurchargePerWeek:
        typeof d.coupleSurchargePerWeek === 'string' ? d.coupleSurchargePerWeek : '',
      parkingSurchargePerWeek:
        typeof d.parkingSurchargePerWeek === 'string' ? d.parkingSurchargePerWeek : '',
      parkingAvailable: Boolean(d.parkingAvailable),
      bond: typeof d.bond === 'string' ? d.bond : '',
      leaseLength: parseDraftLeaseLength(d.leaseLength),
      availableFrom: typeof d.availableFrom === 'string' ? d.availableFrom : '',
      images: Array.isArray(d.images) ? d.images.filter((x): x is string => typeof x === 'string') : [],
      isRegisteredRoomingHouse: Boolean(d.isRegisteredRoomingHouse),
      roomingHouseRegistrationNumber:
        typeof d.roomingHouseRegistrationNumber === 'string' ? d.roomingHouseRegistrationNumber : '',
      serviceTier: parseLandlordServiceTier(d.serviceTier) ?? 'listing',
      houseRules: typeof d.houseRules === 'string' ? d.houseRules : '',
      selectedRules: parseDraftSelectedRules(d.selectedRules),
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
    d.bedrooms !== '1' ||
    d.bathrooms !== '1' ||
    d.roomType !== 'apartment' ||
    d.propertyListingType !== 'entire_property' ||
    d.furnished ||
    d.linenSupplied ||
    d.weeklyCleaning ||
    d.openToNonStudents ||
    d.showAddAnotherUniversity ||
    d.serviceTier !== 'listing' ||
    d.houseRules.trim() !== '' ||
    Object.keys(d.selectedRules).length > 0
  )
}

const MAX_IMAGES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024
const BUCKET = 'property-images'
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'])

function imageExtensionFromFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (IMAGE_EXTENSIONS.has(ext)) return ext === 'jpeg' ? 'jpg' : ext
  return 'jpg'
}

/** Mobile browsers often leave `file.type` empty for camera-roll photos. */
function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.has(ext)
}

function fileForImageUpload(file: File): File {
  if (file.type.startsWith('image/')) return file
  const ext = imageExtensionFromFilename(file.name)
  const mime =
    ext === 'png'
      ? 'image/png'
      : ext === 'gif'
        ? 'image/gif'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg'
  return new File([file], file.name, { type: mime })
}

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
      className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm scroll-mt-below-header"
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
  const { managedTierEnabled } = usePlatformFeatures()
  const serviceTierResolverOptions = useServiceTierResolverOptions()

  const { universities: uniRefRows, campuses: campusRefRows, loading: refsLoading } =
    useUniversityCampusReference('full')

  const [pageError, setPageError] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [landlordOptions, setLandlordOptions] = useState<{ id: string; label: string }[]>([])
  const [existingSlug, setExistingSlug] = useState<string | null>(null)
  const [existingListingStatus, setExistingListingStatus] = useState<
    Database['public']['Tables']['properties']['Row']['status'] | null
  >(null)

  const [adminLandlordId, setAdminLandlordId] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showRoomingHouseValidation, setShowRoomingHouseValidation] = useState(false)

  const [bedrooms, setBedrooms] = useState('1')
  const [bathrooms, setBathrooms] = useState('1')
  const [roomsRentedToResidents, setRoomsRentedToResidents] = useState('1')
  const [roomType, setRoomType] = useState<RoomType | ''>('apartment')
  const [propertyListingType, setPropertyListingType] = useState<PropertyListingType>('entire_property')

  const accommodationChoice = useMemo(
    () => accommodationChoiceFromFields(propertyListingType, roomType),
    [propertyListingType, roomType],
  )

  const selectAccommodationChoice = useCallback((choice: AccommodationUiChoice) => {
    const next = fieldsFromAccommodationChoice(choice)
    setPropertyListingType(next.propertyListingType)
    setRoomType(next.roomType)
  }, [])
  const [serviceTier, setServiceTier] = useState<LandlordServiceTier>('listing')
  const [initialServiceTier, setInitialServiceTier] = useState<LandlordServiceTier>('listing')
  const [isRegisteredRoomingHouse, setIsRegisteredRoomingHouse] = useState(false)
  const [roomingHouseRegistrationNumber, setRoomingHouseRegistrationNumber] = useState('')
  const roomingHouseErrors = useMemo(
    () => roomingHouseFieldErrors(propertyListingType, isRegisteredRoomingHouse, roomingHouseRegistrationNumber),
    [propertyListingType, isRegisteredRoomingHouse, roomingHouseRegistrationNumber],
  )

  useEffect(() => {
    if (!roomingHouseErrors.onSiteConflict && !roomingHouseErrors.missingRegistration) {
      setShowRoomingHouseValidation(false)
    }
  }, [roomingHouseErrors.onSiteConflict, roomingHouseErrors.missingRegistration])
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

  const qldOnSiteBoarderLodger = useMemo(
    () => isQldOnSiteBoarderLodgerListing(state, propertyListingType),
    [state, propertyListingType],
  )

  const showNswFt6600ComplianceSection = state.trim().toUpperCase() === 'NSW'

  const formNavSections = useMemo(
    () =>
      showNswFt6600ComplianceSection
        ? LANDLORD_FORM_NAV_SECTIONS
        : LANDLORD_FORM_NAV_SECTIONS.filter((s) => s.id !== 'section-ft6600-compliance'),
    [showNswFt6600ComplianceSection],
  )

  const qldRoomsRentedError = useMemo(
    () =>
      qldOnSiteBoarderLodger
        ? qldRoomsRentedFieldError(parseRoomsRentedToResidents(roomsRentedToResidents))
        : null,
    [qldOnSiteBoarderLodger, roomsRentedToResidents],
  )

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
  const [maxOccupants, setMaxOccupants] = useState('1')
  const [coupleSurchargePerWeek, setCoupleSurchargePerWeek] = useState('')
  const [parkingSurchargePerWeek, setParkingSurchargePerWeek] = useState('')
  const [parkingAvailable, setParkingAvailable] = useState(false)
  const [ft6600Compliance, setFt6600Compliance] = useState<LandlordFt6600ComplianceFormState>(
    emptyLandlordFt6600ComplianceFormState,
  )
  const [pricingSuggestionOpen, setPricingSuggestionOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('section-basic-info')
  const weeklyRentNum = useMemo(() => {
    const t = rentPerWeek.trim()
    if (!t) return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }, [rentPerWeek])

  const parkingFeatureId = useMemo(() => findParkingFeatureId(features), [features])

  const bondSuggestedMaxWeeklyRent = useMemo(() => {
    const rent = Number(rentPerWeek)
    if (!Number.isFinite(rent) || rent <= 0) return null
    try {
      return maxWeeklyRentForProperty({
        rent_per_week: rent,
        max_occupants: Math.min(10, Math.max(1, parseInt(maxOccupants, 10) || 1)),
        couple_surcharge_per_week: coupleSurchargePerWeek.trim() || null,
        parking_surcharge_per_week: parkingSurchargePerWeek.trim() || null,
        parking_available: parkingAvailable,
      })
    } catch {
      return null
    }
  }, [rentPerWeek, maxOccupants, coupleSurchargePerWeek, parkingSurchargePerWeek, parkingAvailable])

  const resolvedPropertyTier = useMemo(
    () => resolvePropertyTierFromListing(propertyListingType, isRegisteredRoomingHouse),
    [propertyListingType, isRegisteredRoomingHouse],
  )
  const serviceTierAvailability = useMemo(
    () => resolveServiceTierAvailability(state.trim() || 'NSW', resolvedPropertyTier, serviceTierResolverOptions),
    [state, resolvedPropertyTier, serviceTierResolverOptions],
  )
  const listingTierAvailable = serviceTierAvailability.listing !== 'unsupported'
  const managedTierAvailable = serviceTierAvailability.managed === 'available'
  const managedTierUnavailableReason =
    serviceTierAvailability.managed === 'gated'
      ? serviceTierAvailability.notes ?? 'Managed is not available for this property yet.'
      : 'Managed is not available for this property.'

  const [tierPricingListing, setTierPricingListing] = useState<PricingCell | null>(null)
  const [tierPricingManaged, setTierPricingManaged] = useState<PricingCell | null>(null)
  const [tierPricingError, setTierPricingError] = useState<string | null>(null)
  const [tierPricingLockedForListing, setTierPricingLockedForListing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const tier = resolvedPropertyTier
    void (async () => {
      try {
        if (isEdit && propertyId) {
          const { listing, managed } = await fetchLockedPricingSnapshotsForProperty(supabase, propertyId)
          if (!cancelled) {
            setTierPricingListing(listing)
            setTierPricingManaged(managed)
            setTierPricingLockedForListing(true)
            setTierPricingError(null)
          }
        } else {
          const [listingP, managedP] = await Promise.all([
            fetchPricingForPropertyTier(tier, 'listing'),
            fetchPricingForPropertyTier(tier, 'managed'),
          ])
          if (!cancelled) {
            setTierPricingListing(listingP)
            setTierPricingManaged(managedP)
            setTierPricingLockedForListing(false)
            setTierPricingError(null)
          }
        }
      } catch {
        if (!cancelled) {
          setTierPricingListing(null)
          setTierPricingManaged(null)
          setTierPricingLockedForListing(false)
          setTierPricingError('Could not load tier pricing.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolvedPropertyTier, isEdit, propertyId, supabase])

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

  const [images, setImages] = useState<PropertyImage[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const photoFileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<PropertyImage[]>([])
  imagesRef.current = images

  const landlordPropertyDraftSnapshot = useMemo(
    () =>
      landlordPropertyDraftFromState({
        title,
        description,
        bedrooms,
        bathrooms,
        roomsRentedToResidents,
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
        maxOccupants,
        coupleSurchargePerWeek,
        parkingSurchargePerWeek,
        parkingAvailable,
        bond,
        leaseLength,
        availableFrom,
        images: serializePropertyImages(images),
        isRegisteredRoomingHouse,
        roomingHouseRegistrationNumber,
        serviceTier,
        houseRules,
        selectedRules: { ...selectedRules },
      }),
    [
      title,
      description,
      bedrooms,
      bathrooms,
      roomsRentedToResidents,
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
      maxOccupants,
      coupleSurchargePerWeek,
      parkingSurchargePerWeek,
      parkingAvailable,
      bond,
      leaseLength,
      availableFrom,
      images,
      serviceTier,
      houseRules,
      selectedRules,
    ],
  )

  const landlordPropertyDraftSnapshotRef = useRef(landlordPropertyDraftSnapshot)
  useEffect(() => {
    landlordPropertyDraftSnapshotRef.current = landlordPropertyDraftSnapshot
  }, [landlordPropertyDraftSnapshot])

  const persistLandlordPropertyDraft = useCallback(() => {
    if (isEdit) return
    persistLandlordPropertyDraftToStorage(landlordPropertyDraftSnapshotRef.current)
  }, [isEdit])

  const propertyFormModeRef = useRef<'new' | 'edit' | null>(null)
  const restoredLocationKeyRef = useRef<string | null>(null)
  /** When set to `location.key`, do not show the resume banner again after re-fetch/re-load on the same navigation. */
  const resumeDraftBannerDismissedKeyRef = useRef<string | null>(null)
  const draftSavedHideTimerRef = useRef<number | null>(null)
  const [draftSaveEnabled, setDraftSaveEnabled] = useState(false)
  const [showResumeDraftBanner, setShowResumeDraftBanner] = useState(false)
  const [draftSavedVisible, setDraftSavedVisible] = useState(false)

  const setParkingAvailableWithFeature = useCallback(
    (next: boolean) => {
      setParkingAvailable(next)
      if (!parkingFeatureId) return
      setSelectedFeatureIds((prev) => {
        const ids = new Set(prev)
        if (next) ids.add(parkingFeatureId)
        else ids.delete(parkingFeatureId)
        return ids
      })
    },
    [parkingFeatureId],
  )

  const toggleFeature = useCallback((id: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev)
      const had = next.has(id)
      if (had) next.delete(id)
      else next.add(id)
      if (parkingFeatureId && id === parkingFeatureId) {
        setParkingAvailable(!had)
      }
      return next
    })
  }, [parkingFeatureId])

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
    setShowRoomingHouseValidation(false)
    setBedrooms('1')
    setBathrooms('1')
    setRoomType('apartment')
    setPropertyListingType('entire_property')
    setServiceTier('listing')
    setInitialServiceTier('listing')
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

      const formMode: 'new' | 'edit' = isEdit && propertyId ? 'edit' : 'new'
      const switchedFromEditToNew =
        formMode === 'new' && propertyFormModeRef.current === 'edit'
      propertyFormModeRef.current = formMode

      if (switchedFromEditToNew) {
        skipNearbyAutoFillOverwriteRef.current = false
        manualUniCampusSelectionRef.current = false
        editDeferNearbyAutoFillRef.current = false
        editModeGeocodeFiredRef.current = false
        loadedPropertyAddressSigRef.current = ''
        setShowAddAnotherUniversity(false)
        // Navigated from edit → new without unmounting — clear stale edit state.
        setUniversityId('')
        setCampusId('')
        universityIdRef.current = ''
        campusIdRef.current = ''
        setSelectedRules({})
        setHouseRules('')
        setHouseRulesResetError(null)
        setHouseRulesResetAck(false)
        setInitialServiceTier('listing')
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
        setExistingListingStatus(prop.status)
        setTitle(prop.title)
        setDescription(prop.description ?? '')
        setBedrooms(prop.bedrooms != null ? String(prop.bedrooms) : '1')
        setBathrooms(prop.bathrooms != null ? String(prop.bathrooms) : '1')
        setRoomsRentedToResidents(
          prop.rooms_rented_to_residents != null ? String(prop.rooms_rented_to_residents) : '1',
        )
        setRoomType(prop.room_type ?? 'single')
        setPropertyListingType(
          prop.property_type && isPropertyListingType(prop.property_type) ? prop.property_type : 'entire_property',
        )
        const loadedServiceTier = parseLandlordServiceTier(prop.service_tier) ?? 'listing'
        setServiceTier(loadedServiceTier)
        setInitialServiceTier(loadedServiceTier)
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
        const loadedHasCoords =
          prop.latitude != null &&
          prop.longitude != null &&
          Number.isFinite(Number(prop.latitude)) &&
          Number.isFinite(Number(prop.longitude))
        const loadedHasUniCampus = Boolean(prop.university_id?.trim() || prop.campus_id?.trim())
        if (loadedPropertyAddressSigRef.current && loadedHasCoords && loadedHasUniCampus) {
          addressDirtyRef.current = false
          lastNearbySigRef.current = loadedPropertyAddressSigRef.current
          editModeGeocodeFiredRef.current = true
        } else {
          addressDirtyRef.current = false
          lastNearbySigRef.current = ''
          editModeGeocodeFiredRef.current = false
        }
        setRentPerWeek(String(prop.rent_per_week ?? ''))
        setMaxOccupants(String(prop.max_occupants ?? 1))
        setCoupleSurchargePerWeek(
          prop.couple_surcharge_per_week != null ? String(prop.couple_surcharge_per_week) : '',
        )
        setParkingSurchargePerWeek(
          prop.parking_surcharge_per_week != null ? String(prop.parking_surcharge_per_week) : '',
        )
        setParkingAvailable(Boolean(prop.parking_available))
        setBond(prop.bond != null ? String(prop.bond) : '')
        setLeaseLength(prop.lease_length ?? 'Flexible')
        setAvailableFrom(prop.available_from ? prop.available_from.slice(0, 10) : '')
        setImages(normalizePropertyImages(prop.images))
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
        setFt6600Compliance(ft6600ComplianceFormStateFromProperty(prop))
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
      setBedrooms(parsed.bedrooms)
      setBathrooms(parsed.bathrooms)
      setRoomsRentedToResidents(parsed.roomsRentedToResidents)
      setRoomType(parsed.roomType)
      setPropertyListingType(parsed.propertyListingType)
      setServiceTier(parsed.serviceTier)
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
      setMaxOccupants(parsed.maxOccupants)
      setCoupleSurchargePerWeek(parsed.coupleSurchargePerWeek)
      setParkingSurchargePerWeek(parsed.parkingSurchargePerWeek)
      setParkingAvailable(parsed.parkingAvailable)
      setBond(parsed.bond)
      setLeaseLength(parsed.leaseLength)
      setAvailableFrom(parsed.availableFrom)
      setImages(normalizePropertyImages(parsed.images))
      setHouseRules(parsed.houseRules)
      setSelectedRules({ ...parsed.selectedRules })

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
      const intended = parseLandlordServiceTier(localStorage.getItem(INTENDED_LANDLORD_SERVICE_TIER_KEY))
      if (intended) {
        setServiceTier(intended)
        try {
          localStorage.removeItem(INTENDED_LANDLORD_SERVICE_TIER_KEY)
        } catch {
          /* ignore */
        }
      }
    }
    setDraftSaveEnabled(true)
  }, [isEdit, loadingPage, location.key, features])

  useEffect(() => {
    if (isEdit || !draftSaveEnabled || loadingPage) return
    const id = window.setTimeout(() => {
      persistLandlordPropertyDraft()
      setDraftSavedVisible(true)
      if (draftSavedHideTimerRef.current) window.clearTimeout(draftSavedHideTimerRef.current)
      draftSavedHideTimerRef.current = window.setTimeout(() => {
        setDraftSavedVisible(false)
        draftSavedHideTimerRef.current = null
      }, 2200)
    }, 500)
    return () => window.clearTimeout(id)
  }, [landlordPropertyDraftSnapshot, isEdit, draftSaveEnabled, loadingPage, persistLandlordPropertyDraft])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden' || isEdit || !draftSaveEnabled || loadingPage) return
      persistLandlordPropertyDraft()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [isEdit, draftSaveEnabled, loadingPage, persistLandlordPropertyDraft])

  useEffect(() => {
    const onPageHide = () => {
      if (isEdit || !draftSaveEnabled || loadingPage) return
      persistLandlordPropertyDraft()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [isEdit, draftSaveEnabled, loadingPage, persistLandlordPropertyDraft])

  useEffect(() => {
    if (!isEdit || loadingPage) return
    if (editModeGeocodeFiredRef.current) return

    const addr = address.trim()
    const sub = suburb.trim()
    const st = state.trim()
    const pc = postcode.trim()
    if (!addr || !sub || !st || !pc) return

    const sig = [addr, sub, st, pc].join('|').toLowerCase()
    const addressUnchanged =
      loadedPropertyAddressSigRef.current !== '' && sig === loadedPropertyAddressSigRef.current
    const hasCoords =
      latitude != null &&
      longitude != null &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude))
    const hasUniCampus = Boolean(universityId.trim() || campusId.trim())

    if (addressUnchanged && hasCoords && hasUniCampus) {
      editModeGeocodeFiredRef.current = true
      addressDirtyRef.current = false
      lastNearbySigRef.current = sig
      return
    }

    const t = window.setTimeout(() => {
      if (editModeGeocodeFiredRef.current) return
      editModeGeocodeFiredRef.current = true
      addressDirtyRef.current = true
      lastNearbySigRef.current = ''
      setNearbyLookupNonce((n) => n + 1)
    }, 500)
    return () => window.clearTimeout(t)
  }, [
    isEdit,
    loadingPage,
    address,
    suburb,
    state,
    postcode,
    latitude,
    longitude,
    universityId,
    campusId,
  ])

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

  async function geocodeAddressWithFallbacks(
    addr: string,
    sub: string,
    st: string,
    pc: string,
    signal?: AbortSignal,
  ): Promise<GeoPoint | null> {
    const candidates = buildGeocodeQueryCandidates(addr, sub, st, pc)
    for (const q of candidates) {
      const pt = await geocodeCached(q, signal)
      if (pt) return pt
    }
    return null
  }

  async function geocodeAddressForSave(
    addr: string,
    sub: string,
    st: string,
    pc: string,
  ): Promise<GeoPoint | null> {
    const ac = new AbortController()
    const timeout = window.setTimeout(() => ac.abort(), 8000)
    try {
      return await geocodeAddressWithFallbacks(addr, sub, st, pc, ac.signal)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  function scrollToFormFeedback(anchorId: 'listing-form-feedback-top' | 'listing-form-feedback-bottom') {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function reportSubmitError(message: string, anchorId?: 'listing-form-feedback-top' | 'listing-form-feedback-bottom') {
    setSubmitSuccessMessage(null)
    setSubmitError(message)
    window.requestAnimationFrame(() => {
      scrollToFormFeedback(anchorId ?? 'listing-form-feedback-bottom')
    })
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

        const ac = new AbortController()
        try {
          const propertyPoint = await geocodeAddressWithFallbacks(addr, sub, st, pc, ac.signal)
          if (!propertyPoint) {
            setNearbyCampusError(
              'We could not find that street in this suburb. Check the street line, suburb, state and postcode — unit numbers are optional for campus suggestions.',
            )
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
      setImages((prev) => prev.filter((img) => img.url !== url))
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
      setPhotoUploadError(null)
      setSubmitError(null)
      const errors: string[] = []
      const next = [...imagesRef.current]
      try {
        for (let i = 0; i < files.length; i++) {
          if (next.length >= MAX_IMAGES) {
            errors.push(`You can add up to ${MAX_IMAGES} photos per listing.`)
            break
          }
          const file = files[i]
          if (!isLikelyImageFile(file)) {
            errors.push(`${file.name} is not a supported image file.`)
            continue
          }

          let uploadBlob: Blob = file
          let uploadExt = imageExtensionFromFilename(file.name)
          const normalizedFile = fileForImageUpload(file)
          const needsCompression =
            file.size > MAX_FILE_BYTES || uploadExt === 'heic' || uploadExt === 'heif'

          if (needsCompression) {
            try {
              const prepared = await prepareProfilePhotoForUpload(normalizedFile, MAX_FILE_BYTES)
              uploadBlob = prepared.blob
              uploadExt = prepared.ext === 'jpeg' ? 'jpg' : prepared.ext
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Could not prepare image.'
              errors.push(`${file.name}: ${msg}`)
              continue
            }
          }

          const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(uploadExt) ? uploadExt : 'jpg'
          const objectPath = `${user.id}/${crypto.randomUUID()}.${safeExt === 'jpeg' ? 'jpg' : safeExt}`
          const contentType =
            uploadBlob instanceof File && uploadBlob.type.startsWith('image/')
              ? uploadBlob.type
              : safeExt === 'png'
                ? 'image/png'
                : safeExt === 'gif'
                  ? 'image/gif'
                  : safeExt === 'webp'
                    ? 'image/webp'
                    : 'image/jpeg'

          const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, uploadBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType,
          })
          if (upErr) {
            errors.push(`${file.name}: ${upErr.message}`)
            continue
          }
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
          next.push({ url: pub.publicUrl })
        }
        setImages(next)
        if (errors.length > 0) {
          setPhotoUploadError(errors.join(' '))
        }
      } catch (e) {
        setImages(next)
        const msg = e instanceof Error ? e.message : 'Upload failed.'
        errors.push(msg)
        setPhotoUploadError(errors.join(' '))
      } finally {
        setUploadingImage(false)
        if (photoFileInputRef.current) photoFileInputRef.current.value = ''
      }
    },
    [user?.id],
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
    setSubmitSuccessMessage(null)
    if (!user?.id) {
      reportSubmitError('You must be signed in to save this listing.')
      return
    }
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

    const maxOcc = Math.min(10, Math.max(1, parseInt(maxOccupants, 10) || 1))
    const coupleRaw = coupleSurchargePerWeek.trim()
    const coupleAmt = coupleRaw ? Number(coupleRaw) : null
    if (coupleAmt != null && (!Number.isFinite(coupleAmt) || coupleAmt < 0)) {
      setSubmitError('Couple surcharge must be zero or a positive amount.')
      return
    }
    const parkingRaw = parkingSurchargePerWeek.trim()
    const parkingAmt = parkingAvailable && parkingRaw ? Number(parkingRaw) : null
    if (parkingAmt != null && (!Number.isFinite(parkingAmt) || parkingAmt < 0)) {
      setSubmitError('Carpark surcharge must be zero or a positive amount.')
      return
    }

    let landlordId: string | null = landlordProfile?.id ?? null

    if (serviceTier === 'listing' && !listingTierAvailable) {
      reportSubmitError('Quni Listing is not available for this property.')
      return
    }
    if (serviceTier === 'managed' && !managedTierAvailable) {
      reportSubmitError(managedTierUnavailableReason)
      return
    }

    if (qldRoomsRentedError) {
      reportSubmitError(qldRoomsRentedError)
      return
    }

    if (roomingHouseErrors.onSiteConflict || roomingHouseErrors.missingRegistration) {
      setShowRoomingHouseValidation(true)
      reportSubmitError('Fix rooming house registration details before saving.')
      document.getElementById('section-accommodation')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (isEdit && !canSwitchPropertyServiceTier(initialServiceTier, serviceTier)) {
      reportSubmitError('Managed properties cannot be changed back to Quni Listing.')
      return
    }

    if (showNswFt6600ComplianceSection) {
      const missingCompliance = missingFt6600ComplianceFieldLabelsFromForm(ft6600Compliance)
      if (missingCompliance.length > 0) {
        reportSubmitError(nswFt6600ComplianceBlockedMessage(missingCompliance))
        document.getElementById('section-ft6600-compliance')?.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }

    setSubmitting(true)
    try {
    if (role === 'admin') {
      if (isEdit && propertyId) {
        const { data: existing } = await supabase.from('properties').select('landlord_id').eq('id', propertyId).single()
        landlordId = (existing as { landlord_id: string | null } | null)?.landlord_id ?? null
      } else {
        landlordId = adminLandlordId.trim() || null
        if (!landlordId) {
          reportSubmitError('Select a landlord for this listing.')
          return
        }
      }
    }

    if (!landlordId) {
      reportSubmitError('Landlord profile is missing. Complete landlord onboarding first.')
      return
    }

    let featureIds = [...selectedFeatureIds]
    if (parkingFeatureId) {
      if (parkingAvailable) {
        if (!featureIds.includes(parkingFeatureId)) featureIds.push(parkingFeatureId)
      } else {
        featureIds = featureIds.filter((id) => id !== parkingFeatureId)
      }
    }

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
      const pt = await geocodeAddressForSave(addr, sub, st, pc)
      if (pt) {
        resolvedLat = pt.lat
        resolvedLon = pt.lon
        setLatitude(pt.lat)
        setLongitude(pt.lon)
      }
    }

    const accommodation = normalizeAccommodationForSave(propertyListingType, roomType)
    const qldOnSiteSave = isQldOnSiteBoarderLodgerListing(state.trim(), accommodation.propertyListingType)
    const complianceColumns = showNswFt6600ComplianceSection
      ? ft6600ComplianceColumnsFromFormState(ft6600Compliance)
      : null

    const baseFields: PropertyUpdate & { show_add_another_university?: boolean } = {
      title: t,
      description: description.trim() || null,
      listing_type: null,
      bedrooms: Math.max(0, parseInt(bedrooms, 10) || 0),
      bathrooms: Math.max(0, parseInt(bathrooms, 10) || 0),
      rooms_rented_to_residents: qldOnSiteSave
        ? parseRoomsRentedToResidents(roomsRentedToResidents)
        : null,
      room_type: accommodation.roomType,
      property_type: accommodation.propertyListingType,
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
      max_occupants: maxOcc,
      couple_surcharge_per_week: maxOcc >= 2 && coupleAmt != null && coupleAmt > 0 ? coupleAmt : null,
      parking_surcharge_per_week:
        parkingAvailable && parkingAmt != null && parkingAmt > 0 ? parkingAmt : null,
      parking_available: parkingAvailable,
      bond: bond.trim() ? Number(bond) : null,
      lease_length: leaseLength || null,
      available_from: availableFrom.trim() || null,
      images: images.length ? serializePropertyImages(images) : null,
      house_rules: houseRules.trim() || null,
      service_tier: serviceTier,
      ...(complianceColumns ?? {
            smoke_alarm_type: null,
            smoke_alarm_battery_tenant_replaceable: null,
            smoke_alarm_battery_type: null,
            smoke_alarm_backup_tenant_replaceable: null,
            smoke_alarm_backup_battery_type: null,
            strata_oc_responsible_for_alarms: null,
            water_usage_charged_separately: null,
            electricity_embedded_network: null,
            gas_embedded_network: null,
            strata_bylaws_applicable: null,
          }),
    }

    const complianceSelect =
      'smoke_alarm_type, smoke_alarm_battery_tenant_replaceable, smoke_alarm_battery_type, smoke_alarm_backup_tenant_replaceable, smoke_alarm_backup_battery_type, strata_oc_responsible_for_alarms, water_usage_charged_separately, electricity_embedded_network, gas_embedded_network, strata_bylaws_applicable'

      if (isEdit && propertyId) {
        const { data: updatedRow, error: upErr } = await supabase
          .from('properties')
          .update(baseFields)
          .eq('id', propertyId)
          .select(`university_id, campus_id, furnished, linen_supplied, weekly_cleaning_service, slug, ${complianceSelect}`)
          .single()
        if (upErr) throw upErr
        const persisted = updatedRow as {
          furnished?: boolean | null
          linen_supplied?: boolean | null
          weekly_cleaning_service?: boolean | null
        } & Record<string, unknown> | null
        if (
          persisted &&
          (Boolean(persisted.furnished) !== furnished ||
            Boolean(persisted.linen_supplied) !== linenSupplied ||
            Boolean(persisted.weekly_cleaning_service) !== weeklyCleaning)
        ) {
          throw new Error(
            'Inclusion settings did not persist (linen_supplied / weekly_cleaning_service columns may be missing in Supabase). Run supabase/property_form_extend.sql in the SQL editor, then save again.',
          )
        }
        if (complianceColumns && persisted) {
          for (const [key, expected] of Object.entries(complianceColumns)) {
            const actual = persisted[key] ?? null
            if (expected !== actual) {
              throw new Error(
                `NSW compliance did not persist (${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}). ${FT6600_COMPLIANCE_MIGRATION_HINT}`,
              )
            }
          }
          setFt6600Compliance(
            ft6600ComplianceFormStateFromProperty(
              persisted as Parameters<typeof ft6600ComplianceFormStateFromProperty>[0],
            ),
          )
        }
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
        if (existingListingStatus === 'draft') {
          navigate('/landlord-dashboard', { replace: true })
        } else {
          setSubmitSuccessMessage(
            existingSlug
              ? 'Listing saved, including NSW compliance details. You can keep editing or view the public listing from your dashboard.'
              : 'Listing saved, including NSW compliance details.',
          )
          window.requestAnimationFrame(() => {
            scrollToFormFeedback('listing-form-feedback-bottom')
          })
        }
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
      console.error('[LandlordPropertyFormPage] save failed', err)
      reportSubmitError(submitErrorMessageFromUnknown(err, showNswFt6600ComplianceSection))
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
    <div className="flex min-h-0 w-full min-w-0 max-w-[100vw] flex-1 flex-col bg-[#d4e9e2] pb-16">
      <div className="mx-auto w-full min-w-0 max-w-[1200px] box-border px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-3 min-w-0">
          <UserDashboardBreadcrumb
            segments={userDashboardBreadcrumbs('landlord', {
              label: isEdit ? 'Edit listing' : 'New listing',
            })}
            className="mb-2"
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isEdit ? 'Edit your listing' : 'New listing'}
              </h1>
              {!isEdit ? <p className="text-sm text-gray-500 mt-1">Create a new property on Quni.</p> : null}
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

        <form onSubmit={handleSubmit} noValidate className="min-w-0 max-w-full space-y-8">
          <nav
            className="listing-form-section-nav px-2 py-2 sm:-mx-6 sm:px-6"
            aria-label="Jump to section"
          >
            <div className="flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
              {formNavSections.map(({ id, label }) => {
                const isActive = activeSection === id
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={
                      isActive
                        ? 'shrink-0 rounded-full border border-[#D85A30] bg-[#D85A30] px-3 py-1.5 text-center text-xs font-medium text-white sm:text-sm'
                        : 'shrink-0 rounded-full border border-[#D85A30] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#D85A30] hover:bg-[#D85A30] hover:text-white sm:text-sm'
                    }
                  >
                    {label}
                  </a>
                )
              })}
            </div>
          </nav>
          {/* Reserve space while section pills are position:fixed on mobile */}
          <div className="h-12 max-md:block md:hidden" aria-hidden />

          {submitError && (
            <div
              id="listing-form-feedback-top"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {submitError}
            </div>
          )}

          {submitSuccessMessage && (
            <div
              id="listing-form-feedback-top-success"
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              role="status"
            >
              {submitSuccessMessage}
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
            </div>,
            'section-basic-info',
          )}

          {sectionClass(
            'Property details',
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-800">What is the tenant renting?</p>
                <p className="text-xs text-gray-500">
                  Choose the arrangement that matches your listing. For a room in a share house, enter total bedrooms and
                  bathrooms for the whole property, not just the room you are advertising.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {ACCOMMODATION_UI_OPTIONS.map((opt) => {
                    const selected = accommodationChoice === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => selectAccommodationChoice(opt.value)}
                        className={`rounded-xl border-2 p-4 text-left transition-colors ${
                          selected
                            ? 'border-[#FF6F61] bg-[#FFF8F0] ring-1 ring-[#FF6F61]/20'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                        }`}
                      >
                        <span className="block font-semibold text-gray-900 text-sm">{opt.title}</span>
                        <span className="block text-xs text-gray-600 mt-1">{opt.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {qldOnSiteBoarderLodger ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 space-y-3">
                  <p className="text-sm text-sky-950 leading-relaxed">{qldOnSiteListingCallout()}</p>
                  <div>
                    <label htmlFor="pf-qld-rooms-rented" className={labelClass}>
                      Rooms you rent to residents in this home
                    </label>
                    <p className="text-xs text-gray-600 mt-0.5 mb-1">
                      Include this listing and any other bedrooms you rent to residents while you live on site (max 3
                      for the usual boarder/lodger exemption under s 43).
                    </p>
                    <input
                      id="pf-qld-rooms-rented"
                      type="number"
                      min={1}
                      max={99}
                      required
                      value={roomsRentedToResidents}
                      onChange={(e) => setRoomsRentedToResidents(e.target.value)}
                      className={inputClass}
                    />
                    {qldRoomsRentedError ? (
                      <p className="mt-2 text-sm text-amber-800" role="alert">
                        {qldRoomsRentedError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pf-bed" className={labelClass}>
                    Total bedrooms in the property
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
                    Total bathrooms in the property
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
              {showRoomForRentSelect(accommodationChoice) && (
                <div>
                  <label htmlFor="pf-room" className={labelClass}>
                    Room for rent
                  </label>
                  <select
                    id="pf-room"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as RoomType)}
                    className={inputClass}
                  >
                    {roomForRentOptions(accommodationChoice).map(([v, lab]) => (
                      <option key={v} value={v}>
                        {lab}
                      </option>
                    ))}
                  </select>
                  {accommodationChoice === 'private_room_landlord_off_site' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Choose Studio only if you are listing a self-contained studio room (uncommon for share houses).
                    </p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="pf-rooming-house" className="flex flex-wrap items-center gap-x-2 gap-y-1 cursor-pointer">
                  <span className="inline-flex items-center gap-2">
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
                  </span>
                  <FieldHelpHint label="What is a registered rooming house?">
                    A <strong>registered rooming/boarding house</strong> is a regulated category — not a normal share
                    house. Rules and registration differ by state (e.g. NSW boarding houses, VIC rooming houses, QLD
                    rooming accommodation). Most single-room listings should leave this <strong>unchecked</strong>. Only
                    tick if you have the relevant registration number.
                  </FieldHelpHint>
                </label>
                {showRoomingHouseValidation && roomingHouseErrors.onSiteConflict ? (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {roomingHouseErrors.onSiteConflict}
                  </p>
                ) : null}
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
                    {showRoomingHouseValidation && roomingHouseErrors.missingRegistration ? (
                      <p className="mt-2 text-sm text-red-600" role="alert">
                        {roomingHouseErrors.missingRegistration}
                      </p>
                    ) : null}
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

          {showNswFt6600ComplianceSection
            ? sectionClass(
                'Smoke alarms & compliance (NSW)',
                <LandlordPropertyFt6600ComplianceFields
                  form={ft6600Compliance}
                  onChange={(patch) => setFt6600Compliance((prev) => ({ ...prev, ...patch }))}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />,
                'section-ft6600-compliance',
              )
            : null}

          {sectionClass(
            'House rules',
            <div className="space-y-6">
              <div className="space-y-2">
                {houseRulesRef.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-1"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-700">
                      <span className="shrink-0 text-base" aria-hidden>
                        {r.icon}
                      </span>
                      <span className="min-w-0 flex-1">{r.name}</span>
                    </span>
                    <select
                      aria-label={`${r.name} permitted`}
                      value={selectedRules[r.id] ?? ''}
                      onChange={(e) => setRulePermitted(r.id, e.target.value)}
                      className="w-28 max-w-[7rem] shrink-0 rounded-md border border-gray-200 px-2 py-0.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#D85A30]"
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
              <p className="text-xs text-gray-600 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 leading-relaxed">
                This is the <strong>property</strong> address (where the tenant will live). On your public listing we only
                show <strong>suburb and state</strong> until a booking is confirmed — never the full street line to
                casual browsers.
              </p>
              <div>
                <label htmlFor="pf-addr" className={labelClass}>
                  Street address
                </label>
                <input
                  id="pf-addr"
                  value={address}
                  onChange={(e) => {
                    addressDirtyRef.current = true
                    setAddress(e.target.value)
                  }}
                  className={inputClass}
                  placeholder="e.g. Unit 401, 311 Hume Highway"
                  autoComplete="street-address"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include your unit if you have one (e.g. Unit 406, 311 Hume Highway). Nearby campuses use the
                  street address; the unit is still saved on your listing.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="sm:col-span-2 max-sm:col-span-1">
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
            'Description',
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-desc" className={labelClass}>
                  Listing description
                </label>
                <textarea
                  id="pf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className={inputClass}
                  placeholder="Describe the room or home the tenant will rent — not only the whole building."
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
            'section-description',
          )}

          {sectionClass(
            'Pricing & availability',
            <div className="space-y-4">
              <div>
                <p className={labelClass}>Quni service model</p>
                <p className="mb-3 text-xs text-gray-500">
                  {managedTierEnabled
                    ? 'Choose how this property runs. Listing is self-managed; Managed can be selected now or upgraded later, but Managed properties cannot move back to Listing.'
                    : MANAGED_LANDLORD_PROPERTY_FORM_HINT}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {(['listing', 'managed'] as const).map((tier) => {
                    const selected = serviceTier === tier
                    const managedComingSoon = tier === 'managed' && !managedTierEnabled
                    const available =
                      tier === 'listing' ? listingTierAvailable : managedTierAvailable && !managedComingSoon
                    const locked = isEdit && !canSwitchPropertyServiceTier(initialServiceTier, tier)
                    const disabled = !available || locked || managedComingSoon
                    const description =
                      tier === 'listing'
                        ? 'You receive the renter lead, then handle bond, rent, maintenance, and disputes directly.'
                        : 'Quni handles the managed tenancy workflow, including rent collection where available.'
                    const unavailableCopy =
                      managedComingSoon
                        ? MANAGED_COMING_SOON_SHORT
                        : tier === 'listing'
                          ? 'Listing is not available for this property.'
                          : locked
                            ? 'Managed is permanent for this property.'
                            : managedTierUnavailableReason
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled || selected) return
                          if (
                            isEdit &&
                            initialServiceTier === 'listing' &&
                            tier === 'managed' &&
                            !window.confirm(
                              'Switch this property to Quni Managed? This cannot be changed back to Quni Listing.',
                            )
                          ) {
                            return
                          }
                          setServiceTier(tier)
                        }}
                        className={[
                          'rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40 disabled:cursor-not-allowed',
                          selected
                            ? 'border-[#FF6F61] bg-[#FF6F61]/5 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-[#FF6F61]/40',
                          disabled && !selected ? 'opacity-60 hover:border-gray-200' : '',
                        ].join(' ')}
                      >
                        <span className="block text-sm font-semibold text-gray-900">
                          {landlordServiceTierTitle(tier)}
                          {managedComingSoon ? (
                            <span className="ml-2 inline-flex rounded-full bg-[#E8EFE3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#376256]">
                              Coming soon
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-gray-600">{description}</span>
                        <span className="mt-3 block text-[11px] font-medium text-gray-500">
                          {available && !locked
                            ? selected
                              ? 'Selected for this property'
                              : tier === 'listing'
                                ? 'One-off Listing fee is only charged when you accept a booking.'
                                : 'Full managed service for this property.'
                            : unavailableCopy}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {serviceTier === 'listing' ? (
                  <p className="mt-3 rounded-lg border border-[#E8EFE3] bg-[#F7FAF5] px-3 py-2.5 text-xs leading-relaxed text-gray-700">
                    {LISTING_TIER_ADDRESS_ON_LEASE_NOTICE}
                  </p>
                ) : null}
                {serviceTier === 'managed' && initialServiceTier === 'listing' && isEdit ? (
                  <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Saving will permanently switch this property to Quni Managed for this and future booking requests.
                  </p>
                ) : null}
              </div>
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
                {tierPricingError ? (
                  <p className="mt-2 text-xs text-amber-800/90" role="status">
                    {tierPricingError} Tier estimates are unavailable until pricing loads.
                  </p>
                ) : null}
                {weeklyRentNum != null &&
                weeklyRentNum > 0 &&
                tierPricingListing &&
                tierPricingManaged ? (
                  <div className="mt-3 rounded-xl border border-gray-200/90 bg-stone-50/90 px-3 py-3 text-xs text-gray-700 leading-relaxed shadow-sm">
                    <p className="font-semibold text-gray-900">
                      At{' '}
                      <span className="tabular-nums">
                        ${weeklyRentNum.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                      </span>
                      /week (listed rent), indicative payouts by tier:
                    </p>
                    <ul className="mt-2 list-none space-y-2 pl-0">
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6F61]/80" aria-hidden />
                        <span>
                          <strong className="text-gray-900">Quni Listing:</strong>{' '}
                          <span className="tabular-nums">
                            ${weeklyRentNum.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                          </span>
                          /week from rent. Quni charges{' '}
                          <span className="tabular-nums">{formatListingTierAcceptanceFee(tierPricingListing)}</span> once
                          when a booking is accepted.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6F61]/80" aria-hidden />
                        <span>
                          <strong className="text-gray-900">Quni Managed:</strong>{' '}
                          {(() => {
                            const net = landlordNetWeeklyAfterManagedFee(weeklyRentNum, tierPricingManaged)
                            const feeDisp = formatFeeForDisplay(tierPricingManaged).landlordFeeDisplay
                            return net != null ? (
                              <>
                                <span className="tabular-nums">
                                  ${net.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                                /week after {feeDisp} service fee (deducted before payout). All-inclusive for this tier —
                                no separate acceptance fee.
                              </>
                            ) : (
                              <>Managed payout estimate unavailable for this rent.</>
                            )
                          })()}
                        </span>
                      </li>
                    </ul>
                    <p className="mt-2 text-[11px] text-gray-500 leading-snug">
                      This property is set to {landlordServiceTierTitle(serviceTier)}. Listing can be upgraded to
                      Managed later; Managed cannot be changed back to Listing.
                    </p>
                    {tierPricingLockedForListing ? (
                      <p className="mt-2 text-[11px] text-amber-900/85 leading-snug rounded-lg bg-amber-50/90 border border-amber-100 px-2 py-2">
                        These fee rates are locked for this listing when it was created. Contact support if they need to be updated.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-gray-200/90 bg-stone-50/60 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Occupancy &amp; optional extras</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Base rent above is for one person. Add surcharges if rent is higher for a couple or optional
                    carpark at booking.
                  </p>
                </div>
                <div>
                  <label htmlFor="pf-max-occupants" className={labelClass}>
                    Max people in this room
                  </label>
                  <select
                    id="pf-max-occupants"
                    value={maxOccupants}
                    onChange={(e) => {
                      setMaxOccupants(e.target.value)
                      if (e.target.value === '1') setCoupleSurchargePerWeek('')
                    }}
                    className={inputClass}
                  >
                    <option value="1">1 person</option>
                    <option value="2">2 people (e.g. couple)</option>
                  </select>
                </div>
                {maxOccupants !== '1' ? (
                  <div>
                    <label htmlFor="pf-couple-surcharge" className={labelClass}>
                      Extra per week for 2 people ($)
                    </label>
                    <input
                      id="pf-couple-surcharge"
                      type="number"
                      min={0}
                      step={1}
                      value={coupleSurchargePerWeek}
                      onChange={(e) => setCoupleSurchargePerWeek(e.target.value)}
                      placeholder="e.g. 100"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Added to base rent when a student books for two occupants.
                    </p>
                  </div>
                ) : null}
                <div className="flex items-start gap-2">
                  <input
                    id="pf-parking-available"
                    type="checkbox"
                    checked={parkingAvailable}
                    onChange={(e) => setParkingAvailableWithFeature(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]/40"
                  />
                  <label htmlFor="pf-parking-available" className="text-sm text-gray-700 leading-snug">
                    <span className="font-medium text-gray-900">Carpark available</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Students can add carpark at booking. Also ticks Parking in amenities when saved.
                    </span>
                  </label>
                </div>
                {parkingAvailable ? (
                  <div>
                    <label htmlFor="pf-parking-surcharge" className={labelClass}>
                      Carpark surcharge per week ($)
                    </label>
                    <input
                      id="pf-parking-surcharge"
                      type="number"
                      min={0}
                      step={1}
                      value={parkingSurchargePerWeek}
                      onChange={(e) => setParkingSurchargePerWeek(e.target.value)}
                      placeholder="e.g. 50"
                      className={inputClass}
                    />
                  </div>
                ) : null}
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
                {bondSuggestedMaxWeeklyRent != null ? (
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                    NSW residential bonds are often up to 4 weeks&apos; rent. At maximum occupancy and extras, that
                    could be up to{' '}
                    <span className="tabular-nums font-medium text-gray-700">
                      ${(bondSuggestedMaxWeeklyRent * 4).toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                    </span>{' '}
                    (4 × ${bondSuggestedMaxWeeklyRent.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                    /week).
                  </p>
                ) : null}
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
              <p className="text-xs text-gray-500">Up to {MAX_IMAGES} images, max 5MB each.</p>
              <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImage || images.length >= MAX_IMAGES}
                onChange={(e) => void onPickImages(e.target.files)}
                className="block text-sm text-gray-600"
              />
              {images.length >= MAX_IMAGES ? (
                <p className="text-xs text-gray-500">Maximum of {MAX_IMAGES} photos reached.</p>
              ) : null}
              {uploadingImage && <p className="text-xs text-gray-500">Uploading…</p>}
              {photoUploadError ? (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                  {photoUploadError}
                </p>
              ) : null}
              <PropertyPhotoReorderGrid
                images={images}
                onChange={setImages}
                onRemove={(url) => void removeImage(url)}
                disabled={uploadingImage}
              />
            </div>,
            'section-photos',
          )}

          <div className="flex flex-col gap-3">
            <div id="listing-form-feedback-bottom" className="space-y-3">
              {submitError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                  {submitError}
                </div>
              ) : null}
              {submitSuccessMessage ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                  {submitSuccessMessage}
                </div>
              ) : null}
            </div>
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
