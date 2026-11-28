/**
 * Phase 2: a student picks how to rent a room that is not shared.
 * Shared rooms and entire places keep today's occupant stepper.
 * No bed option.
 */
import { parseTogetherAud, roomOffersTogetherTotal } from './roomTogetherWeeklyRent'

export type LettingChoice = 'sole' | 'together'

export type ListingLettingOption = {
  choice: LettingChoice
  label: string
  weeklyRent: number
}

export function listingLettingOptions(property: {
  property_type?: string | null
  rent_per_week?: unknown
  together_weekly_rent?: unknown
}): ListingLettingOption[] {
  if (!roomOffersTogetherTotal(property.property_type)) return []
  const sole = Number(property.rent_per_week)
  if (!Number.isFinite(sole) || sole <= 0) return []
  const options: ListingLettingOption[] = [
    { choice: 'sole', label: 'Room to yourself', weeklyRent: sole },
  ]
  const together = parseTogetherAud(property.together_weekly_rent)
  if (together != null && together > 0) {
    options.push({ choice: 'together', label: 'Two people together', weeklyRent: together })
  }
  return options
}

export function parseLettingChoiceParam(value: string | null | undefined): LettingChoice | null {
  if (value === 'sole' || value === 'together') return value
  return null
}

/** Add or replace `letting` on a booking path that may already have a query string. */
export function appendLettingChoiceQuery(path: string, choice: LettingChoice): string {
  const qIndex = path.indexOf('?')
  const base = qIndex === -1 ? path : path.slice(0, qIndex)
  const params = new URLSearchParams(qIndex === -1 ? '' : path.slice(qIndex + 1))
  params.set('letting', choice)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
