/**
 * FT6600 "Contribution towards bond" lines (tenants 1 to 3).
 *
 * Stored today: one booking bond amount (`bookings.bond_amount`, dollars) and, when the
 * listing has no booking amount, the property bond. `bookings.co_tenant` stores
 * full_name, email, phone and date_of_birth. It does not store a bond share.
 * Optional `storedAud` is only used when a caller already has per-tenant amounts.
 * Otherwise the bond is split equally and leftover cents go to tenant 1.
 */

export function ft6600BondTenantCount(additionalTenantNames: readonly string[]): number {
  const extras = additionalTenantNames.map((s) => s.trim()).filter(Boolean).length
  return Math.min(3, 1 + extras)
}

export function splitFt6600BondContributionsAud(
  totalAud: number,
  tenantCount: number,
  storedAud?: Array<number | null | undefined> | null,
): number[] {
  const n = Math.max(1, Math.min(3, Math.floor(tenantCount)))
  const totalCents = Math.round(totalAud * 100)
  const storedCents = Array.from({ length: n }, (_, i) => {
    const v = storedAud?.[i]
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    return Math.round(v * 100)
  })
  const anyStored = storedCents.some((v) => v != null)
  if (!anyStored) {
    const base = Math.floor(totalCents / n)
    const remainder = totalCents - base * n
    return Array.from({ length: n }, (_, i) => (base + (i === 0 ? remainder : 0)) / 100)
  }

  const known = storedCents.reduce<number>((sum, v) => sum + (v ?? 0), 0)
  const unknown = storedCents.flatMap((v, i) => (v == null ? [i] : []))
  if (unknown.length === 0) return storedCents.map((v) => (v ?? 0) / 100)

  const remaining = Math.max(0, totalCents - known)
  const base = Math.floor(remaining / unknown.length)
  const leftover = remaining - base * unknown.length
  const centsTarget = unknown.includes(0) ? 0 : unknown[0]!
  const out = storedCents.map((v) => v ?? 0)
  for (const i of unknown) out[i] = base + (i === centsTarget ? leftover : 0)
  return out.map((cents) => cents / 100)
}
