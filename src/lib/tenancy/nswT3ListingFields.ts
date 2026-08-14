/**
 * NSW T3 boarding-house listing particulars (room, shared areas, Annexure 2 charges).
 * Shared by the property form and the occupancy-agreement generator.
 */

export type NswT3SharedAreas = {
  kitchen: boolean
  bathroom: boolean
  commonRoom: boolean
  laundry: boolean
  other: string
}

export type NswT3AdditionalCharge = {
  item: string
  amount: string
  whenDue: string
  howCalculated: string
}

export const EMPTY_NSW_T3_SHARED_AREAS: NswT3SharedAreas = {
  kitchen: false,
  bathroom: false,
  commonRoom: false,
  laundry: false,
  other: '',
}

export function emptyNswT3ChargeRow(): NswT3AdditionalCharge {
  return { item: '', amount: '', whenDue: '', howCalculated: '' }
}

export function hasAtLeastOneSharedArea(areas: NswT3SharedAreas): boolean {
  return (
    areas.kitchen ||
    areas.bathroom ||
    areas.commonRoom ||
    areas.laundry ||
    areas.other.trim().length > 0
  )
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

export function parseNswT3SharedAreas(raw: unknown): NswT3SharedAreas {
  const o = asRecord(raw)
  if (!o) return { ...EMPTY_NSW_T3_SHARED_AREAS }
  return {
    kitchen: Boolean(o.kitchen),
    bathroom: Boolean(o.bathroom),
    commonRoom: Boolean(o.commonRoom ?? o.common_room),
    laundry: Boolean(o.laundry),
    other: typeof o.other === 'string' ? o.other : '',
  }
}

export function nswT3SharedAreasToJson(areas: NswT3SharedAreas): {
  kitchen: boolean
  bathroom: boolean
  common_room: boolean
  laundry: boolean
  other: string
} {
  return {
    kitchen: areas.kitchen,
    bathroom: areas.bathroom,
    common_room: areas.commonRoom,
    laundry: areas.laundry,
    other: areas.other.trim(),
  }
}

function parseChargeRow(raw: unknown): NswT3AdditionalCharge | null {
  const o = asRecord(raw)
  if (!o) return null
  const item = typeof o.item === 'string' ? o.item.trim() : ''
  const amount = typeof o.amount === 'string' ? o.amount.trim() : typeof o.amount === 'number' ? String(o.amount) : ''
  const whenDue =
    typeof o.whenDue === 'string'
      ? o.whenDue.trim()
      : typeof o.when_due === 'string'
        ? o.when_due.trim()
        : ''
  const howCalculated =
    typeof o.howCalculated === 'string'
      ? o.howCalculated.trim()
      : typeof o.how_calculated === 'string'
        ? o.how_calculated.trim()
        : ''
  if (!item && !amount && !whenDue && !howCalculated) return null
  return { item, amount, whenDue, howCalculated }
}

/** Drops blank rows. Incomplete rows are kept so the form/generator can reject them. */
export function parseNswT3AdditionalCharges(raw: unknown): NswT3AdditionalCharge[] {
  if (!Array.isArray(raw)) return []
  const out: NswT3AdditionalCharge[] = []
  for (const row of raw) {
    const parsed = parseChargeRow(row)
    if (parsed) out.push(parsed)
  }
  return out
}

export function nswT3AdditionalChargesToJson(rows: NswT3AdditionalCharge[]): Array<{
  item: string
  amount: string
  when_due: string
  how_calculated: string
}> {
  return rows.map((row) => ({
    item: row.item.trim(),
    amount: row.amount.trim(),
    when_due: row.whenDue.trim(),
    how_calculated: row.howCalculated.trim(),
  }))
}

export function nswT3ChargeRowIsComplete(row: NswT3AdditionalCharge): boolean {
  return (
    row.item.trim().length > 0 &&
    row.amount.trim().length > 0 &&
    row.whenDue.trim().length > 0 &&
    row.howCalculated.trim().length > 0
  )
}

export function nswT3RoomDescriptionError(roomDescription: string): string | null {
  if (!roomDescription.trim()) {
    return 'Enter a room description that identifies this room on the occupancy agreement.'
  }
  return null
}

export function nswT3SharedAreasError(areas: NswT3SharedAreas): string | null {
  if (!hasAtLeastOneSharedArea(areas)) {
    return 'Select at least one shared area (kitchen, bathroom, common room, laundry, or other).'
  }
  return null
}

export function nswT3AdditionalChargesError(rows: NswT3AdditionalCharge[]): string | null {
  const incomplete = rows.find((row) => !nswT3ChargeRowIsComplete(row))
  if (incomplete) {
    return 'Each additional charge needs an item, amount, when it is due, and how it is calculated (actual cost and a reasonable share of use).'
  }
  return null
}
