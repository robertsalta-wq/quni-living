/** Official Australia Post ranges. 0800-0999 is stored as 800-999. */
const RANGES: { state: string; from: number; to: number }[] = [
  { state: 'NSW', from: 2000, to: 2599 },
  { state: 'NSW', from: 2619, to: 2899 },
  { state: 'NSW', from: 2921, to: 2999 },
  { state: 'ACT', from: 2600, to: 2618 },
  { state: 'ACT', from: 2900, to: 2920 },
  { state: 'VIC', from: 3000, to: 3999 },
  { state: 'VIC', from: 8000, to: 8999 },
  { state: 'QLD', from: 4000, to: 4999 },
  { state: 'QLD', from: 9000, to: 9999 },
  { state: 'SA', from: 5000, to: 5999 },
  { state: 'WA', from: 6000, to: 6999 },
  { state: 'TAS', from: 7000, to: 7999 },
  { state: 'NT', from: 800, to: 999 },
]

export function stateFromAustralianPostcode(postcode: string | null | undefined): string | null {
  const digits = (postcode ?? '').trim()
  if (!/^\d{4}$/.test(digits)) return null
  const n = Number(digits)
  return RANGES.find((range) => n >= range.from && n <= range.to)?.state ?? null
}

export function postcodeStateConflictMessage(
  postcode: string | null | undefined,
  state: string | null | undefined,
): string | null {
  const digits = (postcode ?? '').trim()
  const fromPostcode = stateFromAustralianPostcode(digits)
  const chosen = (state ?? '').trim().toUpperCase()
  if (!fromPostcode || !chosen || fromPostcode === chosen) return null
  return `Postcode ${digits} is in ${fromPostcode}, but the state is ${chosen}`
}
