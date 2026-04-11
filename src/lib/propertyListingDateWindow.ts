/**
 * Listing window helpers for `properties.available_from` / `available_to`.
 * `available_from` is earliest move-in (UI / booking rules), not browse visibility.
 * Browse and sitemap only gate on `available_to` (listing expiry); null means no expiry.
 * Null, empty, or whitespace-only bounds mean no restriction on that side.
 * Values that are not valid YYYY-MM-DD calendar days are ignored (treated as unset).
 */
import { isIsoDateString } from './listingAvailabilityDates'

export function listingIsoDateUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function normalizeListingDay(isoDate: string): string | null {
  const s = isoDate.trim().slice(0, 10)
  return isIsoDateString(s) ? s : null
}

/** Normalised YYYY-MM-DD listing bound, or null if unset / invalid. */
export function normalizeListingBound(v: string | null | undefined): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const day = s.slice(0, 10)
  return isIsoDateString(day) ? day : null
}

export type PropertyListingDateWindowStatus = 'visible' | 'before_start' | 'after_end'

/**
 * Compare listing window to a calendar day (UTC YYYY-MM-DD from `listingIsoDateUtc()` or filters).
 * Invalid `isoDate` falls back to today so we do not spuriously hide listings.
 */
export function propertyListingDateWindowStatus(
  row: { available_from?: string | null; available_to?: string | null },
  isoDate: string,
): PropertyListingDateWindowStatus {
  const d = normalizeListingDay(isoDate) ?? listingIsoDateUtc()
  const from = normalizeListingBound(row.available_from)
  const to = normalizeListingBound(row.available_to)
  if (from && d < from) return 'before_start'
  if (to && d > to) return 'after_end'
  return 'visible'
}

/** True unless today is past `available_to` (listing expired). Ignores `available_from` for visibility. */
export function propertyListingVisibleOnDate(
  row: { available_from?: string | null; available_to?: string | null },
  isoDate: string,
): boolean {
  return propertyListingDateWindowStatus(row, isoDate) !== 'after_end'
}

type QueryWithOr = { or: (filter: string) => QueryWithOr }

/** PostgREST: keep rows not past listing end — (no upper bound OR to >= d). */
export function applyPropertyListingDateWindow<Q extends QueryWithOr>(query: Q, isoDate: string): Q {
  const d = normalizeListingDay(isoDate) ?? listingIsoDateUtc()
  return query.or(`available_to.is.null,available_to.gte.${d}`) as Q
}
