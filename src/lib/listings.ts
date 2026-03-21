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

export type University = Database['public']['Tables']['universities']['Row']

/** Shape returned by the Listings Supabase select (embedded FKs are singular objects) */
export type Property = Database['public']['Tables']['properties']['Row'] & {
  landlord_profiles: Pick<
    Database['public']['Tables']['landlord_profiles']['Row'],
    'id' | 'full_name' | 'avatar_url' | 'verified'
  > | null
  universities: Pick<Database['public']['Tables']['universities']['Row'], 'id' | 'name' | 'slug'> | null
  campuses: Pick<Database['public']['Tables']['campuses']['Row'], 'id' | 'name'> | null
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
