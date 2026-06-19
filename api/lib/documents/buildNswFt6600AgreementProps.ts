/**
 * Build NswResidentialTenancyAgreementProps the same way as generate-residential-tenancy.
 * Shared with E2E fill tests (booking row → props → fill → flatten).
 */
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'
import { occupancyLeaseFieldsFromBooking } from '../booking/occupancyLeaseContext.js'
import { resolveBookingBondAmountAud } from '../booking/bookingBondAmount.js'
import { buildRtaRentPaymentMethodLine } from '../platformConfig.js'
import { featureNamesFromPropertyRow, propertyBillsIncluded } from '../../../src/lib/propertyFeatureSignals.js'
import {
  ft6600LandlordResidenceLine,
  hasManagingAgentForFt6600,
} from './ft6600LandlordSchedule.js'
import {
  nswFt6600ComplianceFromPropertyRow,
  nswFt6600PremisesInclusionsFromPropertyRow,
} from './propertyFt6600Compliance.js'

export type Ft6600BankDetails = {
  bsb: string
  accountNumber: string
  accountName: string
  bankName: string
}

export type BuildNswFt6600AgreementPropsInput = {
  documentId: string
  generatedAt: string
  booking: Record<string, unknown>
  landlordProfile: Record<string, unknown>
  studentProfile: Record<string, unknown>
  property: Record<string, unknown>
  bankDetails: Ft6600BankDetails
  managedPlatformFeePercent?: number
  serviceTier?: 'listing' | 'managed'
  /** Managed tier: Quni as landlord's agent (registered address + contact). */
  platformAgentForManaged?: {
    name: string
    businessAddress: string
    suburb: string
    phone: string
    email: string
  } | null
}

function leaseEndDateFromMoveIn(moveInIso: string, leaseLength: string | null): string | null {
  const raw = moveInIso.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return null
  const start = new Date(Date.UTC(y, m - 1, d))
  let weeks = 52
  if (leaseLength === '3 months') weeks = 13
  else if (leaseLength === '6 months') weeks = 26
  else if (leaseLength === '12 months') weeks = 52
  else if (leaseLength === '2 years') weeks = 104
  else if (leaseLength === 'Flexible') weeks = 104
  const end = new Date(start.getTime() + weeks * 7 * 86400000)
  return end.toISOString().slice(0, 10)
}

function propertyAddressLine(p: Record<string, unknown>): string {
  const parts = [
    typeof p.address === 'string' ? p.address.trim() : '',
    typeof p.suburb === 'string' ? p.suburb.trim() : '',
    typeof p.state === 'string' ? p.state.trim() : '',
    typeof p.postcode === 'string' ? p.postcode.trim() : '',
  ].filter(Boolean)
  return parts.join(', ')
}

function landlordAddressLine(lp: Record<string, unknown>): string {
  const parts = [
    typeof lp.address === 'string' ? lp.address.trim() : '',
    typeof lp.suburb === 'string' ? lp.suburb.trim() : '',
    typeof lp.state === 'string' ? lp.state.trim() : '',
    typeof lp.postcode === 'string' ? lp.postcode.trim() : '',
  ].filter(Boolean)
  return parts.join(', ')
}

function studentAddressForServiceLine(sp: Record<string, unknown>): string | null {
  const parts = [
    typeof sp.workplace_address === 'string' ? sp.workplace_address.trim() : '',
    typeof sp.workplace_suburb === 'string' ? sp.workplace_suburb.trim() : '',
    typeof sp.workplace_state === 'string' ? sp.workplace_state.trim() : '',
    typeof sp.workplace_postcode === 'string' ? sp.workplace_postcode.trim() : '',
  ].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join(', ')
}

/** Same props object shape as POST /api/documents/generate-residential-tenancy before PDF render. */
export function buildNswResidentialTenancyAgreementPropsFromBooking(
  input: BuildNswFt6600AgreementPropsInput,
): NswResidentialTenancyAgreementProps {
  const { booking, landlordProfile: lp, studentProfile: sp, property: prop, bankDetails, documentId, generatedAt } =
    input

  const moveIn = String(booking.move_in_date || booking.start_date || '').slice(0, 10)
  const weeklyRent = Number(booking.weekly_rent)
  const leaseLen = typeof booking.lease_length === 'string' ? booking.lease_length : null
  const bookingEndRaw = typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null
  const bookingEnd = bookingEndRaw && /^\d{4}-\d{2}-\d{2}$/.test(bookingEndRaw) ? bookingEndRaw : null
  const periodic = leaseLen === 'Flexible'
  const computedEnd = periodic ? null : leaseEndDateFromMoveIn(moveIn, leaseLen)
  const endDate = periodic ? null : bookingEnd || computedEnd

  const bondNum =
    resolveBookingBondAmountAud(booking.bond_amount, prop.bond, weeklyRent) ??
    Math.round(weeklyRent * 4 * 100) / 100

  const platformFeePercent = input.managedPlatformFeePercent ?? 0
  const totalWeekly = Math.round((weeklyRent + weeklyRent * (platformFeePercent / 100)) * 100) / 100

  const lpRec = lp as Record<string, unknown>
  const spRec = sp as Record<string, unknown>
  const occupancyLease = occupancyLeaseFieldsFromBooking(booking, prop)
  const { additionalTenantNames, maxOccupantsPermitted, specialConditions: coTenantSpecialConditions } =
    occupancyLease

  const landlordFullName =
    [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp.full_name === 'string' ? lp.full_name : 'Landlord')

  const featureNames = featureNamesFromPropertyRow(
    prop as Parameters<typeof featureNamesFromPropertyRow>[0],
  )
  const billsIncluded = propertyBillsIncluded(featureNames)

  const serviceTier = input.serviceTier === 'managed' ? 'managed' : 'listing'
  const hasManagingAgent = hasManagingAgentForFt6600(serviceTier)
  const platformAgent = input.platformAgentForManaged
  const landlordAgent =
    hasManagingAgent && platformAgent
      ? {
          name: platformAgent.name,
          licenseNumber: null as string | null,
          businessAddress: platformAgent.businessAddress,
          phone: platformAgent.phone,
          email: platformAgent.email || null,
        }
      : null
  const residenceLine = ft6600LandlordResidenceLine(lpRec)
  const listingServiceAddressLine = landlordAddressLine(lpRec)

  return {
    documentId,
    generatedAt,
    serviceTier,
    landlord: {
      fullName: landlordFullName,
      companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
      addressLine: hasManagingAgent ? '' : listingServiceAddressLine,
      email: typeof lp.email === 'string' ? lp.email.trim() : '',
      phone: typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone.trim() : '',
      residenceLocation: residenceLine || null,
    },
    tenant: {
      fullName:
        [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
        (typeof sp.full_name === 'string' ? sp.full_name : 'Tenant'),
      email: typeof sp.email === 'string' ? sp.email.trim() : '',
      phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone.trim() : '',
      dateOfBirth:
        typeof sp.date_of_birth === 'string' && sp.date_of_birth.trim() ? sp.date_of_birth.trim() : null,
      emergencyContactName:
        typeof sp.emergency_contact_name === 'string' && sp.emergency_contact_name.trim()
          ? sp.emergency_contact_name.trim()
          : null,
      emergencyContactPhone:
        typeof sp.emergency_contact_phone === 'string' && sp.emergency_contact_phone.trim()
          ? sp.emergency_contact_phone.trim()
          : null,
      addressForServiceLine: studentAddressForServiceLine(spRec),
    },
    additionalTenantNames,
    premises: {
      addressLine: propertyAddressLine(prop),
      propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
      roomType: typeof prop.room_type === 'string' ? prop.room_type : null,
      furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
      linenSupplied: typeof prop.linen_supplied === 'boolean' ? prop.linen_supplied : null,
      weeklyCleaningService:
        typeof prop.weekly_cleaning_service === 'boolean' ? prop.weekly_cleaning_service : null,
    },
    premisesPartDescription: null,
    additionalPremisesInclusions: nswFt6600PremisesInclusionsFromPropertyRow(prop),
    maxOccupantsPermitted,
    term: {
      startDate: moveIn,
      endDate: periodic ? null : endDate,
      periodic,
      leaseLengthDescription: leaseLen || 'As agreed',
    },
    rent: {
      weeklyRent,
      platformFeePercent,
      totalWeekly,
      paymentMethod: buildRtaRentPaymentMethodLine(bankDetails),
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: bondNum },
    landlordAgent,
    urgentRepairsTradespeople: {
      electrician: null,
      plumber: null,
      other: null,
    },
    billsIncluded,
    propertyCompliance: nswFt6600ComplianceFromPropertyRow(prop),
    electronicService: {
      landlordEmail: typeof lp.email === 'string' && lp.email.trim() ? lp.email.trim() : '',
      tenantEmail: typeof sp.email === 'string' && sp.email.trim() ? sp.email.trim() : '',
      landlordConsentsToEmailService: false,
      tenantConsentsToEmailService: false,
    },
    specialConditions: coTenantSpecialConditions,
    bookingNotes: typeof booking.notes === 'string' && booking.notes.trim() ? booking.notes.trim() : null,
  }
}
