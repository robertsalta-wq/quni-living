/// <reference types="node" />
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import { QuniOccupancyAgreementQld } from '../../../documents/QldOccupancyAgreement.js'
import type { OccupancyAgreementProps } from '../../../documents/rtaTypes.js'
import { occupancyLeaseFieldsFromBooking } from '../../booking/occupancyLeaseContext.js'
import { bookingAllowsTenancyDocumentGeneration } from '../../booking/listingDocumentGenerationEligibility.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import {
  isListingContextLoadFail,
  listingContextLoadFailure,
} from '../../booking/listingContextLoad.js'
import { resolveBookingBondAmountAud } from '../../booking/bookingBondAmount.js'
import { getManagedLandlordFeePercentForProperty, sendForSigning } from '../../docuseal.js'
import {
  isQldOnSiteBoarderLodgerListing,
  parseRoomsRentedToResidents,
  qldSection43PdfAcknowledgement,
} from '../../../../src/lib/tenancy/qldBoarderLodger.js'

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
>

type LoadedQldOccupancyContext = {
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
  platformFeePercent: number
  paymentMethod: string
  coTenantSpecialConditions: string[]
  roomsForResidents: number | null
}

async function loadQldOccupancyContext(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts?: { requireConfirmable?: boolean },
): Promise<
  | { ok: true; ctx: LoadedQldOccupancyContext }
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
      occupant_count,
      co_tenant,
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
        rooms_rented_to_residents
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

  const stateRaw = typeof prop.state === 'string' ? prop.state.trim().toUpperCase() : ''
  if (stateRaw !== 'QLD') {
    return { ok: false, status: 400, error: 'Property must be in Queensland for QLD occupancy PDF' }
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
    .select('id, user_id, full_name, first_name, last_name, email, phone, date_of_birth')
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
  const endDate = leaseEndDateFromMoveIn(moveIn, leaseLen)
  const periodic = leaseLen === 'Flexible' || endDate == null

  const bondNum = resolveBookingBondAmountAud(booking.bond_amount, prop, weeklyRent)

  const serviceTier = booking.service_tier_final === 'managed' ? 'managed' : 'listing'
  const platformFeePercent =
    serviceTier === 'managed'
      ? await getManagedLandlordFeePercentForProperty(booking.property_id)
      : 0
  const paymentMethod =
    serviceTier === 'listing'
      ? 'Direct credit to owner account (fee-free). Reference: resident name and property address.'
      : 'Via Quni Living platform (quni.com.au)'

  const { specialConditions: coTenantSpecialConditions } = occupancyLeaseFieldsFromBooking(booking, prop)

  const propertyType = typeof prop.property_type === 'string' ? prop.property_type.trim() : ''
  const qldOnSite = isQldOnSiteBoarderLodgerListing(stateRaw, propertyType)
  const roomsForResidents =
    parseRoomsRentedToResidents(prop.rooms_rented_to_residents) ?? (qldOnSite ? 1 : null)

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
      platformFeePercent,
      paymentMethod,
      coTenantSpecialConditions,
      roomsForResidents,
    },
  }
}

function buildQldOccupancyPdfProps(ctx: LoadedQldOccupancyContext, documentId: string): OccupancyAgreementProps {
  const { booking, prop, lp, sp } = ctx
  const lpRec = lp as Record<string, unknown>

  return {
    documentId,
    generatedAt: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }),
    serviceTier: ctx.serviceTier,
    landlord: {
      fullName:
        [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
        (typeof lp.full_name === 'string' ? lp.full_name : 'Landlord'),
      companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
      addressLine: landlordAddressLine(lpRec),
      email: typeof lp.email === 'string' ? lp.email : '-',
      phone: typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone : '-',
      residenceLocation: null,
    },
    tenant: {
      fullName:
        [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
        (typeof sp.full_name === 'string' ? sp.full_name : 'Tenant'),
      email: typeof sp.email === 'string' ? sp.email : '-',
      phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone : '-',
      dateOfBirth:
        typeof sp.date_of_birth === 'string' && sp.date_of_birth.trim() ? sp.date_of_birth.trim() : null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: propertyAddressLine(prop) || '-',
      propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
      roomType: typeof prop.room_type === 'string' ? prop.room_type : null,
      furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
      linenSupplied: typeof prop.linen_supplied === 'boolean' ? prop.linen_supplied : null,
      weeklyCleaningService:
        typeof prop.weekly_cleaning_service === 'boolean' ? prop.weekly_cleaning_service : null,
      roomsRentedToResidents: ctx.roomsForResidents,
    },
    term: {
      startDate: ctx.moveIn,
      endDate: ctx.periodic ? null : ctx.endDate,
      periodic: ctx.periodic,
      leaseLengthDescription: ctx.leaseLen || 'As agreed',
    },
    rent: {
      weeklyRent: ctx.weeklyRent,
      platformFeePercent: ctx.platformFeePercent,
      totalWeekly: ctx.weeklyRent,
      paymentMethod: ctx.paymentMethod,
    },
    bond: { amount: ctx.bondNum },
    specialConditions: [
      'This licence is facilitated through the Quni Living platform (quni.com.au).',
      'Any bond must be lodged with RTA Queensland within 10 calendar days of receipt (RTRA Act 2008 (Qld) s 32). The owner cannot hold bond as a private deposit; Quni Living does not hold or manage bond payments.',
      ...(ctx.roomsForResidents != null ? [qldSection43PdfAcknowledgement(ctx.roomsForResidents)] : []),
      "Licence fee payments are processed through Quni Living's secure payment system powered by Stripe.",
      ...ctx.coTenantSpecialConditions,
    ],
    houseRules: typeof prop.house_rules === 'string' ? prop.house_rules : null,
    bookingNotes: typeof booking.notes === 'string' && booking.notes.trim() ? booking.notes.trim() : null,
  }
}

async function buildQldOccupancyPdfBuffer(ctx: LoadedQldOccupancyContext, documentId: string): Promise<Buffer> {
  const pdfProps = buildQldOccupancyPdfProps(ctx, documentId)
  const element = React.createElement(QuniOccupancyAgreementQld, pdfProps)
  const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  if (!pdfBuffer.length) {
    throw new Error('Generated PDF buffer is empty')
  }
  return pdfBuffer
}

export async function preflightQldOccupancyListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const loaded = await loadQldOccupancyContext(admin, bookingId, { requireConfirmable: false })
  if (isListingContextLoadFail(loaded)) {
    return listingContextLoadFailure(loaded)
  }
  try {
    await buildQldOccupancyPdfBuffer(loaded.ctx, PREFLIGHT_DOCUMENT_ID)
    return { ok: true, generator: 'qld-occupancy' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[qld-occupancy] preflight pdf build', e)
    return { ok: false, status: 500, error: 'Could not build occupancy agreement PDF', detail: msg }
  }
}

export async function runQldOccupancyListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean },
): Promise<ListingDocGenResult> {
  const loaded = await loadQldOccupancyContext(admin, bookingId)
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

  const { data: existingLease } = await admin
    .from('tenancy_documents')
    .select('id, status')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'lease')
    .maybeSingle()

  const existingLeaseStatus = existingLease?.status
  if (existingLeaseStatus === 'signed') {
    return {
      ok: true,
      tenancyId,
      documentId: existingLease!.id,
    }
  }

  const refreshDraftPdfsOnly = existingLeaseStatus === 'sent_for_signing'
  const landlordUserId = typeof lp.user_id === 'string' ? lp.user_id : null

  let documentId: string
  if (existingLease?.id) {
    documentId = existingLease.id
  } else {
    const { data: insD, error: dErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancyId,
        document_type: 'lease',
        status: 'draft',
        generated_by: landlordUserId,
      })
      .select('id')
      .single()

    if (dErr || !insD) {
      console.error('tenancy_documents insert', dErr)
      return { ok: false, status: 500, error: 'Could not create tenancy document' }
    }
    documentId = insD.id
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await buildQldOccupancyPdfBuffer(loaded.ctx, documentId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not build occupancy agreement PDF', detail: msg }
  }

  const storagePath = `${tenancyId}/occupancy/qld_occupancy_agreement_draft.pdf`
  const { error: upErr } = await admin.storage
    .from('tenancy-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    console.error('storage upload qld occupancy draft', upErr)
    return { ok: false, status: 500, error: 'Could not upload PDF' }
  }

  if (refreshDraftPdfsOnly) {
    return { ok: true, tenancyId, documentId }
  }

  const { error: pathErr } = await admin
    .from('tenancy_documents')
    .update({ file_path: storagePath, status: 'draft' })
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
      await sendForSigning(documentId)
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
      console.error('sendForSigning', e)
      return { ok: false, status: 500, error: 'Could not send agreement for signing', detail: msg }
    }
  }

  return { ok: true, tenancyId, documentId, docusealSubmissionId }
}
