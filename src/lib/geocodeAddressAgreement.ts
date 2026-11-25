import { buildGeocodeQueryCandidates } from './normalizeAustralianAddressForGeocode'

/** Shown when Nominatim returns a point that is not the suburb, postcode, and state entered. */
export const ADDRESS_NOT_MATCHED_MESSAGE =
  "We couldn't match this address, check the suburb and postcode"

/** How long to wait after the address fields lose focus before looking up campuses. */
export const ADDRESS_LOOKUP_DEBOUNCE_MS = 500

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

export type AgreedGeocodeHit = {
  lat: number
  lon: number
  address: GeocoderLocality
}

export type AgreedGeocodeResult =
  | { ok: true; lat: number; lon: number }
  | { ok: false; reason: 'not_found' | 'mismatch' }

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

/** Use the first query whose returned locality matches. A hit in another suburb is not a match. */
export async function firstAgreedGeocode(
  entered: { address: string; suburb: string; state: string; postcode: string },
  lookup: (query: string) => Promise<AgreedGeocodeHit | null>,
): Promise<AgreedGeocodeResult> {
  const queries = buildGeocodeQueryCandidates(entered.address, entered.suburb, entered.state, entered.postcode)
  if (queries.length === 0) return { ok: false, reason: 'not_found' }
  let sawHit = false
  for (const query of queries) {
    const hit = await lookup(query)
    if (!hit) continue
    sawHit = true
    if (geocodeAgreesWithEnteredAddress(entered, hit.address)) {
      return { ok: true, lat: hit.lat, lon: hit.lon }
    }
  }
  return { ok: false, reason: sawHit ? 'mismatch' : 'not_found' }
}

/** An automatic nearest-campus choice is cleared when the address changes. A landlord's choice stays. */
export function campusActionWhenAddressChanges(source: CampusSelectionSource): 'clear' | 'keep' {
  return source === 'auto' ? 'clear' : 'keep'
}
