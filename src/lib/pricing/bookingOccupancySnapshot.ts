import type { RentBreakdownAud } from './resolveWeeklyRent'

export type CoTenantSnapshot = {
  full_name: string
  email: string
  phone: string
  date_of_birth: string
}

export function parseCoTenantSnapshot(raw: unknown): CoTenantSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const full_name = typeof o.full_name === 'string' ? o.full_name.trim() : ''
  const email = typeof o.email === 'string' ? o.email.trim() : ''
  const phone = typeof o.phone === 'string' ? o.phone.trim() : ''
  const date_of_birth =
    typeof o.date_of_birth === 'string' ? o.date_of_birth.trim().slice(0, 10) : ''
  if (full_name.length < 2 || !email) return null
  return { full_name, email, phone, date_of_birth }
}

export function parseRentBreakdownAud(raw: unknown): RentBreakdownAud | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const base = Number(o.base)
  if (!Number.isFinite(base) || base < 0) return null
  const out: RentBreakdownAud = { base: Math.round(base * 100) / 100 }
  const couple = Number(o.couple)
  if (Number.isFinite(couple) && couple > 0) out.couple = Math.round(couple * 100) / 100
  const parking = Number(o.parking)
  if (Number.isFinite(parking) && parking > 0) out.parking = Math.round(parking * 100) / 100
  return out
}

export function bookingHasOccupancySnapshot(booking: {
  occupant_count?: number | null
  parking_selected?: boolean | null
  rent_breakdown?: unknown
  co_tenant?: unknown
}): boolean {
  const occ = Math.floor(Number(booking.occupant_count))
  return (
    (Number.isFinite(occ) && occ >= 1) ||
    booking.parking_selected === true ||
    parseRentBreakdownAud(booking.rent_breakdown) != null ||
    parseCoTenantSnapshot(booking.co_tenant) != null
  )
}

export function formatOccupantCountLabel(count: number | null | undefined): string {
  const n = Math.floor(Number(count))
  if (!Number.isFinite(n) || n < 1) return '—'
  if (n === 1) return '1 occupant'
  return `${n} occupants`
}
