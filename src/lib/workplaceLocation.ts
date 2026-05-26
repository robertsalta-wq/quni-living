import { buildGeocodeQueryCandidates, streetLineForGeocode } from './normalizeAustralianAddressForGeocode'

export const NEAR_RADIUS_OPTIONS_KM = [5, 10, 15, 25] as const
export const DEFAULT_NEAR_RADIUS_KM = 15

export const STRAIGHT_LINE_DISTANCE_NOTE =
  'Distances are approximate straight-line km, not driving time.'

export type NearSearchAnchor = {
  lat: number
  lon: number
  radiusKm: number
}

export function parseNearRadiusKm(raw: string | null | undefined): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_NEAR_RADIUS_KM
  const rounded = Math.round(n)
  if ((NEAR_RADIUS_OPTIONS_KM as readonly number[]).includes(rounded)) return rounded
  if (rounded > 0 && rounded <= 50) return rounded
  return DEFAULT_NEAR_RADIUS_KM
}

export function parseNearSearchAnchor(
  latRaw: string | null | undefined,
  lonRaw: string | null | undefined,
  radiusRaw?: string | null,
): NearSearchAnchor | null {
  const lat = Number(latRaw)
  const lon = Number(lonRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -44 || lat > -9 || lon < 112 || lon > 154) return null
  return { lat, lon, radiusKm: parseNearRadiusKm(radiusRaw) }
}

export function hasSavedWorkplaceCoordinates(profile: {
  workplace_latitude?: number | null
  workplace_longitude?: number | null
}): boolean {
  const lat = profile.workplace_latitude
  const lon = profile.workplace_longitude
  return lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)
}

export function workplaceGeocodeQueries(input: {
  address?: string | null
  suburb: string
  state: string
  postcode: string
}): string[] {
  const sub = input.suburb.trim()
  const st = input.state.trim().toUpperCase()
  const pc = input.postcode.trim()
  const addr = input.address?.trim() ?? ''

  if (addr && sub && st && pc) {
    return buildGeocodeQueryCandidates(addr, sub, st, pc)
  }

  if (sub && st && pc) {
    const q = [sub, st, pc, 'Australia'].join(', ')
    return q.length >= 6 ? [q] : []
  }

  if (addr && sub && st) {
    const street = streetLineForGeocode(addr)
    const q = [street ?? addr, sub, st, 'Australia'].filter(Boolean).join(', ')
    return q.length >= 6 ? [q] : []
  }

  return []
}

export function formatDistanceKm(km: number): string {
  if (km < 10) return km.toFixed(1)
  return String(Math.round(km))
}

export function nearSearchParams(anchor: NearSearchAnchor, sortDistance = true): URLSearchParams {
  const p = new URLSearchParams()
  p.set('near_lat', String(anchor.lat))
  p.set('near_lon', String(anchor.lon))
  p.set('near_radius', String(anchor.radiusKm))
  if (sortDistance) p.set('sort', 'distance')
  return p
}
