import type { Database } from './database.types'

/** Matches DB check on `properties.room_type` */
export type RoomType = 'single' | 'shared' | 'studio' | 'apartment' | 'house'

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Single room',
  shared: 'Shared room',
  studio: 'Studio',
  apartment: 'Apartment',
  house: 'House',
}

/** Short labels for compact UI (e.g. property hero stats). */
export const ROOM_TYPE_SHORT_LABELS: Record<RoomType, string> = {
  single: 'Single',
  shared: 'Shared',
  studio: 'Studio',
  apartment: 'Apartment',
  house: 'House',
}

export type University = Database['public']['Tables']['universities']['Row']

/** Shape returned by the Listings Supabase select (embedded FKs are singular objects) */
type FeaturePick = Pick<Database['public']['Tables']['features']['Row'], 'id' | 'name' | 'icon'>
type HouseRulesRefPick = Pick<Database['public']['Tables']['house_rules_ref']['Row'], 'id' | 'name' | 'icon'>

export type Property = Database['public']['Tables']['properties']['Row'] & {
  landlord_profiles: Pick<
    Database['public']['Tables']['landlord_profiles']['Row'],
    'id' | 'full_name' | 'avatar_url' | 'verified'
  > | null
  universities: Pick<Database['public']['Tables']['universities']['Row'], 'id' | 'name' | 'slug'> | null
  campuses: Pick<Database['public']['Tables']['campuses']['Row'], 'id' | 'name' | 'slug'> | null
  property_features?: { features: FeaturePick | null }[] | null
  property_house_rules?: {
    permitted: string
    rule_id: string
    house_rules_ref: HouseRulesRefPick | null
  }[] | null
}

export const LISTINGS_SORT_OPTIONS = [
  { value: 'rent_asc', label: 'Price: Low to High' },
  { value: 'rent_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
] as const

export type ListingsSort = (typeof LISTINGS_SORT_OPTIONS)[number]['value']

/** Weekly rent bucket → [min, max] for Supabase filters */
export function priceRangeFromBucket(value: string): [number, number] {
  switch (value) {
    case '0-200':
      return [0, 200]
    case '200-300':
      return [200, 300]
    case '300-400':
      return [300, 400]
    case '400+':
      return [400, 99_999]
    default:
      return [0, 99_999]
  }
}

/** Escape `%`, `_`, `\` for PostgREST `ilike`; strip `,` so `.or()` clauses stay valid */
export function escapeIlikePattern(raw: string) {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
}

export function isRoomType(value: string): value is RoomType {
  return Object.prototype.hasOwnProperty.call(ROOM_TYPE_LABELS, value)
}

/** Listing / bond context for bookings (`properties.property_type`) */
export type PropertyListingType =
  | 'entire_property'
  | 'private_room_landlord_off_site'
  | 'private_room_landlord_on_site'
  | 'shared_room'

export const PROPERTY_LISTING_TYPE_LABELS: Record<PropertyListingType, string> = {
  entire_property: 'Entire property — House, apartment or unit (landlord does not live on site)',
  private_room_landlord_off_site: 'Private room — landlord not on site — Room in a property, landlord lives elsewhere',
  private_room_landlord_on_site:
    'Private room — landlord lives on site — Room in landlord\'s own home (boarder/lodger arrangement)',
  shared_room: 'Shared room — Shared bedroom with other tenants',
}

export function isPropertyListingType(value: string): value is PropertyListingType {
  return Object.prototype.hasOwnProperty.call(PROPERTY_LISTING_TYPE_LABELS, value)
}

/**
 * Bond / RTA copy: boarding, lodger, or homestay-style arrangements where the landlord typically
 * lives on site — bond is not lodged with NSW Fair Trading as an RTA bond.
 *
 * Uses `properties.property_type` (listing mode) plus `properties.listing_type === 'homestay'`
 * for legacy or alternate data. Unknown / null `property_type` defaults to standard rental
 * unless `listing_type` is homestay.
 */
const BOARDING_LODGER_PROPERTY_TYPE_VALUES = new Set<string>([
  'private_room_landlord_on_site',
  'boarding',
  'lodger',
  'homestay',
])

export function isBoardingLodgerBondContext(
  propertyType: string | null | undefined,
  listingType: string | null | undefined,
): boolean {
  if (listingType === 'homestay') return true
  const pt = typeof propertyType === 'string' ? propertyType.trim() : ''
  if (!pt) return false
  return BOARDING_LODGER_PROPERTY_TYPE_VALUES.has(pt)
}
