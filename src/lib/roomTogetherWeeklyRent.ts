/**
 * Phase 1: rooms that are not shared rooms can store a two-together total.
 * Shared rooms stay on max people and the couple surcharge until Phase 3.
 *
 * Phase 3 note, not built here: on an NSW or QLD shared room, rent_per_week is
 * what each person pays to share, not the room-to-yourself price. Ask those
 * landlords the same way as Victoria: "Is $X the price per bed, or for the room
 * to yourself?"
 */

export function roomOffersTogetherTotal(propertyType: string | null | undefined): boolean {
  const type = (propertyType ?? '').trim()
  return type === 'private_room_landlord_off_site' || type === 'private_room_landlord_on_site'
}

export type OccupancyPriceFields = {
  max_occupants: number
  couple_surcharge_per_week: number | null
  together_weekly_rent: number | null
}

function roundAud(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseTogetherAud(value: unknown): number | null {
  if (value == null || value === '') return null
  const raw = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''))
  if (!Number.isFinite(raw) || raw < 0) return null
  return roundAud(raw)
}

export function formatTogetherAudInput(value: number): string {
  const rounded = roundAud(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/** True when a numeric column read back after save matches the amount we wrote. */
export function persistedAudMatches(expected: number | null, actual: unknown): boolean {
  if (expected == null) return actual == null || actual === ''
  const parsed = parseTogetherAud(actual)
  return parsed != null && roundAud(parsed) === roundAud(expected)
}

export function togetherTotalFromStored(args: {
  rentPerWeek: number
  maxOccupants: number
  coupleSurcharge: number | null
  togetherWeeklyRent: number | null
}): { enabled: boolean; total: string } {
  if (args.togetherWeeklyRent != null && args.togetherWeeklyRent > 0) {
    return { enabled: true, total: formatTogetherAudInput(args.togetherWeeklyRent) }
  }
  if (args.maxOccupants >= 2) {
    const total = roundAud(args.rentPerWeek + (args.coupleSurcharge != null && args.coupleSurcharge > 0 ? args.coupleSurcharge : 0))
    return { enabled: true, total: formatTogetherAudInput(total) }
  }
  return { enabled: false, total: '' }
}

export function occupancyPricesForSave(args: {
  propertyType: string
  rentPerWeek: number
  maxOccupants: number
  coupleSurcharge: number | null
  togetherEnabled: boolean
  togetherWeeklyRent: number | null
}): { ok: true; fields: OccupancyPriceFields } | { ok: false; message: string } {
  const maxOcc = Math.min(10, Math.max(1, Math.floor(args.maxOccupants) || 1))
  if (!roomOffersTogetherTotal(args.propertyType)) {
    if (args.coupleSurcharge != null && args.coupleSurcharge < 0) {
      return { ok: false, message: 'Couple surcharge must be zero or a positive amount.' }
    }
    return {
      ok: true,
      fields: {
        max_occupants: maxOcc,
        couple_surcharge_per_week: maxOcc >= 2 && args.coupleSurcharge != null && args.coupleSurcharge > 0 ? args.coupleSurcharge : null,
        together_weekly_rent: null,
      },
    }
  }

  if (!args.togetherEnabled) {
    return {
      ok: true,
      fields: {
        max_occupants: 1,
        couple_surcharge_per_week: null,
        together_weekly_rent: null,
      },
    }
  }

  const together = args.togetherWeeklyRent
  if (together == null || together <= 0) {
    return { ok: false, message: 'Enter the weekly rent for two people together.' }
  }
  if (!(together >= args.rentPerWeek)) {
    return {
      ok: false,
      message: 'Weekly rent for two people together must be at least the one-person rent.',
    }
  }
  const extra = roundAud(together - args.rentPerWeek)
  return {
    ok: true,
    fields: {
      max_occupants: 2,
      couple_surcharge_per_week: extra > 0 ? extra : null,
      together_weekly_rent: together,
    },
  }
}
