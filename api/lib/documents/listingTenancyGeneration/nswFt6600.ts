/// <reference types="node" />
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../../src/lib/database.types.js'
import { NswResidentialTenancyAgreement } from '../../../documents/NswResidentialTenancyAgreement.js'
import { QuniPlatformAddendum } from '../../../documents/QuniPlatformAddendum.js'
import type { NswResidentialTenancyAgreementProps } from '../../../documents/rtaTypes.js'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from '../buildNswFt6600AgreementProps.js'
import {
  missingFt6600LandlordScheduleFields,
  nswFt6600LandlordScheduleBlockedMessage,
  nswManagedFt6600LeaseGenerationBlocked,
  NSW_MANAGED_FT6600_GENERATION_BLOCKED_MESSAGE,
} from '../ft6600LandlordSchedule.js'
import {
  missingNswFt6600ComplianceFieldLabels,
  nswFt6600ComplianceBlockedMessage,
} from '../propertyFt6600Compliance.js'
import { bookingUsesNswFt6600Generator } from '../../resolveTenancyPackage.js'
import { buildOfficialNswFt6600PdfWithSigning } from '../officialNswFt6600Signing.js'
import { bookingRequiresCoTenantSignature } from '../../booking/coTenantSigning.js'
import { bookingAllowsTenancyDocumentGeneration } from '../../booking/listingDocumentGenerationEligibility.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import {
  isListingContextLoadFail,
  listingContextLoadFailure,
} from '../../booking/listingContextLoad.js'
import { sendResidentialTenancyPackageForSigning } from '../../docuseal.js'
import { captureSentryMessageEdge } from '../../sentryEdgeCapture.js'
import { occupancyLeaseFieldsFromBooking } from '../../booking/occupancyLeaseContext.js'
import {
  buildRtaRentPaymentMethodLine,
  fetchBankDetailsForRta,
  fetchPlatformBusinessIdentityForDocuments,
  fetchPlatformConfigValueMap,
  fetchPlatformRegisteredContactForDocuments,
} from '../../platformConfig.js'
import { resolveBookingBondAmountAud } from '../../booking/bookingBondAmount.js'
import {
  formatFeeForDisplay,
  getActivePricingSnapshotForProperty,
} from '../../pricing/index.js'

const PREFLIGHT_DOCUMENT_ID = '00000000-0000-4000-8000-000000000000'

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

type BookingRow = Database['public']['Tables']['bookings']['Row'] & {
  properties?: Record<string, unknown> | null
}

type LandlordProfileSlice = Pick<
  Database['public']['Tables']['landlord_profiles']['Row'],
  | 'id'
  | 'user_id'
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'suburb'
  | 'state'
  | 'postcode'
  | 'company_name'
  | 'residence_location'
>

type StudentProfileSlice = Pick<
  Database['public']['Tables']['student_profiles']['Row'],
  | 'id'
  | 'user_id'
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'date_of_birth'
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
  | 'workplace_address'
  | 'workplace_suburb'
  | 'workplace_state'
  | 'workplace_postcode'
>

type LoadedNswFt6600Context = {
  booking: BookingRow
  prop: Record<string, unknown>
  lp: LandlordProfileSlice
  sp: StudentProfileSlice
  moveIn: string
  weeklyRent: number
  leaseLen: string | null
  periodic: boolean
  endDate: string | null
  bondNum: number | null
  serviceTier: 'managed' | 'listing'
  bankDetails: Awaited<ReturnType<typeof fetchBankDetailsForRta>>
  rentPaymentMethodLine: string
  managedPricingCell: Awaited<ReturnType<typeof getActivePricingSnapshotForProperty>>
  managedPricingDisplay: ReturnType<typeof formatFeeForDisplay>
  platformFeePercent: number
  platformFee: number
  totalWeekly: number
  platformAgentForManaged: {
    name: string
    businessAddress: string
    suburb: string
    phone: string
    email: string
  } | null
  rentEnquiriesEmail: string
  generalEnquiriesEmail: string
  platformDefaultHouseRules: string
  platformIdentity: Awaited<ReturnType<typeof fetchPlatformBusinessIdentityForDocuments>>
  additionalTenantNames: string[]
  rentPaymentMethod: 'bank_transfer' | 'quni_platform' | null
}

async function loadNswFt6600Context(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts?: { requireConfirmable?: boolean },
): Promise<
  | { ok: true; ctx: LoadedNswFt6600Context }
  | { ok: false; status: number; error: string; detail?: string }
> {
  const { data: bookingRaw, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      property_id,
      student_id,
      landlord_id,
      status,
      service_tier_final,
      weekly_rent,
      move_in_date,
      start_date,
      end_date,
      lease_length,
      notes,
      housemates_count,
      occupant_count,
      co_tenant,
      rent_payment_method,
      properties (
        title,
        address,
        suburb,
        state,
        postcode,
        rent_per_week,
        max_occupants,
        room_type,
        property_type,
        is_registered_rooming_house,
        furnished,
        bond,
        bond_weeks,
        bond_is_fixed,
        bond_fixed_amount,
        linen_supplied,
        weekly_cleaning_service,
        house_rules,
        smoke_alarm_type,
        smoke_alarm_battery_tenant_replaceable,
        smoke_alarm_battery_type,
        smoke_alarm_backup_tenant_replaceable,
        smoke_alarm_backup_battery_type,
        strata_oc_responsible_for_alarms,
        water_usage_charged_separately,
        electricity_embedded_network,
        gas_embedded_network,
        strata_bylaws_applicable,
        property_features (
          features ( name )
        )
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !bookingRaw) {
    return { ok: false, status: 404, error: 'Booking not found' }
  }

  const booking = bookingRaw as BookingRow

  if (opts?.requireConfirmable !== false && !bookingAllowsTenancyDocumentGeneration(booking)) {
    return { ok: false, status: 400, error: 'Booking must be confirmed' }
  }

  if (!booking.property_id || !booking.student_id || !booking.landlord_id) {
    return { ok: false, status: 400, error: 'Booking missing property or profile ids' }
  }

  const prop =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? (booking.properties as Record<string, unknown>)
      : {}

  const serviceTierForGate = booking.service_tier_final === 'managed' ? 'managed' : 'listing'

  if (bookingUsesNswFt6600Generator(booking as unknown as Record<string, unknown>, prop)) {
    if (
      nswManagedFt6600LeaseGenerationBlocked({
        propertyState: typeof prop.state === 'string' ? prop.state : null,
        propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
        isRegisteredRoomingHouse:
          typeof prop.is_registered_rooming_house === 'boolean' ? prop.is_registered_rooming_house : null,
        serviceTier: serviceTierForGate,
      })
    ) {
      return {
        ok: false,
        status: 400,
        error: 'nsw_managed_ft6600_gated',
        detail: NSW_MANAGED_FT6600_GENERATION_BLOCKED_MESSAGE,
      }
    }

    const missingCompliance = missingNswFt6600ComplianceFieldLabels(prop)
    if (missingCompliance.length > 0) {
      return {
        ok: false,
        status: 400,
        error: 'ft6600_compliance_incomplete',
        detail: nswFt6600ComplianceBlockedMessage(missingCompliance),
      }
    }

    const { data: lpForSchedule } = await admin
      .from('landlord_profiles')
      .select(
        'id, user_id, full_name, first_name, last_name, email, phone, address, suburb, state, postcode, company_name, residence_location',
      )
      .eq('id', booking.landlord_id)
      .maybeSingle()

    const missingLandlord = missingFt6600LandlordScheduleFields(
      (lpForSchedule ?? {}) as Record<string, unknown>,
      serviceTierForGate,
    )
    if (missingLandlord.length > 0) {
      return {
        ok: false,
        status: 400,
        error: 'ft6600_landlord_profile_incomplete',
        detail: nswFt6600LandlordScheduleBlockedMessage(missingLandlord),
      }
    }
  }

  const { data: lp, error: lpErr } = await admin
    .from('landlord_profiles')
    .select(
      'id, user_id, full_name, first_name, last_name, email, phone, address, suburb, state, postcode, company_name, residence_location',
    )
    .eq('id', booking.landlord_id)
    .maybeSingle()

  const { data: sp, error: spErr } = await admin
    .from('student_profiles')
    .select(
      'id, user_id, full_name, first_name, last_name, email, phone, date_of_birth, emergency_contact_name, emergency_contact_phone, workplace_address, workplace_suburb, workplace_state, workplace_postcode',
    )
    .eq('id', booking.student_id)
    .maybeSingle()

  if (lpErr || spErr || !lp || !sp) {
    return { ok: false, status: 500, error: 'Could not load profiles' }
  }

  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  if (!moveIn) {
    return { ok: false, status: 400, error: 'Booking missing move-in / start date' }
  }

  const weeklyRent = Number(booking.weekly_rent)
  if (!Number.isFinite(weeklyRent) || weeklyRent <= 0) {
    return { ok: false, status: 400, error: 'Invalid weekly rent' }
  }

  const leaseLen = typeof booking.lease_length === 'string' ? booking.lease_length : null
  const bookingEndRaw = typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null
  const bookingEnd =
    bookingEndRaw && /^\d{4}-\d{2}-\d{2}$/.test(bookingEndRaw) ? bookingEndRaw : null
  const periodic = leaseLen === 'Flexible'
  const computedEnd = periodic ? null : leaseEndDateFromMoveIn(moveIn, leaseLen)
  const endDate = periodic ? null : bookingEnd || computedEnd

  const bondNum = resolveBookingBondAmountAud(booking.bond_amount, prop, weeklyRent)

  let bankDetails: Awaited<ReturnType<typeof fetchBankDetailsForRta>>
  try {
    bankDetails = await fetchBankDetailsForRta(admin)
  } catch (e) {
    console.error('[nsw-ft6600] platform_config bank fetch', e)
    await captureSentryMessageEdge('Residential tenancy: failed to load platform_config for bank details', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
    return { ok: false, status: 500, error: 'Could not load platform payment settings' }
  }

  if (!bankDetails.bsb || !bankDetails.accountNumber) {
    await captureSentryMessageEdge(
      'Residential tenancy: bank BSB or account number missing in platform_config',
      { booking_id: bookingId },
    )
    return {
      ok: false,
      status: 400,
      error:
        'Rent payment details are not configured: set bank BSB and account number under Admin → Business settings before generating this document.',
    }
  }

  const rentPaymentMethodLine = buildRtaRentPaymentMethodLine(bankDetails)
  const managedPricingCell = await getActivePricingSnapshotForProperty(booking.property_id, 'managed')
  const managedPricingDisplay = formatFeeForDisplay(managedPricingCell)
  const platformFeePercent =
    managedPricingCell.fee_mode === 'percent' ? Number(managedPricingCell.fee_percent || 0) : 0
  const platformFee = Math.round(weeklyRent * (platformFeePercent / 100) * 100) / 100
  const totalWeekly = Math.round((weeklyRent + platformFee) * 100) / 100

  const serviceTier = booking.service_tier_final === 'managed' ? 'managed' : 'listing'

  let platformAgentForManaged: LoadedNswFt6600Context['platformAgentForManaged'] = null
  if (serviceTier === 'managed') {
    try {
      const [platformIdentity, platformContact] = await Promise.all([
        fetchPlatformBusinessIdentityForDocuments(admin),
        fetchPlatformRegisteredContactForDocuments(admin),
      ])
      platformAgentForManaged = {
        name: platformIdentity.legalName || 'Quni Living Pty Ltd',
        businessAddress: platformContact.registeredAddressLine,
        suburb: platformContact.suburb,
        phone: platformContact.phone,
        email: platformContact.email,
      }
    } catch (e) {
      console.error('[nsw-ft6600] platform_config managed agent contact', e)
      await captureSentryMessageEdge(
        'Residential tenancy: failed to load platform registered address for managed FT6600',
        { booking_id: bookingId, error: e instanceof Error ? e.message : String(e) },
      )
    }
  }

  let rentEnquiriesEmail = ''
  let generalEnquiriesEmail = ''
  let platformDefaultHouseRules = ''
  try {
    const commMap = await fetchPlatformConfigValueMap(admin, [
      'docs.sender_email',
      'contact.email',
      'house_rules.default',
    ])
    rentEnquiriesEmail = (commMap['docs.sender_email'] ?? '').trim()
    generalEnquiriesEmail = (commMap['contact.email'] ?? '').trim()
    platformDefaultHouseRules = (commMap['house_rules.default'] ?? '').trim()
  } catch (e) {
    console.error('[nsw-ft6600] platform_config communication emails', e)
    await captureSentryMessageEdge('Residential tenancy: failed to load platform_config for addendum emails', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  let platformIdentity = {
    legalName: '',
    abn: '',
    acn: '',
    directorName: '',
  }
  try {
    platformIdentity = await fetchPlatformBusinessIdentityForDocuments(admin)
  } catch (e) {
    console.error('[nsw-ft6600] platform_config business identity', e)
    await captureSentryMessageEdge('Residential tenancy: failed to load platform_config business identity', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  const { additionalTenantNames } = occupancyLeaseFieldsFromBooking(booking, prop)
  const rpm = booking.rent_payment_method
  const rentPaymentMethod: 'bank_transfer' | 'quni_platform' | null =
    rpm === 'bank_transfer' || rpm === 'quni_platform' ? rpm : null

  return {
    ok: true,
    ctx: {
      booking,
      prop,
      lp,
      sp,
      moveIn,
      weeklyRent,
      leaseLen,
      periodic,
      endDate,
      bondNum,
      serviceTier,
      bankDetails,
      rentPaymentMethodLine,
      managedPricingCell,
      managedPricingDisplay,
      platformFeePercent,
      platformFee,
      totalWeekly,
      platformAgentForManaged,
      rentEnquiriesEmail,
      generalEnquiriesEmail,
      platformDefaultHouseRules,
      platformIdentity,
      additionalTenantNames,
      rentPaymentMethod,
    },
  }
}

function buildNswFt6600PdfProps(ctx: LoadedNswFt6600Context, documentId: string) {
  const { booking, prop, lp, sp } = ctx
  const lpRec = lp as Record<string, unknown>
  const spRec = sp as Record<string, unknown>
  const generatedAt = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })

  const landlordFullName =
    [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp.full_name === 'string' ? lp.full_name : 'Landlord')
  const landlordPhoneRaw = typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone.trim() : ''

  const sharedLandlord = {
    fullName: landlordFullName,
    companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
    addressLine: landlordAddressLine(lpRec),
    email: typeof lp.email === 'string' ? lp.email.trim() : '',
    phone: landlordPhoneRaw,
  }

  const emergencyContactNameRaw =
    typeof spRec.emergency_contact_name === 'string' ? spRec.emergency_contact_name.trim() : ''
  const emergencyContactPhoneRaw =
    typeof spRec.emergency_contact_phone === 'string' ? spRec.emergency_contact_phone.trim() : ''

  const sharedTenant = {
    fullName:
      [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
      (typeof sp.full_name === 'string' ? sp.full_name : 'Tenant'),
    email: typeof sp.email === 'string' ? sp.email.trim() : '',
    phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone.trim() : '',
    dateOfBirth:
      typeof sp.date_of_birth === 'string' && sp.date_of_birth.trim() ? sp.date_of_birth.trim() : null,
    emergencyContactName: emergencyContactNameRaw ? emergencyContactNameRaw : null,
    emergencyContactPhone: emergencyContactPhoneRaw ? emergencyContactPhoneRaw : null,
    addressForServiceLine: studentAddressForServiceLine(spRec),
  }

  const sharedPremises = {
    addressLine: propertyAddressLine(prop),
    propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
    roomType: typeof prop.room_type === 'string' ? prop.room_type : null,
    furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
    linenSupplied: typeof prop.linen_supplied === 'boolean' ? prop.linen_supplied : null,
    weeklyCleaningService:
      typeof prop.weekly_cleaning_service === 'boolean' ? prop.weekly_cleaning_service : null,
  }

  const sharedTerm = {
    startDate: ctx.moveIn,
    endDate: ctx.periodic ? null : ctx.endDate,
    periodic: ctx.periodic,
    leaseLengthDescription: ctx.leaseLen || 'As agreed',
  }

  const sharedRent = {
    weeklyRent: ctx.weeklyRent,
    platformFeePercent: ctx.platformFeePercent,
    totalWeekly: ctx.totalWeekly,
    paymentMethod: ctx.rentPaymentMethodLine,
  }

  const rtaProps: NswResidentialTenancyAgreementProps = buildNswResidentialTenancyAgreementPropsFromBooking({
    documentId,
    generatedAt,
    booking: booking as unknown as Record<string, unknown>,
    landlordProfile: lpRec,
    studentProfile: spRec,
    property: prop,
    bankDetails: ctx.bankDetails,
    managedPlatformFeePercent: ctx.platformFeePercent,
    serviceTier: ctx.serviceTier,
    platformAgentForManaged: ctx.platformAgentForManaged,
  })

  const ecName = (sharedTenant.emergencyContactName ?? '').trim()
  const ecPhone = (sharedTenant.emergencyContactPhone ?? '').trim()
  const emergencyContact =
    ecName && ecPhone ? `${ecName} - ${ecPhone}` : ecPhone || ecName || '-'

  const rawCap = Number(ctx.managedPricingCell.utilities_cap_aud ?? 0)
  const utilitiesCap = Number.isFinite(rawCap) && rawCap >= 0 ? rawCap : 0

  const houseRulesFromProperty =
    typeof prop.house_rules === 'string' ? prop.house_rules.trim() : ''
  const houseRules = houseRulesFromProperty || ctx.platformDefaultHouseRules

  const addendumProps = {
    documentId,
    generatedAt,
    landlord: sharedLandlord,
    tenant: sharedTenant,
    premises: sharedPremises,
    term: sharedTerm,
    rent: sharedRent,
    bond: { amount: ctx.bondNum },
    utilitiesDescription:
      'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.',
    signingPackage: 'residential_tenancy' as const,
    rentPaymentMethod: ctx.rentPaymentMethod,
    bankDetails: {
      bsb: ctx.bankDetails.bsb,
      accountNumber: ctx.bankDetails.accountNumber,
      accountName: ctx.bankDetails.accountName,
      bankName: ctx.bankDetails.bankName,
    },
    emergencyContact,
    rentEnquiriesEmail: ctx.rentEnquiriesEmail,
    generalEnquiriesEmail: ctx.generalEnquiriesEmail,
    houseCommunicationsChannel: 'Property WhatsApp group (house-related only)',
    utilitiesCap,
    houseRules,
    landlordServiceFeeText: ctx.managedPricingDisplay.landlordFeeDisplay,
    cardSurchargeDomesticText: ctx.managedPricingDisplay.cardSurchargeDomestic,
    cardSurchargeInternationalText: ctx.managedPricingDisplay.cardSurchargeInternational,
    moveOutLateCheckoutFeeText: ctx.managedPricingDisplay.studentFeeFixedDisplay,
    moveOutInternationalTransferFeeText: ctx.managedPricingDisplay.studentFeeFixedDisplay,
    platformLegalName: ctx.platformIdentity.legalName || undefined,
    platformAbn: ctx.platformIdentity.abn || undefined,
    platformAcn: ctx.platformIdentity.acn || undefined,
    platformDirectorName: ctx.platformIdentity.directorName || undefined,
    additionalTenantNames: ctx.additionalTenantNames,
  }

  return { rtaProps, addendumProps }
}

async function buildNswFt6600PdfBuffers(
  ctx: LoadedNswFt6600Context,
  documentId: string,
): Promise<{ rtaBuffer: Buffer; addendumBuffer: Buffer; officialBodyHasDocusealTags: boolean }> {
  const { rtaProps, addendumProps } = buildNswFt6600PdfProps(ctx, documentId)
  const useOfficialFt6600Fill =
    (process.env.NSW_USE_OFFICIAL_FT6600_REACT_PDF_FALLBACK || '').trim() !== '1'

  let rtaBuffer: Buffer
  let officialBodyHasDocusealTags = false
  if (useOfficialFt6600Fill) {
    const includeCoTenantSignatureTags = bookingRequiresCoTenantSignature(ctx.booking)
    const built = await buildOfficialNswFt6600PdfWithSigning(rtaProps, { includeCoTenantSignatureTags })
    rtaBuffer = Buffer.from(built.pdfBytes)
    officialBodyHasDocusealTags = built.hasDocusealTags
  } else {
    const rtaEl = React.createElement(NswResidentialTenancyAgreement, rtaProps)
    rtaBuffer = await renderToBuffer(rtaEl as Parameters<typeof renderToBuffer>[0])
    officialBodyHasDocusealTags = true
  }

  const addendumEl = React.createElement(QuniPlatformAddendum, addendumProps)
  const addendumBuffer = await renderToBuffer(addendumEl as Parameters<typeof renderToBuffer>[0])

  if (!rtaBuffer.length || !addendumBuffer.length) {
    throw new Error('Generated PDF buffers are empty')
  }

  return { rtaBuffer, addendumBuffer, officialBodyHasDocusealTags }
}

export async function preflightNswFt6600ListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const loaded = await loadNswFt6600Context(admin, bookingId, { requireConfirmable: false })
  if (isListingContextLoadFail(loaded)) {
    return listingContextLoadFailure(loaded)
  }
  try {
    await buildNswFt6600PdfBuffers(loaded.ctx, PREFLIGHT_DOCUMENT_ID)
    return { ok: true, generator: 'nsw-ft6600' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[nsw-ft6600] preflight pdf build', e)
    return { ok: false, status: 500, error: 'Could not build tenancy agreement PDF', detail: msg }
  }
}

export async function runNswFt6600ListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean },
): Promise<ListingDocGenResult> {
  const loaded = await loadNswFt6600Context(admin, bookingId)
  if (isListingContextLoadFail(loaded)) {
    return listingContextLoadFailure(loaded)
  }

  const { booking, lp, moveIn, weeklyRent, periodic, endDate, bondNum } = loaded.ctx
  const bookingIdStr = booking.id

  const { data: existingTenancy } = await admin.from('tenancies').select('id').eq('booking_id', bookingIdStr).maybeSingle()

  let tenancyId = existingTenancy?.id
  if (!tenancyId) {
    const { data: insT, error: tInsErr } = await admin
      .from('tenancies')
      .insert({
        booking_id: bookingIdStr,
        property_id: booking.property_id!,
        landlord_profile_id: booking.landlord_id!,
        student_profile_id: booking.student_id!,
        start_date: moveIn,
        end_date: periodic ? null : endDate,
        weekly_rent: weeklyRent,
        bond_amount: bondNum,
        status: 'active',
      })
      .select('id')
      .single()

    if (tInsErr || !insT) {
      console.error('tenancy insert', tInsErr)
      return { ok: false, status: 500, error: 'Could not create tenancy' }
    }
    tenancyId = insT.id
  }

  const { data: existingRta } = await admin
    .from('tenancy_documents')
    .select('id, status')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'residential_tenancy')
    .maybeSingle()

  const existingRtaStatus = existingRta?.status
  if (existingRtaStatus === 'signed') {
    return {
      ok: true,
      tenancyId,
      documentId: existingRta!.id,
    }
  }

  const refreshDraftPdfsOnly = existingRtaStatus === 'sent_for_signing'
  const landlordUserId = typeof lp.user_id === 'string' ? lp.user_id : null

  let documentId: string
  if (existingRta?.id) {
    documentId = existingRta.id
  } else {
    const { data: insD, error: dErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancyId,
        document_type: 'residential_tenancy',
        status: 'draft',
        generated_by: landlordUserId,
        metadata: { signing_package: 'residential_tenancy' } as Json,
      })
      .select('id')
      .single()

    if (dErr || !insD) {
      console.error('tenancy_documents insert', dErr)
      return { ok: false, status: 500, error: 'Could not create tenancy document' }
    }
    documentId = insD.id
  }

  let rtaBuffer: Buffer
  let addendumBuffer: Buffer
  let officialBodyHasDocusealTags = false
  try {
    const built = await buildNswFt6600PdfBuffers(loaded.ctx, documentId)
    rtaBuffer = built.rtaBuffer
    addendumBuffer = built.addendumBuffer
    officialBodyHasDocusealTags = built.officialBodyHasDocusealTags
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not build tenancy agreement PDF', detail: msg }
  }

  const rtaStoragePath = `${tenancyId}/residential_tenancy/nsw_residential_tenancy_agreement_draft.pdf`
  const addendumStoragePath = `${tenancyId}/residential_tenancy/quni_platform_addendum_draft.pdf`

  const { error: rtaUpErr } = await admin.storage
    .from('tenancy-documents')
    .upload(rtaStoragePath, rtaBuffer, { contentType: 'application/pdf', upsert: true })

  if (rtaUpErr) {
    console.error('storage upload NSW RTA draft', rtaUpErr)
    return { ok: false, status: 500, error: 'Could not upload NSW RTA PDF' }
  }

  const { error: addUpErr } = await admin.storage
    .from('tenancy-documents')
    .upload(addendumStoragePath, addendumBuffer, { contentType: 'application/pdf', upsert: true })

  if (addUpErr) {
    console.error('storage upload addendum draft', addUpErr)
    return { ok: false, status: 500, error: 'Could not upload addendum PDF' }
  }

  if (refreshDraftPdfsOnly) {
    return { ok: true, tenancyId, documentId }
  }

  const { error: pathErr } = await admin
    .from('tenancy_documents')
    .update({
      file_path: rtaStoragePath,
      status: 'draft',
      metadata: {
        signing_package: 'residential_tenancy',
        addendum_file_path: addendumStoragePath,
      } as Json,
    })
    .eq('id', documentId)

  if (pathErr) {
    console.error('tenancy_documents update path', pathErr)
    return { ok: false, status: 500, error: 'Could not save file path' }
  }

  const hasDocuseal =
    (process.env.DOCUSEAL_API_URL || '').trim() && (process.env.DOCUSEAL_API_TOKEN || '').trim()
  const useOfficialFt6600Fill =
    (process.env.NSW_USE_OFFICIAL_FT6600_REACT_PDF_FALLBACK || '').trim() !== '1'
  const skipDocusealNoTags = useOfficialFt6600Fill && !officialBodyHasDocusealTags

  let docusealSubmissionId: string | null = null
  if (hasDocuseal && !opts.deferSigning && !skipDocusealNoTags) {
    try {
      await sendResidentialTenancyPackageForSigning(documentId, { submitterSignReason: false })
      const { data: docRow } = await admin
        .from('tenancy_documents')
        .select('docuseal_submission_id, status')
        .eq('id', documentId)
        .maybeSingle()
      docusealSubmissionId =
        typeof docRow?.docuseal_submission_id === 'string' ? docRow.docuseal_submission_id : null
      if (!docusealSubmissionId && docRow?.status !== 'sent_for_signing') {
        return {
          ok: false,
          status: 500,
          error: 'DocuSeal submission was not created',
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('sendResidentialTenancyPackageForSigning', e)
      return { ok: false, status: 500, error: 'Could not send agreement for signing', detail: msg }
    }
  }

  return { ok: true, tenancyId, documentId, docusealSubmissionId }
}
