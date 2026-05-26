/** Landlord booking review fit table. Kept in sync with `api/lib/bookingFitForAssessment.ts` (AI assessment). */
import type { Database } from './database.types'
import {
  propertyBillsIncluded,
  propertyHasParking,
  propertyPetsAllowed,
  featureNamesFromPropertyRow,
} from './propertyFeatureSignals'

export type FitRowStatus = 'match' | 'mismatch' | 'unknown'

export type BookingFitRow = {
  label: string
  studentSide: string
  propertySide: string
  status: FitRowStatus
}

type BookingRow = Database['public']['Tables']['bookings']['Row']
type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row'] & {
  property_features?: { features?: { name?: string | null } | null }[] | null
}

function normLease(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, '_')
}

/** Compare student-requested lease to listing text (best-effort). */
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

function propertyMaxOccupants(property: { max_occupants?: number | null } | null | undefined): number {
  const n = Math.floor(Number(property?.max_occupants))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(10, n)
}

function bookingOccupantCount(booking: Pick<BookingRow, 'occupant_count'>): number | null {
  const n = Math.floor(Number(booking.occupant_count))
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(10, n)
}

function occupancyMatch(
  occ: string | null | undefined,
  roomType: string | null | undefined,
  listingType: string | null | undefined,
  maxOccupants: number,
  bookOcc: number | null,
): FitRowStatus {
  if (bookOcc === 2) {
    return maxOccupants >= 2 ? 'match' : 'mismatch'
  }

  if (!occ) {
    if (bookOcc === 1) return 'match'
    return 'unknown'
  }

  const rt = (roomType ?? '').toLowerCase()
  const lt = (listingType ?? '').toLowerCase()
  if (occ === 'couple') {
    if (maxOccupants >= 2) return 'match'
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

function studentOccupancySide(occ: string | null | undefined, bookOcc: number | null): string {
  if (bookOcc === 2) return '2 occupants (booking)'
  if (bookOcc === 1) return '1 occupant (booking)'
  return occ ? occ.replace(/_/g, ' ') : 'Not specified'
}

function propertyOccupancySide(property: PropertyRow | null, maxOcc: number): string {
  const parts: string[] = [maxOcc >= 2 ? `Up to ${maxOcc} occupants` : '1 occupant max']
  const rt = property?.room_type?.trim()
  const lt = property?.listing_type?.trim()
  if (rt) parts.push(rt.replace(/_/g, ' '))
  if (lt && lt !== rt) parts.push(lt.replace(/_/g, ' '))
  return parts.join(' · ')
}

function parkingListingOk(property: PropertyRow | null, featureNames: string[]): boolean {
  if (property?.parking_available === true) return true
  return propertyHasParking(featureNames)
}

function parkingMatch(
  needsParking: boolean | null | undefined,
  parkingSelected: boolean | null | undefined,
  listingOk: boolean,
): FitRowStatus {
  if (parkingSelected === true) {
    return listingOk ? 'match' : 'mismatch'
  }
  if (parkingSelected === false) return 'match'
  if (needsParking == null) return 'unknown'
  if (needsParking) return listingOk ? 'match' : 'mismatch'
  return 'match'
}

function billsMatch(
  pref: string | null | undefined,
  included: boolean,
): FitRowStatus {
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

export function buildBookingFitSummary(args: {
  booking: Pick<
    BookingRow,
    'move_in_date' | 'start_date' | 'lease_length' | 'occupant_count' | 'parking_selected'
  >
  student: Pick<
    StudentRow,
    | 'occupancy_type'
    | 'move_in_flexibility'
    | 'has_pets'
    | 'needs_parking'
    | 'bills_preference'
    | 'furnishing_preference'
  >
  property: PropertyRow | null
}): BookingFitRow[] {
  const property = args.property
  const names = featureNamesFromPropertyRow(property)
  const billsInc = propertyBillsIncluded(names)
  const petsOk = propertyPetsAllowed(names)
  const maxOcc = propertyMaxOccupants(property)
  const bookOcc = bookingOccupantCount(args.booking)
  const parkOk = parkingListingOk(property, names)

  const moveIn = (args.booking.move_in_date || args.booking.start_date || '').slice(0, 10)
  const avail = property?.available_from ? String(property.available_from).slice(0, 10) : ''

  const rows: BookingFitRow[] = []

  const miStatus = moveInMatch(moveIn, avail, args.student.move_in_flexibility)
  rows.push({
    label: 'Move-in date',
    studentSide: moveIn ? `${moveIn}${args.student.move_in_flexibility ? ` (${args.student.move_in_flexibility.replace(/_/g, ' ')})` : ''}` : '—',
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
  const occStatus = occupancyMatch(
    occ,
    property?.room_type ?? null,
    property?.listing_type ?? null,
    maxOcc,
    bookOcc,
  )
  rows.push({
    label: 'Occupancy',
    studentSide: studentOccupancySide(occ, bookOcc),
    propertySide: propertyOccupancySide(property, maxOcc),
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

  const parkingSelected = args.booking.parking_selected
  const parkStatus = parkingMatch(args.student.needs_parking, parkingSelected, parkOk)
  const parkStudentSide =
    parkingSelected === true
      ? 'Carpark selected at booking'
      : parkingSelected === false
        ? 'No carpark at booking'
        : args.student.needs_parking == null
          ? 'Not specified'
          : args.student.needs_parking
            ? 'Needs parking (profile)'
            : 'No parking need (profile)'
  rows.push({
    label: 'Parking',
    studentSide: parkStudentSide,
    propertySide: parkOk
      ? property?.parking_available
        ? 'Carpark offered on listing'
        : 'Parking signal on listing'
      : 'No parking on listing',
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
