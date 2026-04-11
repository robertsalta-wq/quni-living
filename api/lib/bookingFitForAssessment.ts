/**
 * Duplicate of `src/lib/bookingFitSummary` + `propertyFeatureSignals` for Edge/API bundling
 * (Node16 resolution; keep logic identical to the booking review fit table).
 */
import type { Database } from '../../src/lib/database.types.ts'

export type FitRowStatus = 'match' | 'mismatch' | 'unknown'

export type BookingFitRow = {
  label: string
  studentSide: string
  propertySide: string
  status: FitRowStatus
}

type BookingRow = Database['public']['Tables']['bookings']['Row']
type StudentRow = Database['public']['Tables']['student_profiles']['Row']
export type BookingFitPropertyInput = Database['public']['Tables']['properties']['Row'] & {
  property_features?: { features?: { name?: string | null } | null }[] | null
}
type PropertyRow = BookingFitPropertyInput

function featureNamesFromPropertyRow(property: {
  property_features?: { features?: { name?: string | null } | null }[] | null
} | null): string[] {
  const raw = property?.property_features
  if (!Array.isArray(raw)) return []
  return raw
    .map((pf) => {
      const n = pf?.features?.name
      return typeof n === 'string' ? n.trim().toLowerCase() : ''
    })
    .filter(Boolean)
}

function propertyBillsIncluded(names: string[]): boolean {
  return names.some((n) => /bills?\s*included|^utilities$/i.test(n))
}

function propertyPetsAllowed(names: string[]): boolean {
  return names.some((n) => /pet|pets|cat|dog/i.test(n))
}

function propertyHasParking(names: string[]): boolean {
  return names.some((n) => /parking|car\s*space|car\s*park|garage/i.test(n))
}

function normLease(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, '_')
}

function leaseMatch(requested: string | null | undefined, offered: string | null | undefined): FitRowStatus {
  const a = normLease(requested)
  const b = normLease(offered)
  if (!a || !b) return 'unknown'
  if (a === b) return 'match'
  if (a.includes('flexible') || b.includes('flexible')) return 'unknown'
  return 'mismatch'
}

function moveInMatch(
  requestedIso: string | null | undefined,
  availableFrom: string | null | undefined,
  flexibility: string | null | undefined,
): FitRowStatus {
  const req = (requestedIso ?? '').slice(0, 10)
  const av = (availableFrom ?? '').slice(0, 10)
  if (!req) return 'unknown'
  if (!av) return 'unknown'
  if (req >= av) return 'match'
  if (flexibility === 'one_week' || flexibility === 'two_weeks') {
    const reqT = new Date(`${req}T12:00:00Z`).getTime()
    const avT = new Date(`${av}T12:00:00Z`).getTime()
    const slackDays = flexibility === 'two_weeks' ? 14 : 7
    if (reqT >= avT - slackDays * 86400000) return 'match'
  }
  return 'mismatch'
}

function occupancyMatch(
  occ: string | null | undefined,
  roomType: string | null | undefined,
  listingType: string | null | undefined,
): FitRowStatus {
  if (!occ) return 'unknown'
  const rt = (roomType ?? '').toLowerCase()
  const lt = (listingType ?? '').toLowerCase()
  if (occ === 'couple') {
    if (rt === 'shared' || lt === 'homestay') return 'match'
    if (rt === 'single' || rt === 'studio') return 'mismatch'
    return 'unknown'
  }
  if (occ === 'sole') {
    if (rt === 'shared') return 'mismatch'
    return 'match'
  }
  return 'match'
}

function billsMatch(pref: string | null | undefined, included: boolean): FitRowStatus {
  if (!pref) return 'unknown'
  if (pref === 'either') return 'match'
  if (pref === 'included') return included ? 'match' : 'mismatch'
  if (pref === 'separate') return included ? 'mismatch' : 'match'
  return 'unknown'
}

function furnishingMatch(
  pref: string | null | undefined,
  furnished: boolean | null | undefined,
): FitRowStatus {
  if (!pref) return 'unknown'
  if (pref === 'either') return 'match'
  if (furnished == null) return 'unknown'
  if (pref === 'furnished') return furnished ? 'match' : 'mismatch'
  if (pref === 'unfurnished') return furnished ? 'mismatch' : 'match'
  return 'unknown'
}

export type BookingFitStudentInput = Pick<
  StudentRow,
  | 'occupancy_type'
  | 'move_in_flexibility'
  | 'has_pets'
  | 'needs_parking'
  | 'bills_preference'
  | 'furnishing_preference'
>

export function buildBookingFitSummary(args: {
  booking: Pick<BookingRow, 'move_in_date' | 'start_date' | 'lease_length'>
  student: BookingFitStudentInput
  property: PropertyRow | null
}): BookingFitRow[] {
  const property = args.property
  const names = featureNamesFromPropertyRow(property)
  const billsInc = propertyBillsIncluded(names)
  const petsOk = propertyPetsAllowed(names)
  const parkOk = propertyHasParking(names)

  const moveIn = (args.booking.move_in_date || args.booking.start_date || '').slice(0, 10)
  const avail = property?.available_from ? String(property.available_from).slice(0, 10) : ''

  const rows: BookingFitRow[] = []

  const miStatus = moveInMatch(moveIn, avail, args.student.move_in_flexibility)
  rows.push({
    label: 'Move-in date',
    studentSide: moveIn
      ? `${moveIn}${args.student.move_in_flexibility ? ` (${args.student.move_in_flexibility.replace(/_/g, ' ')})` : ''}`
      : '—',
    propertySide: avail ? `From ${avail}` : 'Not specified on listing',
    status: miStatus,
  })

  const leaseSt = leaseMatch(args.booking.lease_length, property?.lease_length ?? null)
  rows.push({
    label: 'Lease length',
    studentSide: args.booking.lease_length?.trim() || '—',
    propertySide: property?.lease_length?.trim() || '—',
    status: leaseSt,
  })

  const occ = args.student.occupancy_type
  const occStatus = occupancyMatch(occ, property?.room_type ?? null, property?.listing_type ?? null)
  rows.push({
    label: 'Occupancy',
    studentSide: occ ? occ.replace(/_/g, ' ') : 'Not specified',
    propertySide: [property?.room_type, property?.listing_type].filter(Boolean).join(' · ') || '—',
    status: occStatus,
  })

  const hasPets = args.student.has_pets === true
  const petsStatus: FitRowStatus =
    args.student.has_pets == null ? 'unknown' : hasPets ? (petsOk ? 'match' : 'mismatch') : petsOk ? 'match' : 'match'
  rows.push({
    label: 'Pets',
    studentSide: args.student.has_pets == null ? 'Not specified' : hasPets ? 'Has pets' : 'No pets',
    propertySide: petsOk ? 'Pets allowed (per listing features)' : 'No pet-friendly signal on listing',
    status: petsStatus,
  })

  const needPark = args.student.needs_parking === true
  const parkStatus: FitRowStatus =
    args.student.needs_parking == null ? 'unknown' : needPark ? (parkOk ? 'match' : 'mismatch') : 'match'
  rows.push({
    label: 'Parking',
    studentSide: args.student.needs_parking == null ? 'Not specified' : needPark ? 'Needs parking' : 'No parking need',
    propertySide: parkOk ? 'Parking signal on listing' : 'No parking signal on listing',
    status: parkStatus,
  })

  const billsSt = billsMatch(args.student.bills_preference, billsInc)
  rows.push({
    label: 'Bills',
    studentSide: args.student.bills_preference?.replace(/_/g, ' ') || 'Not specified',
    propertySide: billsInc ? 'Bills included (per listing features)' : 'No bills-included signal',
    status: billsSt,
  })

  const furnSt = furnishingMatch(args.student.furnishing_preference, property?.furnished ?? null)
  rows.push({
    label: 'Furnishing',
    studentSide: args.student.furnishing_preference?.replace(/_/g, ' ') || 'Not specified',
    propertySide:
      property?.furnished === true ? 'Furnished' : property?.furnished === false ? 'Unfurnished' : 'Not specified',
    status: furnSt,
  })

  return rows
}

export function formatBookingFitSummaryForPrompt(rows: BookingFitRow[]): string {
  return rows
    .map((r) => {
      const statusLabel =
        r.status === 'match' ? 'MATCH' : r.status === 'mismatch' ? 'MISMATCH' : 'UNKNOWN (confirm with listing)'
      return `${r.label}: ${statusLabel} — student: ${r.studentSide}; listing: ${r.propertySide}`
    })
    .join('\n')
}
