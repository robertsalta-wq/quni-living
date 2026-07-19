import { useMemo, useState } from 'react'
import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import ListingBasicInfoDrillIn, {
  type ListingBasicInfoValues,
} from '../../components/landlord/listingHub/ListingBasicInfoDrillIn'
import ListingHealthHub from '../../components/landlord/listingHub/ListingHealthHub'
import { useListingHubProperty } from '../../hooks/useListingHubProperty'
import {
  computeListingHubHealth,
  listingHubPath,
  type ListingHubHealthInput,
} from '../../lib/listingEditHubHealth'
import {
  patchLandlordPropertyDraftBasic,
  readLandlordPropertyDraftRaw,
  readListingHeadline,
  writeListingHeadline,
} from '../../lib/listingHubDraft'
import type { PropertyListingType, RoomType } from '../../lib/listings'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

type PropertyUpdate = Database['public']['Tables']['properties']['Update']

function statusLabelFrom(
  status: string | null | undefined,
  isNew: boolean,
): 'Active' | 'Draft' | 'Inactive' | 'Pending' | 'Suspended' {
  if (isNew) return 'Draft'
  if (status === 'active') return 'Active'
  if (status === 'inactive') return 'Inactive'
  if (status === 'pending') return 'Pending'
  if (status === 'suspended') return 'Suspended'
  return 'Draft'
}

function healthFromDraft(): ListingHubHealthInput {
  const d = readLandlordPropertyDraftRaw()
  if (!d) {
    return {
      title: '',
      propertyType: null,
      roomType: null,
      isRegisteredRoomingHouse: false,
      bedrooms: null,
      bathrooms: null,
      furnished: false,
      linenSupplied: false,
      weeklyCleaning: false,
      featureCount: 0,
      houseRulesText: '',
      selectedRulesCount: 0,
      address: '',
      suburb: '',
      state: '',
      postcode: '',
      description: '',
      rentPerWeek: 0,
      availableFrom: '',
      images: [],
      status: 'draft',
    }
  }
  const rent = typeof d.rentPerWeek === 'string' ? Number(d.rentPerWeek) : 0
  const beds = typeof d.bedrooms === 'string' ? Number(d.bedrooms) : null
  const baths = typeof d.bathrooms === 'string' ? Number(d.bathrooms) : null
  const rules =
    d.selectedRules && typeof d.selectedRules === 'object'
      ? Object.keys(d.selectedRules as object).length
      : 0
  return {
    title: typeof d.title === 'string' ? d.title : '',
    propertyType: typeof d.propertyListingType === 'string' ? d.propertyListingType : null,
    roomType: typeof d.roomType === 'string' ? d.roomType : null,
    isRegisteredRoomingHouse: Boolean(d.isRegisteredRoomingHouse),
    bedrooms: Number.isFinite(beds) ? beds : null,
    bathrooms: Number.isFinite(baths) ? baths : null,
    furnished: Boolean(d.furnished),
    linenSupplied: Boolean(d.linenSupplied),
    weeklyCleaning: Boolean(d.weeklyCleaning),
    featureCount: Array.isArray(d.selectedFeatureIds) ? d.selectedFeatureIds.length : 0,
    houseRulesText: typeof d.houseRules === 'string' ? d.houseRules : '',
    selectedRulesCount: rules,
    address: typeof d.address === 'string' ? d.address : '',
    suburb: typeof d.suburb === 'string' ? d.suburb : '',
    state: typeof d.state === 'string' ? d.state : '',
    postcode: typeof d.postcode === 'string' ? d.postcode : '',
    description: typeof d.description === 'string' ? d.description : '',
    rentPerWeek: Number.isFinite(rent) ? rent : 0,
    availableFrom: typeof d.availableFrom === 'string' ? d.availableFrom : '',
    images: Array.isArray(d.images) ? (d.images as string[]) : [],
    status: 'draft',
  }
}

/**
 * Listing health hub + Basic info drill-in.
 * Other section cards deep-link into LandlordPropertyFormPage section routes.
 */
export default function LandlordListingEditHubPage() {
  const { user } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ id?: string; sectionId?: string }>()

  const propertyId = useMemo(() => {
    const m = matchPath({ path: '/landlord/property/edit/:id/*', end: false }, location.pathname)
    return m?.params.id ?? params.id ?? null
  }, [location.pathname, params.id])

  const isBasic = Boolean(
    matchPath({ path: '/landlord/property/edit/:id/basic', end: true }, location.pathname) ||
      matchPath({ path: '/landlord/property/new/basic', end: true }, location.pathname),
  )

  const { loading, error, property, health: remoteHealth, reload } = useListingHubProperty(propertyId)

  const [draftTick, setDraftTick] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const draftHealth = useMemo(() => {
    void draftTick
    return computeListingHubHealth(healthFromDraft(), { isNewListing: true })
  }, [draftTick])

  const health = propertyId ? remoteHealth : draftHealth

  const listingName = propertyId
    ? property?.title?.trim() || 'Untitled listing'
    : (() => {
        const d = readLandlordPropertyDraftRaw()
        const t = typeof d?.title === 'string' ? d.title.trim() : ''
        return t || 'Untitled listing'
      })()

  const statusLabel = statusLabelFrom(property?.status, !propertyId)
  const previewHref =
    property?.slug && property.status === 'active' ? `/properties/${property.slug}` : null

  const basicInitial: ListingBasicInfoValues = useMemo(() => {
    if (property) {
      return {
        title: property.title,
        headline: readListingHeadline(property.id),
        availableFrom: property.availableFrom?.slice(0, 10) ?? '',
        openToNonStudents: property.openToNonStudents,
        propertyListingType: (property.propertyType as PropertyListingType) || 'entire_property',
        roomType: (property.roomType as RoomType | '') || 'apartment',
        isRegisteredRoomingHouse: property.isRegisteredRoomingHouse,
      }
    }
    const d = readLandlordPropertyDraftRaw()
    return {
      title: typeof d?.title === 'string' ? d.title : '',
      headline: readListingHeadline(null),
      availableFrom: typeof d?.availableFrom === 'string' ? d.availableFrom.slice(0, 10) : '',
      openToNonStudents: Boolean(d?.openToNonStudents),
      propertyListingType:
        typeof d?.propertyListingType === 'string'
          ? (d.propertyListingType as PropertyListingType)
          : 'entire_property',
      roomType: typeof d?.roomType === 'string' ? (d.roomType as RoomType | '') : 'apartment',
      isRegisteredRoomingHouse: Boolean(d?.isRegisteredRoomingHouse),
    }
  }, [property, draftTick])

  async function saveBasic(values: ListingBasicInfoValues, intent: 'save' | 'draft' | 'next') {
    setSaving(true)
    setSaveError(null)
    try {
      writeListingHeadline(propertyId, values.headline)

      if (!propertyId) {
        patchLandlordPropertyDraftBasic({
          title: values.title,
          headline: values.headline,
          availableFrom: values.availableFrom,
          openToNonStudents: values.openToNonStudents,
          propertyListingType: values.propertyListingType,
          roomType: values.roomType || 'apartment',
          isRegisteredRoomingHouse: values.isRegisteredRoomingHouse,
        })
        setDraftTick((n) => n + 1)
        if (intent === 'next') {
          navigate(listingHubPath({ propertyId: null, view: 'property' }))
        } else {
          navigate(listingHubPath({ propertyId: null }))
        }
        return
      }

      if (!user) throw new Error('You must be signed in to save.')

  // When clearing rooming house, null the registration number; otherwise leave it alone.
      const patch: PropertyUpdate = {
        title: values.title,
        available_from: values.availableFrom.trim() || null,
        open_to_non_students: values.openToNonStudents,
        property_type: values.propertyListingType,
        room_type: values.roomType || null,
        is_registered_rooming_house: values.isRegisteredRoomingHouse,
        ...(values.isRegisteredRoomingHouse
          ? {}
          : { rooming_house_registration_number: null }),
      }

      const { error: upErr } = await supabase.from('properties').update(patch).eq('id', propertyId)
      if (upErr) throw upErr

      await reload()

      if (intent === 'next') {
        navigate(listingHubPath({ propertyId, view: 'property' }))
      } else {
        navigate(listingHubPath({ propertyId }))
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save Basic info.')
    } finally {
      setSaving(false)
    }
  }

  if (propertyId && loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--quni-surface-2)] p-8 text-sm text-[var(--quni-ink-4)]">
        Loading listing…
      </div>
    )
  }

  if (propertyId && error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--quni-surface-2)] p-8 text-center">
        <p className="text-sm text-[var(--quni-danger-fg)]">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/landlord/dashboard?tab=listings')}
          className="rounded-lg bg-[var(--quni-coral)] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to listings
        </button>
      </div>
    )
  }

  if (isBasic) {
    return (
      <ListingBasicInfoDrillIn
        propertyId={propertyId}
        isSetupMode={health.isSetupMode}
        initial={basicInitial}
        saving={saving}
        error={saveError}
        onSave={saveBasic}
        onCancel={() => navigate(listingHubPath({ propertyId }))}
      />
    )
  }

  return (
    <ListingHealthHub
      propertyId={propertyId}
      listingName={listingName}
      thumbUrl={property?.thumbUrl ?? null}
      statusLabel={statusLabel}
      health={health}
      previewHref={previewHref}
    />
  )
}
