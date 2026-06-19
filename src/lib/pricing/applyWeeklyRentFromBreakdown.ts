/** Apply-time weekly rent cap from rent_breakdown provenance (mirrors server helper). */

function parseAud(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function applyWeeklyRentFromBreakdown(
  rentBreakdown: unknown,
  currentWeeklyRent: number | null | undefined,
): number | null {
  if (rentBreakdown && typeof rentBreakdown === 'object' && !Array.isArray(rentBreakdown)) {
    const snap = parseAud((rentBreakdown as Record<string, unknown>).apply_weekly_rent)
    if (snap != null) return snap
  }
  return parseAud(currentWeeklyRent)
}
