import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListingContext } from './chatTypes'
import { buildStudentListingContextBlock } from './buildListingContextBlock'

const MAX_LISTING_IDS = 8

const baseColumns = [
  'id',
  'title',
  'slug',
  'rent_per_week',
  'room_type',
  'suburb',
  'state',
  'furnished',
  'linen_supplied',
  'weekly_cleaning_service',
  'bedrooms',
  'bathrooms',
  'bond',
  'lease_length',
  'available_from',
  'featured',
  'created_at',
]

const embed = `,
  landlord_profiles ( id, full_name, verified ),
  universities ( id, name, slug ),
  campuses ( id, name, slug ),
  property_features ( features ( name, icon ) )
`

const propsSelectWithDistance = [...baseColumns, 'distance_to_campus_km'].join(', ') + embed
const propsSelectWithoutDistance = baseColumns.join(', ') + embed

function clampIds(ids: string[] | undefined, max: number): string[] {
  if (!ids?.length) return []
  return ids.filter((x) => x.trim()).slice(0, max)
}

/**
 * Loads listing facts via the browser Supabase client (RLS) for student_renter chat.
 */
export async function fetchListingContextBlockForChat(
  supabase: SupabaseClient,
  listingContext: ListingContext | undefined,
): Promise<string> {
  if (!listingContext) return 'No listing context was provided.'

  const propertyId = typeof listingContext.propertyId === 'string' ? listingContext.propertyId.trim() : ''
  const listingIds = clampIds(listingContext.listingIds, MAX_LISTING_IDS)

  const listingFilterPropertyId = propertyId ? { field: 'id' as const, value: propertyId } : null
  const listingFilterIn =
    !listingFilterPropertyId && listingIds.length > 0 ? { field: 'id' as const, value: listingIds } : null

  if (!listingFilterPropertyId && !listingFilterIn) {
    return 'No listing context was provided.'
  }

  let propertiesRows: Array<Record<string, unknown>> = []

  let q = supabase.from('properties').select(propsSelectWithDistance)
  if (listingFilterPropertyId) {
    q = q.eq(listingFilterPropertyId.field, listingFilterPropertyId.value)
  } else if (listingFilterIn) {
    q = q.in(listingFilterIn.field, listingFilterIn.value)
  }

  const { data, error } = await q.limit(MAX_LISTING_IDS)

  if (!error && data) {
    propertiesRows = data as unknown as Array<Record<string, unknown>>
  } else if (error && String(error.message).includes('distance_to_campus_km')) {
    let q2 = supabase.from('properties').select(propsSelectWithoutDistance)
    if (listingFilterPropertyId) {
      q2 = q2.eq(listingFilterPropertyId.field, listingFilterPropertyId.value)
    } else if (listingFilterIn) {
      q2 = q2.in(listingFilterIn.field, listingFilterIn.value)
    }
    const { data: data2, error: error2 } = await q2.limit(MAX_LISTING_IDS)
    if (error2) return 'No listing context was provided.'
    propertiesRows = (data2 ?? []) as unknown as Array<Record<string, unknown>>
  } else {
    return 'No listing context was provided.'
  }

  return buildStudentListingContextBlock(propertiesRows)
}
