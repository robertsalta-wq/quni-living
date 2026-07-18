import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import {
  computeListingHubHealth,
  type ListingHubHealthInput,
  type ListingHubHealthResult,
} from '../lib/listingEditHubHealth'
import { firstPropertyImageUrl } from '../lib/propertyImages'

type PropertyRow = Database['public']['Tables']['properties']['Row']

export type ListingHubPropertySnapshot = {
  id: string
  title: string
  slug: string | null
  status: PropertyRow['status']
  images: string[] | null
  propertyType: string | null
  roomType: string | null
  isRegisteredRoomingHouse: boolean
  bedrooms: number | null
  bathrooms: number | null
  furnished: boolean | null
  linenSupplied: boolean | null
  weeklyCleaning: boolean | null
  featureCount: number
  houseRulesText: string | null
  selectedRulesCount: number
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  description: string | null
  rentPerWeek: number | null
  availableFrom: string | null
  openToNonStudents: boolean
  thumbUrl: string | null
}

function toHealthInput(p: ListingHubPropertySnapshot | null): ListingHubHealthInput {
  if (!p) {
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
  return {
    title: p.title,
    propertyType: p.propertyType,
    roomType: p.roomType,
    isRegisteredRoomingHouse: p.isRegisteredRoomingHouse,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    furnished: p.furnished,
    linenSupplied: p.linenSupplied,
    weeklyCleaning: p.weeklyCleaning,
    featureCount: p.featureCount,
    houseRulesText: p.houseRulesText,
    selectedRulesCount: p.selectedRulesCount,
    address: p.address,
    suburb: p.suburb,
    state: p.state,
    postcode: p.postcode,
    description: p.description,
    rentPerWeek: p.rentPerWeek,
    availableFrom: p.availableFrom,
    images: p.images,
    status: p.status,
  }
}

function mapRow(
  prop: PropertyRow & {
    property_features?: { feature_id: string }[] | null
    property_house_rules?: { rule_id: string }[] | null
  },
): ListingHubPropertySnapshot {
  return {
    id: prop.id,
    title: prop.title,
    slug: prop.slug,
    status: prop.status,
    images: prop.images,
    propertyType: prop.property_type,
    roomType: prop.room_type,
    isRegisteredRoomingHouse: Boolean(prop.is_registered_rooming_house),
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    furnished: prop.furnished,
    linenSupplied: prop.linen_supplied,
    weeklyCleaning: prop.weekly_cleaning_service,
    featureCount: prop.property_features?.length ?? 0,
    houseRulesText: prop.house_rules,
    selectedRulesCount: prop.property_house_rules?.length ?? 0,
    address: prop.address,
    suburb: prop.suburb,
    state: prop.state,
    postcode: prop.postcode,
    description: prop.description,
    rentPerWeek: prop.rent_per_week,
    availableFrom: prop.available_from,
    openToNonStudents: Boolean(prop.open_to_non_students),
    thumbUrl: firstPropertyImageUrl(prop.images),
  }
}

export function useListingHubProperty(propertyId: string | null) {
  const [loading, setLoading] = useState(Boolean(propertyId))
  const [error, setError] = useState<string | null>(null)
  const [property, setProperty] = useState<ListingHubPropertySnapshot | null>(null)

  const reload = useCallback(async () => {
    if (!propertyId) {
      setProperty(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('properties')
      .select(
        '*, property_features(feature_id), property_house_rules(rule_id)',
      )
      .eq('id', propertyId)
      .maybeSingle()
    if (qErr) {
      setError(qErr.message)
      setProperty(null)
      setLoading(false)
      return
    }
    if (!data) {
      setError('Listing not found.')
      setProperty(null)
      setLoading(false)
      return
    }
    setProperty(mapRow(data as Parameters<typeof mapRow>[0]))
    setLoading(false)
  }, [propertyId])

  useEffect(() => {
    void reload()
  }, [reload])

  const health: ListingHubHealthResult = useMemo(
    () => computeListingHubHealth(toHealthInput(property), { isNewListing: !propertyId }),
    [property, propertyId],
  )

  return { loading, error, property, health, reload, setProperty }
}
