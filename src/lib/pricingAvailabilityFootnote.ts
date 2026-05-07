import { resolveServiceTierAvailability, type PropertyTier } from './serviceTier'

/** Representative tier for “typical” private-room listings on marketing pages. */
const SHOWCASE_PROPERTY_TIER: PropertyTier = 't2'

const STATES = ['QLD', 'NSW', 'VIC'] as const

function stateLabel(code: (typeof STATES)[number]): string {
  switch (code) {
    case 'QLD':
      return 'Queensland'
    case 'NSW':
      return 'New South Wales'
    case 'VIC':
      return 'Victoria'
    default:
      return code
  }
}

/**
 * Human-readable availability line for landlord tier cards (Listing vs Managed).
 * Uses resolveServiceTierAvailability so QLD/NSW/VIC rules stay in one place.
 */
export function pricingTierAvailabilitySummary(serviceTier: 'listing' | 'managed'): string {
  const parts: string[] = []
  for (const code of STATES) {
    const r = resolveServiceTierAvailability(code, SHOWCASE_PROPERTY_TIER)
    const status = r[serviceTier]
    const label = stateLabel(code)
    if (status === 'available') {
      parts.push(`${label}: available`)
    } else if (status === 'gated') {
      parts.push(`${label}: opening soon`)
    } else {
      parts.push(`${label}: not yet`)
    }
  }
  return `${parts.join(' · ')}. Applies to typical private-room listings.`
}
