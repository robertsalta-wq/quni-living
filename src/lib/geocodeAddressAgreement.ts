import { buildGeocodeQueryCandidates } from './normalizeAustralianAddressForGeocode'

/** Shown when Nominatim returns a point that is not the suburb, postcode, and state entered. */
export const ADDRESS_NOT_MATCHED_MESSAGE =
  "We couldn't match this address, check the suburb and postcode"

/** Shown when the only agreeing hit is a suburb or town centroid, not a street or house. */
export const SUBURB_ONLY_MATCH_MESSAGE = "We matched the suburb, not the exact street"

/** Shown under the address after a field changes once a search or a saved address exists. */
export const ADDRESS_CHANGED_FIND_AGAIN_MESSAGE = "Address changed. Find nearby campuses again."

/** Shown when a campus the landlord chose is still selected after the address changes. */
export const CAMPUS_CHECK_AFTER_ADDRESS_CHANGE_MESSAGE =
  "You changed the address. Check this campus is still right."

/** Shown after save runs a search and is waiting for the landlord to look at the campuses. */
export const CHECK_CAMPUSES_THEN_SAVE_MESSAGE = "Check the nearby campuses, then save again."

/** Shown when save is pressed from a step that does not show the address. */
export const FIND_CAMPUSES_ON_LOCATION_STEP_MESSAGE =
  "Find nearby campuses on the Location step before saving."

export type GeocoderLocality = {
  suburb?: string | null
  town?: string | null
  village?: string | null
  hamlet?: string | null
  locality?: string | null
  cityDistrict?: string | null
  municipality?: string | null
  city?: string | null
  postcode?: string | null
  state?: string | null
  stateCode?: string | null
}

/** Nominatim `class`, `type`, and `addresstype` from the same search we already run. */
export type GeocoderResultKind = {
  resultClass?: string | null
  resultType?: string | null
  addressType?: string | null
}

export type GeocodeMatchPrecision = 'street' | 'suburb'

export type AgreedGeocodeHit = {
  lat: number
  lon: number
  address: GeocoderLocality
  kind?: GeocoderResultKind | null
}

export type AgreedGeocodeResult =
  | { ok: true; lat: number; lon: number; precision: GeocodeMatchPrecision }
  | { ok: false; reason: 'not_found' | 'mismatch' }

/**
 * Whether this save can write the listing, must show campuses first, or can treat
 * the campuses already on screen as the confirmation.
 */
export type CampusSaveSearchDecision = 'save' | 'search' | 'confirm'

/** none: nothing chosen yet. auto: the form picked the nearest. landlord: they picked. saved: loaded from a listing. */
export type CampusSelectionSource = 'none' | 'auto' | 'landlord' | 'saved'

const STATE_BY_NAME: Record<string, string> = {
  'new south wales': 'NSW',
  victoria: 'VIC',
  queensland: 'QLD',
  'western australia': 'WA',
  'south australia': 'SA',
  tasmania: 'TAS',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
}

const SPECIFIC_LOCALITY_KEYS = ['suburb', 'town', 'village', 'hamlet', 'locality', 'cityDistrict'] as const

/** Nominatim types that mean a house or a road, not a suburb centroid. */
const STREET_RESULT_TYPES = new Set([
  'house',
  'building',
  'apartments',
  'residential',
  'yes',
  'address',
  'commercial',
  'retail',
  'industrial',
  'farm',
  'terrace',
  'semidetached_house',
  'detached',
  'road',
  'street',
  'pedestrian',
  'living_street',
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'service',
  'track',
  'footway',
  'path',
])

/**
 * A house or road result means the street was found. A suburb, town, postcode, or
 * missing type is only a centroid. No second geocoder.
 */
export function geocodeMatchPrecision(kind: GeocoderResultKind | null | undefined): GeocodeMatchPrecision {
  const resultClass = (kind?.resultClass ?? '').trim().toLowerCase()
  const resultType = (kind?.addressType || kind?.resultType || '').trim().toLowerCase()
  if (resultClass === 'building' || resultClass === 'highway') return 'street'
  if (STREET_RESULT_TYPES.has(resultType)) return 'street'
  return 'suburb'
}

export function normalizePlaceName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeAustralianPostcode(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return null
  const padded = digits.padStart(4, '0')
  return padded.length === 4 ? padded : null
}

export function stateCodeFromGeocoder(found: GeocoderLocality): string | null {
  const iso = (found.stateCode ?? '').trim().toUpperCase()
  const isoMatch = iso.match(/^AU-([A-Z]{2,3})$/)
  if (isoMatch) return isoMatch[1]
  const named = STATE_BY_NAME[normalizePlaceName(found.state)]
  if (named) return named
  const raw = (found.state ?? '').trim().toUpperCase()
  return raw.length >= 2 && raw.length <= 3 ? raw : null
}

/**
 * True when the geocoder's locality is the suburb, postcode, and state the landlord entered.
 * A city such as Sydney does not count when a finer suburb was returned.
 */
export function geocodeAgreesWithEnteredAddress(
  entered: { suburb: string; postcode: string; state: string },
  found: GeocoderLocality,
): boolean {
  const postcode = normalizeAustralianPostcode(entered.postcode)
  const foundPostcode = normalizeAustralianPostcode(found.postcode)
  if (!postcode || postcode !== foundPostcode) return false

  const enteredState = entered.state.trim().toUpperCase()
  const foundState = stateCodeFromGeocoder(found)
  if (!enteredState || !foundState || enteredState !== foundState) return false

  const wanted = normalizePlaceName(entered.suburb)
  if (!wanted) return false
  const specific = SPECIFIC_LOCALITY_KEYS.map((key) => normalizePlaceName(found[key])).filter(Boolean)
  if (specific.length > 0) return specific.includes(wanted)
  const broad = [found.municipality, found.city].map((value) => normalizePlaceName(value)).filter(Boolean)
  return broad.includes(wanted)
}

/**
 * Use the first query whose locality matches. Prefer a house or street hit over a
 * suburb centroid from an earlier query. A hit in another suburb is not a match.
 */
export async function firstAgreedGeocode(
  entered: { address: string; suburb: string; state: string; postcode: string },
  lookup: (query: string) => Promise<AgreedGeocodeHit | null>,
): Promise<AgreedGeocodeResult> {
  const queries = buildGeocodeQueryCandidates(entered.address, entered.suburb, entered.state, entered.postcode)
  if (queries.length === 0) return { ok: false, reason: 'not_found' }
  let sawHit = false
  let suburbHit: AgreedGeocodeHit | null = null
  for (const query of queries) {
    const hit = await lookup(query)
    if (!hit) continue
    sawHit = true
    if (!geocodeAgreesWithEnteredAddress(entered, hit.address)) continue
    if (geocodeMatchPrecision(hit.kind) === 'street') {
      return { ok: true, lat: hit.lat, lon: hit.lon, precision: 'street' }
    }
    suburbHit ??= hit
  }
  if (suburbHit) {
    return { ok: true, lat: suburbHit.lat, lon: suburbHit.lon, precision: 'suburb' }
  }
  return { ok: false, reason: sawHit ? 'mismatch' : 'not_found' }
}

/**
 * An unchanged loaded address saves as it is. A complete address that was never
 * searched has to be searched once, then saved again so the landlord sees the campuses.
 */
export function campusSearchRequiredBeforeSave(input: {
  currentSig: string
  loadedSig: string
  acceptedSig: string
  resultsShownSig: string
  addressComplete: boolean
}): CampusSaveSearchDecision {
  if (input.loadedSig !== '' && input.currentSig === input.loadedSig) return 'save'
  if (!input.addressComplete) return 'save'
  if (input.acceptedSig !== '' && input.currentSig === input.acceptedSig) return 'save'
  if (input.resultsShownSig !== '' && input.currentSig === input.resultsShownSig) return 'confirm'
  return 'search'
}

/** An automatic nearest-campus choice is cleared when the address changes. A landlord's choice stays. */
export function campusActionWhenAddressChanges(source: CampusSelectionSource): 'clear' | 'keep' {
  return source === 'auto' ? 'clear' : 'keep'
}
