/// <reference types="node" />
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../../src/lib/database.types.js'
import { VicResidentialRentalAgreementForm1 } from '../../../documents/VicForm1Agreement.js'
import { QuniPlatformAddendumVic } from '../../../documents/QuniPlatformAddendumVic.js'
import type { QldGeneralTenancyAgreementProps } from '../../../documents/rtaTypes.js'
import { sendResidentialTenancyPackageForSigning } from '../../docuseal.js'
import { captureSentryMessageEdge } from '../../sentryEdgeCapture.js'
import { occupancyLeaseFieldsFromBooking } from '../../booking/occupancyLeaseContext.js'
import { bookingAllowsTenancyDocumentGeneration } from '../../booking/listingDocumentGenerationEligibility.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import {
  isListingContextLoadFail,
  listingContextLoadFailure,
} from '../../booking/listingContextLoad.js'
import {
  buildRtaRentPaymentMethodLine,
  fetchBankDetailsForRta,
  fetchPlatformBusinessIdentityForDocuments,
  fetchPlatformConfigValueMap,
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
  return parts.join(', ') || '-'
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
>

type LoadedVicForm1Context = {
  booking: BookingRow
  prop: Record<string, unknown>
  lp: LandlordProfileSlice
  sp: StudentProfileSlice
  moveIn: string
  weeklyRent: number
  leaseLen: string | null
  periodic: boolean
  endDate: string | null
  bondNum: number
  bankDetails: Awaited<ReturnType<typeof fetchBankDetailsForRta>>
  rentPaymentMethodLine: string
  managedPricingCell: Awaited<ReturnType<typeof getActivePricingSnapshotForProperty>>
  managedPricingDisplay: ReturnType<typeof formatFeeForDisplay>
  platformFeePercent: number
  platformFee: number
  totalWeekly: number
  rentEnquiriesEmail: string
  generalEnquiriesEmail: string
  platformDefaultHouseRules: string
  platformIdentity: Awaited<ReturnType<typeof fetchPlatformBusinessIdentityForDocuments>>
  occupancyLease: ReturnType<typeof occupancyLeaseFieldsFromBooking>
  rentPaymentPreference: 'bank_transfer' | 'quni_platform' | null
}

async function loadVicForm1Context(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts?: { requireConfirmable?: boolean },
): Promise<
  | { ok: true; ctx: LoadedVicForm1Context }
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
        house_rules
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

  const propertyState = typeof prop.state === 'string' ? prop.state.trim().toUpperCase() : ''
  if (propertyState !== 'VIC') {
    return { ok: false, status: 400, error: 'Property must be in Victoria (VIC) for Form 1 generation' }
  }

  const { data: lp, error: lpErr } = await admin
    .from('landlord_profiles')
    .select(
      'id, user_id, full_name, first_name, last_name, email, phone, address, suburb, state, postcode, company_name',
    )
    .eq('id', booking.landlord_id)
    .maybeSingle()

  const { data: sp, error: spErr } = await admin
    .from('student_profiles')
    .select(
      'id, user_id, full_name, first_name, last_name, email, phone, date_of_birth, emergency_contact_name, emergency_contact_phone',
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

  const bondNum =
    resolveBookingBondAmountAud(booking.bond_amount, prop, weeklyRent) ??
    Math.round(weeklyRent * 4 * 100) / 100

  let bankDetails: Awaited<ReturnType<typeof fetchBankDetailsForRta>>
  try {
    bankDetails = await fetchBankDetailsForRta(admin)
  } catch (e) {
    console.error('[vic-form1] platform_config bank fetch', e)
    await captureSentryMessageEdge('VIC Form 1: failed to load platform_config for bank details', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
    return { ok: false, status: 500, error: 'Could not load platform payment settings' }
  }

  if (!bankDetails.bsb || !bankDetails.accountNumber) {
    await captureSentryMessageEdge(
      'VIC Form 1: bank BSB or account number missing in platform_config',
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
    console.error('[vic-form1] platform_config communication emails', e)
    await captureSentryMessageEdge('VIC Form 1: failed to load platform_config for addendum emails', {
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
    console.error('[vic-form1] platform_config business identity', e)
    await captureSentryMessageEdge('VIC Form 1: failed to load platform_config business identity', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  const rpm = booking.rent_payment_method
  const rentPaymentPreference: 'bank_transfer' | 'quni_platform' | null =
    rpm === 'bank_transfer' || rpm === 'quni_platform' ? rpm : null

  const occupancyLease = occupancyLeaseFieldsFromBooking(booking, prop)

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
      bankDetails,
      rentPaymentMethodLine,
      managedPricingCell,
      managedPricingDisplay,
      platformFeePercent,
      platformFee,
      totalWeekly,
      rentEnquiriesEmail,
      generalEnquiriesEmail,
      platformDefaultHouseRules,
      platformIdentity,
      occupancyLease,
      rentPaymentPreference,
    },
  }
}

function buildVicForm1PdfProps(ctx: LoadedVicForm1Context, documentId: string) {
  const { booking, prop, lp, sp, occupancyLease } = ctx
  const { additionalTenantNames, maxOccupantsPermitted, specialConditions: coTenantSpecialConditions } =
    occupancyLease

  const generatedAt = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })
  const lpRec = lp as Record<string, unknown>

  const landlordFullName =
    [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp.full_name === 'string' ? lp.full_name : 'Landlord')
  const landlordPhoneRaw = typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone.trim() : '-'
  const urgentTradeLine =
    landlordPhoneRaw && landlordPhoneRaw !== '-'
      ? `${landlordFullName} - ${landlordPhoneRaw}`
      : landlordFullName

  const sharedLandlord = {
    fullName: landlordFullName,
    companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
    addressLine: landlordAddressLine(lpRec),
    email: typeof lp.email === 'string' ? lp.email : '-',
    phone: landlordPhoneRaw,
    residenceLocation: null,
  }

  const spRec = sp as Record<string, unknown>
  const emergencyContactNameRaw =
    typeof spRec.emergency_contact_name === 'string' ? spRec.emergency_contact_name.trim() : ''
  const emergencyContactPhoneRaw =
    typeof spRec.emergency_contact_phone === 'string' ? spRec.emergency_contact_phone.trim() : ''

  const sharedTenant = {
    fullName:
      [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
      (typeof sp.full_name === 'string' ? sp.full_name : 'Tenant'),
    email: typeof sp.email === 'string' ? sp.email : '-',
    phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone.trim() : '-',
    dateOfBirth:
      typeof sp.date_of_birth === 'string' && sp.date_of_birth.trim() ? sp.date_of_birth.trim() : null,
    emergencyContactName: emergencyContactNameRaw ? emergencyContactNameRaw : null,
    emergencyContactPhone: emergencyContactPhoneRaw ? emergencyContactPhoneRaw : null,
    addressForServiceLine: null,
  }

  const sharedPremises = {
    addressLine: propertyAddressLine(prop) || '-',
    propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
    roomType: typeof prop.room_type === 'string' ? prop.room_type : null,
    furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
    linenSupplied: typeof prop.linen_supplied === 'boolean' ? prop.linen_supplied : null,
    weeklyCleaningService:
      typeof prop.weekly_cleaning_service === 'boolean' ? prop.weekly_cleaning_service : null,
  }

  const inclusionParts: string[] = []
  if (sharedPremises.roomType?.trim()) inclusionParts.push(`Room: ${sharedPremises.roomType.trim()}`)
  if (typeof prop.furnished === 'boolean')
    inclusionParts.push(prop.furnished ? 'Furnished' : 'Unfurnished')
  const premisesInclusionsLine = inclusionParts.length > 0 ? inclusionParts.join('; ') : null

  const landlordPostcode =
    typeof lp.postcode === 'string' && lp.postcode.trim() ? lp.postcode.trim() : '-'
  const premisesPostcode =
    typeof prop.postcode === 'string' && prop.postcode.trim() ? prop.postcode.trim() : '-'

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

  const landlordEmailForService = typeof lp.email === 'string' && lp.email.trim() ? lp.email.trim() : '-'
  const tenantEmailForService = typeof sp.email === 'string' && sp.email.trim() ? sp.email.trim() : '-'

  const form1Props: QldGeneralTenancyAgreementProps = {
    documentId,
    generatedAt,
    landlord: sharedLandlord,
    tenant: sharedTenant,
    additionalTenantNames,
    premises: sharedPremises,
    premisesInclusionsLine,
    maxOccupantsPermitted,
    term: sharedTerm,
    rent: {
      ...sharedRent,
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: ctx.bondNum },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: urgentTradeLine,
      plumber: urgentTradeLine,
      other: null,
    },
    electronicService: {
      landlordEmail: landlordEmailForService,
      tenantEmail: tenantEmailForService,
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode,
    premisesPostcode,
    rentPaymentBankDetails: {
      bsb: ctx.bankDetails.bsb,
      accountNumber: ctx.bankDetails.accountNumber,
      accountName: ctx.bankDetails.accountName,
      bankName: ctx.bankDetails.bankName,
    },
    rentPaymentPreference: ctx.rentPaymentPreference,
    specialConditions: coTenantSpecialConditions,
    bookingNotes: typeof booking.notes === 'string' && booking.notes.trim() ? booking.notes.trim() : null,
  }

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
    signingPackage: 'residential_tenancy_vic' as const,
    rentPaymentMethod: ctx.rentPaymentPreference,
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
    additionalTenantNames,
  }

  return { form1Props, addendumProps }
}

async function buildVicForm1PdfBuffers(ctx: LoadedVicForm1Context, documentId: string): Promise<{
  form1Buffer: Buffer
  addendumBuffer: Buffer
}> {
  const { form1Props, addendumProps } = buildVicForm1PdfProps(ctx, documentId)
  const form1El = React.createElement(VicResidentialRentalAgreementForm1, form1Props)
  const addendumEl = React.createElement(QuniPlatformAddendumVic, addendumProps)
  const form1Buffer = await renderToBuffer(form1El as Parameters<typeof renderToBuffer>[0])
  const addendumBuffer = await renderToBuffer(addendumEl as Parameters<typeof renderToBuffer>[0])
  if (!form1Buffer.length || !addendumBuffer.length) {
    throw new Error('Generated PDF buffers are empty')
  }
  return { form1Buffer, addendumBuffer }
}

export async function preflightVicForm1ListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const loaded = await loadVicForm1Context(admin, bookingId, { requireConfirmable: false })
  if (isListingContextLoadFail(loaded)) {
    return listingContextLoadFailure(loaded)
  }
  try {
    await buildVicForm1PdfBuffers(loaded.ctx, PREFLIGHT_DOCUMENT_ID)
    return { ok: true, generator: 'vic-form1' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[vic-form1] preflight pdf build', e)
    return { ok: false, status: 500, error: 'Could not build tenancy agreement PDF', detail: msg }
  }
}

export async function runVicForm1ListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean },
): Promise<ListingDocGenResult> {
  const loaded = await loadVicForm1Context(admin, bookingId)
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
        metadata: { signing_package: 'residential_tenancy_vic' } as Json,
      })
      .select('id')
      .single()

    if (dErr || !insD) {
      console.error('tenancy_documents insert', dErr)
      return { ok: false, status: 500, error: 'Could not create tenancy document' }
    }
    documentId = insD.id
  }

  let form1Buffer: Buffer
  let addendumBuffer: Buffer
  try {
    const built = await buildVicForm1PdfBuffers(loaded.ctx, documentId)
    form1Buffer = built.form1Buffer
    addendumBuffer = built.addendumBuffer
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not build tenancy agreement PDF', detail: msg }
  }

  const rtaStoragePath = `${tenancyId}/residential_tenancy/vic_residential_rental_agreement_draft.pdf`
  const addendumStoragePath = `${tenancyId}/residential_tenancy/quni_platform_addendum_draft.pdf`

  const { error: rtaUpErr } = await admin.storage
    .from('tenancy-documents')
    .upload(rtaStoragePath, form1Buffer, { contentType: 'application/pdf', upsert: true })

  if (rtaUpErr) {
    console.error('storage upload VIC Form 1 draft', rtaUpErr)
    return { ok: false, status: 500, error: 'Could not upload VIC Form 1 PDF' }
  }

  const { error: addUpErr } = await admin.storage
    .from('tenancy-documents')
    .upload(addendumStoragePath, addendumBuffer, { contentType: 'application/pdf', upsert: true })

  if (addUpErr) {
    console.error('storage upload VIC addendum draft', addUpErr)
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
        signing_package: 'residential_tenancy_vic',
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

  let docusealSubmissionId: string | null = null
  if (hasDocuseal && !opts.deferSigning) {
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
