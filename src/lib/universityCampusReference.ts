import { isSupabaseConfigured, supabase } from './supabase'

/** Reference rows for cascading university → campus UI (cached). */
export type UniversityReferenceRow = {
  id: string
  name: string
  slug: string
  short_name: string | null
  city: string | null
  state: string | null
}

export type CampusReferenceRow = {
  id: string
  name: string
  university_id: string | null
  suburb: string | null
  state: string | null
  slug: string | null
  /** From DB when present — use for accurate distance vs geocoding campus names. */
  latitude: number | null
  longitude: number | null
}

export type CampusLatLon = { lat: number; lon: number }

export type GeoPoint = { lat: number; lon: number }

/** Great-circle distance between two WGS84 points (kilometres). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const sLat1 = toRad(a.lat)
  const sLat2 = toRad(b.lat)
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(sLat1) * Math.cos(sLat2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

/** Rough lat/lon bounds for a point ± `km` (for PostgREST bbox pre-filter before Haversine). */
export function approxBoundingBoxKm(lat: number, lon: number, km: number) {
  const dLat = km / 111
  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180))
  const dLon = km / (111 * cosLat)
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  }
}

/** Minimum distance from `point` to any campus with valid coordinates; null if none. */
export function minDistanceKmToCampuses(point: GeoPoint, campuses: CampusReferenceRow[]): number | null {
  let min = Infinity
  for (const c of campuses) {
    const ll = campusLatLonFromRow(c)
    if (!ll) continue
    const d = haversineKm(point, ll)
    if (d < min) min = d
  }
  return min === Infinity ? null : min
}

/** Closest campus (by Haversine) among those with coordinates; null if none. */
export function closestCampusByDistance(
  point: GeoPoint,
  campuses: CampusReferenceRow[],
): { campus: CampusReferenceRow; distanceKm: number } | null {
  let best: { campus: CampusReferenceRow; distanceKm: number } | null = null
  for (const c of campuses) {
    const ll = campusLatLonFromRow(c)
    if (!ll) continue
    const d = haversineKm(point, ll)
    if (!best || d < best.distanceKm) best = { campus: c, distanceKm: d }
  }
  return best
}

/** Property row lat/lon when both columns are valid numbers. */
export function geoPointFromPropertyRow(p: {
  latitude?: unknown
  longitude?: unknown
}): GeoPoint | null {
  const lat = p.latitude != null ? Number(p.latitude) : NaN
  const lon = p.longitude != null ? Number(p.longitude) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon }
}

/** Union of per-campus bounding boxes (±`padKm`) for a coarse PostgREST filter before Haversine. */
export function unionBoundingBoxKmForCampuses(
  campuses: CampusReferenceRow[],
  padKm: number,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } | null {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity
  for (const c of campuses) {
    const ll = campusLatLonFromRow(c)
    if (!ll) continue
    const b = approxBoundingBoxKm(ll.lat, ll.lon, padKm)
    minLat = Math.min(minLat, b.minLat)
    maxLat = Math.max(maxLat, b.maxLat)
    minLon = Math.min(minLon, b.minLon)
    maxLon = Math.max(maxLon, b.maxLon)
  }
  if (!Number.isFinite(minLat)) return null
  return { minLat, maxLat, minLon, maxLon }
}

function parseOptionalCoord(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Prefer DB coordinates for distance; returns null if missing or invalid. */
export function campusLatLonFromRow(c: CampusReferenceRow): CampusLatLon | null {
  const lat = parseOptionalCoord(c.latitude)
  const lon = parseOptionalCoord(c.longitude)
  if (lat == null || lon == null) return null
  return { lat, lon }
}

export type UniversityCampusReferenceData = {
  universities: UniversityReferenceRow[]
  campuses: CampusReferenceRow[]
}

type ActivePropertyLocationRow = {
  university_id: string | null
  campus_id: string | null
}

type ActivePropertyLocationIndex = {
  universityIds: Set<string>
  campusIds: Set<string>
  campusIdsByUniversity: Map<string, Set<string>>
}

let cache: Promise<UniversityCampusReferenceData> | null = null
let activePropertyLocationCache: Promise<ActivePropertyLocationIndex> | null = null

/** Normalise UUID strings for comparison (PostgREST often returns lowercase; DOM values may not). */
export function normUuid(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

/** Full campus rows + parent uni slug (joined in JS — avoids flaky PostgREST embeds). */
type CampusJoinRow = {
  id: string
  name: string
  university_id: string | null
  suburb: string | null
  state: string | null
  slug: string | null
  latitude: number | null
  longitude: number | null
  universities: { id: string; slug: string } | null
}

let allCampusesJoinedCache: Promise<CampusJoinRow[]> | null = null

async function fetchUniversities(): Promise<UniversityReferenceRow[]> {
  const extended = await supabase
    .from('universities')
    .select('id, name, slug, short_name, city, state')
    .order('name')
  if (!extended.error && extended.data != null) {
    return extended.data as UniversityReferenceRow[]
  }
  const base = await supabase.from('universities').select('id, name, slug, city, state').order('name')
  if (base.error) throw base.error
  return (base.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    short_name: null,
    city: r.city,
    state: r.state,
  }))
}

async function fetchCampuses(): Promise<CampusReferenceRow[]> {
  const extended = await supabase
    .from('campuses')
    .select('id, name, university_id, suburb, state, slug, latitude, longitude')
    .order('name')
  if (!extended.error && extended.data != null) {
    return (extended.data as Record<string, unknown>[]).map((r) =>
      mapCampusRow(r as Parameters<typeof mapCampusRow>[0]),
    )
  }
  const base = await supabase.from('campuses').select('id, name, university_id').order('name')
  if (base.error) throw base.error
  return (base.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    university_id: r.university_id,
    suburb: null,
    state: null,
    slug: null,
    latitude: null,
    longitude: null,
  }))
}

async function loadActivePropertyLocationIndex(): Promise<ActivePropertyLocationIndex> {
  const { data, error } = await supabase
    .from('properties')
    .select('university_id, campus_id')
    .eq('status', 'active')

  if (error) throw error

  const rows = (data ?? []) as ActivePropertyLocationRow[]
  const universityIds = new Set<string>()
  const campusIds = new Set<string>()
  const campusIdsByUniversity = new Map<string, Set<string>>()

  for (const row of rows) {
    const universityId = normUuid(row.university_id)
    const campusId = normUuid(row.campus_id)
    if (!universityId) continue
    universityIds.add(universityId)
    if (!campusId) continue
    campusIds.add(campusId)
    if (!campusIdsByUniversity.has(universityId)) {
      campusIdsByUniversity.set(universityId, new Set<string>())
    }
    campusIdsByUniversity.get(universityId)!.add(campusId)
  }

  return { universityIds, campusIds, campusIdsByUniversity }
}

function getActivePropertyLocationIndexCached(): Promise<ActivePropertyLocationIndex> {
  if (!isSupabaseConfigured) {
    return Promise.resolve({
      universityIds: new Set<string>(),
      campusIds: new Set<string>(),
      campusIdsByUniversity: new Map<string, Set<string>>(),
    })
  }
  if (!activePropertyLocationCache) {
    const p = loadActivePropertyLocationIndex()
    activePropertyLocationCache = p
    p.catch(() => {
      activePropertyLocationCache = null
    })
  }
  return activePropertyLocationCache
}

async function loadFresh(): Promise<UniversityCampusReferenceData> {
  const [universities, campuses, activeLocations] = await Promise.all([
    fetchUniversities(),
    fetchCampuses(),
    getActivePropertyLocationIndexCached(),
  ])
  const filteredUniversities = universities.filter((u) => activeLocations.universityIds.has(normUuid(u.id)))
  const filteredCampuses = campuses.filter((c) => {
    const campusId = normUuid(c.id)
    if (!campusId || !activeLocations.campusIds.has(campusId)) return false
    const universityId = normUuid(c.university_id)
    if (!universityId) return false
    const campusIdsForUniversity = activeLocations.campusIdsByUniversity.get(universityId)
    return campusIdsForUniversity?.has(campusId) ?? false
  })
  return { universities: filteredUniversities, campuses: filteredCampuses }
}

function mapCampusRow(r: {
  id: string
  name: string
  university_id: string | null
  suburb?: string | null
  state?: string | null
  slug?: string | null
  latitude?: unknown
  longitude?: unknown
}): CampusReferenceRow {
  return {
    id: r.id,
    name: r.name,
    university_id: r.university_id,
    suburb: r.suburb ?? null,
    state: r.state ?? null,
    slug: r.slug ?? null,
    latitude: parseOptionalCoord(r.latitude),
    longitude: parseOptionalCoord(r.longitude),
  }
}

/**
 * Load all campuses (plain select), then attach parent slug via the same university list
 * the dropdown uses. No nested PostgREST resource — works when embeds are blocked or misconfigured.
 */
async function loadAllCampusesJoined(): Promise<CampusJoinRow[]> {
  const ext = await supabase
    .from('campuses')
    .select('id, name, university_id, suburb, state, slug, latitude, longitude')
    .order('name')

  type Raw = {
    id: string
    name: string
    university_id: string | null
    suburb?: string | null
    state?: string | null
    slug?: string | null
    latitude?: unknown
    longitude?: unknown
  }

  let raw: Raw[] = []
  if (!ext.error && ext.data != null) {
    raw = ext.data as Raw[]
  } else {
    const base = await supabase.from('campuses').select('id, name, university_id').order('name')
    if (base.error) {
      console.warn('[Quni] loadAllCampusesJoined:', base.error.message)
      return []
    }
    raw = (base.data as Raw[]).map((r) => ({
      ...r,
      suburb: null,
      state: null,
      slug: null,
      latitude: null,
      longitude: null,
    }))
  }

  const ref = await loadUniversityCampusReference()
  const uniById = new Map<string, { id: string; slug: string }>()
  for (const u of ref.universities) {
    uniById.set(normUuid(u.id), { id: u.id, slug: u.slug })
  }

  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    university_id: r.university_id,
    suburb: r.suburb ?? null,
    state: r.state ?? null,
    slug: r.slug ?? null,
    latitude: parseOptionalCoord(r.latitude),
    longitude: parseOptionalCoord(r.longitude),
    universities: r.university_id ? uniById.get(normUuid(r.university_id)) ?? null : null,
  }))
}

function getAllCampusesJoinedCached(): Promise<CampusJoinRow[]> {
  if (!isSupabaseConfigured) {
    return Promise.resolve([])
  }
  if (!allCampusesJoinedCache) {
    const p = loadAllCampusesJoined().then((rows) => {
      // Don't cache an empty list — often means anon RLS blocked the first load; allow retry after fixes.
      if (rows.length === 0) allCampusesJoinedCache = null
      return rows
    })
    allCampusesJoinedCache = p
    p.catch(() => {
      allCampusesJoinedCache = null
    })
  }
  return allCampusesJoinedCache
}

/** Same as SQL `where university_id = ?` — works when bulk cache is empty (e.g. RLS). */
async function fetchCampusesDirectByUniversityId(universityId: string): Promise<CampusReferenceRow[]> {
  const trimmed = universityId.trim()
  if (!trimmed) return []

  const idVariants = [...new Set([trimmed, normUuid(trimmed)].filter((s) => s.length > 0))]

  for (const idVal of idVariants) {
    const ext = await supabase
      .from('campuses')
      .select('id, name, university_id, suburb, state, slug, latitude, longitude')
      .eq('university_id', idVal)
      .order('name')

    if (!ext.error && ext.data != null && ext.data.length > 0) {
      return (ext.data as Record<string, unknown>[]).map((r) =>
        mapCampusRow(r as Parameters<typeof mapCampusRow>[0]),
      )
    }

    const base = await supabase
      .from('campuses')
      .select('id, name, university_id')
      .eq('university_id', idVal)
      .order('name')

    if (!base.error && base.data != null && base.data.length > 0) {
      return (base.data as { id: string; name: string; university_id: string | null }[]).map((r) =>
        mapCampusRow({ ...r, suburb: null, state: null, slug: null, latitude: null, longitude: null }),
      )
    }
  }

  return []
}

function slugEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
}

/**
 * Campuses for the selected university: match normalised `university_id` or parent slug.
 */
export async function fetchCampusesForUniversityId(
  universityId: string,
  universitySlug?: string | null,
): Promise<CampusReferenceRow[]> {
  if (!isSupabaseConfigured || !universityId.trim()) return []
  const uid = normUuid(universityId)
  const slug = universitySlug?.trim() ?? null
  const activeLocations = await getActivePropertyLocationIndexCached()
  const activeCampusIdsForUniversity = activeLocations.campusIdsByUniversity.get(uid) ?? new Set<string>()
  if (activeCampusIdsForUniversity.size === 0) return []

  const direct = await fetchCampusesDirectByUniversityId(universityId)
  if (direct.length > 0) {
    return direct
      .filter((c) => activeCampusIdsForUniversity.has(normUuid(c.id)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const rows = await getAllCampusesJoinedCached()
  let matched = rows.filter((r) => {
    if (normUuid(r.university_id) === uid) return true
    if (slug && r.universities && slugEq(r.universities.slug, slug)) return true
    return false
  })

  if (matched.length === 0 && slug) {
    const ref = await loadUniversityCampusReference()
    const idsForSlug = new Set(
      ref.universities.filter((u) => slugEq(u.slug, slug)).map((u) => normUuid(u.id)),
    )
    if (idsForSlug.size > 0) {
      matched = rows.filter((r) => r.university_id != null && idsForSlug.has(normUuid(r.university_id)))
    }
  }

  return matched
    .map((r) =>
      mapCampusRow({
        id: r.id,
        name: r.name,
        university_id: r.university_id,
        suburb: r.suburb,
        state: r.state,
        slug: r.slug,
        latitude: r.latitude,
        longitude: r.longitude,
      }),
    )
    .filter((c) => activeCampusIdsForUniversity.has(normUuid(c.id)))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Loads universities and campuses once per page session; re-used by all pickers.
 * Safe when Supabase is not configured (returns empty arrays).
 * Falls back to columns from `quni_supabase_schema.sql` if extended columns are missing.
 */
export function loadUniversityCampusReference(): Promise<UniversityCampusReferenceData> {
  if (!isSupabaseConfigured) {
    return Promise.resolve({ universities: [], campuses: [] })
  }
  if (!cache) {
    const p = loadFresh()
    cache = p
    p.catch(() => {
      cache = null
    })
  }
  return cache
}

/** For tests or after re-seeding reference data. */
export function clearUniversityCampusReferenceCache(): void {
  cache = null
  allCampusesJoinedCache = null
  activePropertyLocationCache = null
}

/** Australian states / territories for <optgroup> ordering. */
export const AU_STATE_ORDER = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT', 'TAS', 'NT'] as const

export function groupUniversitiesByState(
  universities: UniversityReferenceRow[],
): Map<string, UniversityReferenceRow[]> {
  const map = new Map<string, UniversityReferenceRow[]>()
  for (const u of universities) {
    const key = (u.state ?? '').trim() || 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(u)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return map
}

export function universityShortLabel(u: {
  short_name?: string | null
  slug: string
  name: string
}): string {
  const s = u.short_name?.trim()
  if (s) return s
  const slug = u.slug?.trim()
  if (slug) return slug.toUpperCase()
  return u.name
}
