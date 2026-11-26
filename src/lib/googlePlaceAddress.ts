import {
  geocodeAgreesWithEnteredAddress,
  type GeocodeMatchPrecision,
  type GeocoderLocality,
} from './geocodeAddressAgreement'

const AU_STATE_BY_NAME: Record<string, string> = {
  'new south wales': 'NSW',
  victoria: 'VIC',
  queensland: 'QLD',
  'western australia': 'WA',
  'south australia': 'SA',
  tasmania: 'TAS',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
}

const AU_STATE_CODES = new Set(Object.values(AU_STATE_BY_NAME))

const STREET_RESULT_TYPES = new Set([
  'street_address',
  'premise',
  'subpremise',
  'route',
  'intersection',
])

export type ParsedAustralianAddress = {
  streetLine: string
  suburb: string
  state: string
  postcode: string
  formatted: string
  lat: number
  lon: number
  precision: GeocodeMatchPrecision
}

type AddressComponent = {
  longText?: string
  shortText?: string
  long_name?: string
  short_name?: string
  types?: string[]
}

function componentText(component: AddressComponent, preferShort = false): string {
  if (preferShort) {
    return (component.shortText || component.short_name || component.longText || component.long_name || '').trim()
  }
  return (component.longText || component.long_name || component.shortText || component.short_name || '').trim()
}

function componentByType(components: AddressComponent[], type: string): AddressComponent | undefined {
  return components.find((component) => component.types?.includes(type))
}

function australianStateCode(component: AddressComponent | undefined): string {
  if (!component) return ''
  const short = componentText(component, true).toUpperCase()
  if (AU_STATE_CODES.has(short)) return short
  return AU_STATE_BY_NAME[componentText(component).toLowerCase()] ?? ''
}

export function googleMatchPrecision(types: string[], components: AddressComponent[]): GeocodeMatchPrecision {
  if (types.some((type) => STREET_RESULT_TYPES.has(type))) return 'street'
  if (componentByType(components, 'street_number') || componentByType(components, 'route')) return 'street'
  return 'suburb'
}

function readPoint(raw: Record<string, unknown>): { lat: number; lon: number } | null {
  if (typeof raw.latitude === 'number' && typeof raw.longitude === 'number') {
    return { lat: raw.latitude, lon: raw.longitude }
  }
  const location = raw.location
  if (location && typeof location === 'object') {
    const point = location as { latitude?: number; longitude?: number; lat?: number; lng?: number }
    if (typeof point.latitude === 'number' && typeof point.longitude === 'number') {
      return { lat: point.latitude, lon: point.longitude }
    }
    if (typeof point.lat === 'number' && typeof point.lng === 'number') {
      return { lat: point.lat, lon: point.lng }
    }
  }
  const geometry = raw.geometry
  if (geometry && typeof geometry === 'object') {
    const point = (geometry as { location?: { lat?: number; lng?: number } }).location
    if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
      return { lat: point.lat, lon: point.lng }
    }
  }
  return null
}

function componentsOf(raw: Record<string, unknown>): AddressComponent[] {
  const list = raw.addressComponents ?? raw.address_components
  return Array.isArray(list) ? (list as AddressComponent[]) : []
}

function typesOf(raw: Record<string, unknown>): string[] {
  return Array.isArray(raw.types) ? raw.types.filter((type): type is string => typeof type === 'string') : []
}

/** Turns a Places Details or Geocoding result into the listing address fields. Unit stays on the street line. */
export function parseGoogleAddressResult(raw: unknown): ParsedAustralianAddress | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const point = readPoint(record)
  if (!point) return null
  const components = componentsOf(record)
  const streetNumber = componentByType(components, 'street_number')
  const route = componentByType(components, 'route')
  const unit = componentByType(components, 'subpremise')
  const street = [streetNumber ? componentText(streetNumber) : '', route ? componentText(route) : '']
    .filter(Boolean)
    .join(' ')
  const unitText = unit ? componentText(unit) : ''
  const streetLine = unitText ? (street ? `Unit ${unitText}, ${street}` : `Unit ${unitText}`) : street
  const suburbComponent =
    componentByType(components, 'locality') ||
    componentByType(components, 'postal_town') ||
    componentByType(components, 'sublocality_level_1') ||
    componentByType(components, 'sublocality') ||
    componentByType(components, 'neighborhood')
  const postcodeComponent = componentByType(components, 'postal_code')
  const suburb = suburbComponent ? componentText(suburbComponent) : ''
  const state = australianStateCode(componentByType(components, 'administrative_area_level_1'))
  const postcode = postcodeComponent ? componentText(postcodeComponent) : ''
  const formatted =
    (typeof record.formattedAddress === 'string' && record.formattedAddress) ||
    (typeof record.formatted_address === 'string' && record.formatted_address) ||
    [streetLine, suburb, state, postcode].filter(Boolean).join(', ')
  return {
    streetLine,
    suburb,
    state,
    postcode,
    formatted,
    lat: point.lat,
    lon: point.lon,
    precision: googleMatchPrecision(typesOf(record), components),
  }
}

export function geocoderAddressFromParsed(parsed: ParsedAustralianAddress): GeocoderLocality {
  return {
    suburb: parsed.suburb,
    postcode: parsed.postcode,
    state: parsed.state,
  }
}

export function firstAgreedGoogleAddress(
  results: unknown[],
  entered: { suburb: string; state: string; postcode: string },
): ParsedAustralianAddress | null {
  let suburbHit: ParsedAustralianAddress | null = null
  for (const result of results) {
    const parsed = parseGoogleAddressResult(result)
    if (!parsed) continue
    if (!geocodeAgreesWithEnteredAddress(entered, geocoderAddressFromParsed(parsed))) continue
    if (parsed.precision === 'street') return parsed
    if (!suburbHit) suburbHit = parsed
  }
  return suburbHit
}
