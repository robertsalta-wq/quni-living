/** Client helpers for landlord agreed-rent override provenance on bookings.rent_breakdown. */

export type RentOverrideProvenance = {
  overrideApplied: boolean
  applyWeeklyRentAud: number | null
  agreedWeeklyRentAud: number | null
}

function parseAud(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function parseRentOverrideProvenance(raw: unknown): RentOverrideProvenance {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { overrideApplied: false, applyWeeklyRentAud: null, agreedWeeklyRentAud: null }
  }
  const o = raw as Record<string, unknown>
  const overrideApplied = o.override_applied === true
  return {
    overrideApplied,
    applyWeeklyRentAud: parseAud(o.apply_weekly_rent),
    agreedWeeklyRentAud: parseAud(o.agreed_weekly_rent),
  }
}

export function formatAudWeekly(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '-'
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
