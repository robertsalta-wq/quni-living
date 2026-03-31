import type { SupabaseClient } from '@supabase/supabase-js'
import { campusLatLonFromRow, type CampusReferenceRow } from './universityCampusReference'

export type PropertiesNearCampusRow = { id: string; distance_km: number }

/** Call DB Haversine RPC (approximate straight-line distance). */
export async function rpcPropertiesNearCampus(
  supabase: SupabaseClient,
  campusLat: number,
  campusLon: number,
  radiusKm: number,
): Promise<{ data: PropertiesNearCampusRow[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('properties_near_campus', {
    campus_lat: campusLat,
    campus_lon: campusLon,
    radius_km: radiusKm,
  })
  if (error) return { data: null, error: new Error(error.message) }
  const rows = (data ?? []) as { id: string; distance_km: number | string }[]
  return {
    data: rows.map((r) => ({
      id: r.id,
      distance_km: typeof r.distance_km === 'number' ? r.distance_km : Number(r.distance_km),
    })),
    error: null,
  }
}

/**
 * For each property id, minimum straight-line distance (Haversine, approximate) to any campus
 * with coordinates — one RPC per campus.
 */
export async function fetchMinDistanceByPropertyIdForUniversityCampuses(
  supabase: SupabaseClient,
  camps: CampusReferenceRow[],
  radiusKm: number,
): Promise<{ map: Map<string, number>; error: Error | null }> {
  const map = new Map<string, number>()
  for (const c of camps) {
    const ll = campusLatLonFromRow(c)
    if (!ll) continue
    const { data, error } = await rpcPropertiesNearCampus(supabase, ll.lat, ll.lon, radiusKm)
    if (error) return { map, error }
    for (const row of data ?? []) {
      const prev = map.get(row.id)
      if (prev == null || row.distance_km < prev) map.set(row.id, row.distance_km)
    }
  }
  return { map, error: null }
}

/** Fetch properties by id in chunks (PostgREST URL length). */
export async function fetchPropertiesByIds(
  supabase: SupabaseClient,
  ids: string[],
  select: string,
): Promise<{ data: unknown[] | null; error: Error | null }> {
  if (ids.length === 0) return { data: [], error: null }
  const chunkSize = 120
  const out: unknown[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { data, error } = await supabase.from('properties').select(select).in('id', chunk)
    if (error) return { data: null, error: new Error(error.message) }
    if (data?.length) out.push(...data)
  }
  return { data: out, error: null }
}
