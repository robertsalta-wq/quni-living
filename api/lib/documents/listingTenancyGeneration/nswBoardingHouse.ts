/// <reference types="node" />
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import { NswBoardingHouseOccupancyAgreement } from '../../../documents/NswBoardingHouseAgreement.js'
import type { NswBoardingHouseAgreementProps } from '../../../../src/lib/documents/nsw/boardingHouse/types.js'
import { bookingAllowsTenancyDocumentGeneration } from '../../booking/listingDocumentGenerationEligibility.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import {
  isListingContextLoadFail,
  listingContextLoadFailure,
} from '../../booking/listingContextLoad.js'
import {
  assertT3SecurityDepositCap,
  occupancyFeeWeeklyEquivalentAud,
  resolveBookingBondAmountAud,
} from '../../booking/bookingBondAmount.js'
import { tenantLegalNameForDocuments } from '../../booking/tenantLegalNameForDocuments.js'
import { sendForSigning } from '../../docuseal.js'
import { leaseEndDateFromMoveIn } from '../../booking/leaseEndDate.js'
import { loadOccupancyListingPayeeFields } from './occupancyListingPayee.js'
import { nswBoardingHouseLeaseMetadata, NSW_BOARDING_HOUSE_GENERATOR_ID } from './nswBoardingHouseMetadata.js'
import {
  nswT3AdditionalChargesError,
  nswT3RoomDescriptionError,
  nswT3SharedAreasError,
  parseNswT3AdditionalCharges,
  parseNswT3SharedAreas,
} from '../../../../src/lib/tenancy/nswT3ListingFields.js'
import {
  NSW_T3_COMPLIANCE_BLOCKED_MESSAGE,
  isCompleteNswT3ComplianceAttestation,
} from '../../../../src/lib/tenancy/nswT3ComplianceAttestation.js'

const PREFLIGHT_DOCUMENT_ID = '00000000-0000-4000-8000-000000000000'
const STORAGE_DRAFT_NAME = 'nsw_boarding_house_occupancy_draft.pdf'

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
  return parts.join(', ') || ' '
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
  | 'abn'
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
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
>

type LoadedNswBoardingHouseContext = {
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
  pdfProps: NswBoardingHouseAgreementProps
  chargesSnapshot: ReturnType<typeof parseNswT3AdditionalCharges>
}

function t3ParticularsError(prop: Record<string, unknown>, weeklyRent: number, bondNum: number | null): string | null {
  const roomDescription = typeof prop.room_description === 'string' ? prop.room_description : ''
  const roomErr = nswT3RoomDescriptionError(roomDescription)
  if (roomErr) return roomErr

  const sharedAreas = parseNswT3SharedAreas(prop.shared_areas)
  const sharedErr = nswT3SharedAreasError(sharedAreas)
  if (sharedErr) return sharedErr

  const charges = parseNswT3AdditionalCharges(prop.additional_charges)
  const chargeErr = nswT3AdditionalChargesError(charges)
  if (chargeErr) return chargeErr

  const weeklyEq = occupancyFeeWeeklyEquivalentAud(weeklyRent, 'week')
  if (weeklyEq == null) return 'Invalid occupancy fee'
  const capCheck = assertT3SecurityDepositCap(bondNum, weeklyEq, 'week')
  if (!capCheck.ok) return capCheck.message
  return null
}

async function loadNswBoardingHouseContext(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts?: { requireConfirmable?: boolean },
): Promise<
  | { ok: true; ctx: LoadedNswBoardingHouseContext }
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
        house_rules,
        room_description,
        shared_areas,
        additional_charges,
        lister_role,
        rooming_house_registration_number
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

  const { data: lp, error: lpErr } = await admin
    .from('landlord_profiles')
    .select(
      'id, user_id, full_name, first_name, last_name, email, phone, address, suburb, state, postcode, company_name, abn',
    )
    .eq('id', booking.landlord_id)
    .maybeSingle()

  const { data: sp, error: spErr } = await admin
    .from('student_profiles')
    .select(
      'id, user_id, full_name, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone, verification_type, legal_name_locked_at',
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
  const endDate = leaseEndDateFromMoveIn(moveIn, leaseLen)
  const periodic = leaseLen === 'Flexible' || endDate == null
  const bondNum = resolveBookingBondAmountAud(booking.bond_amount, prop, weeklyRent)

  const particularsErr = t3ParticularsError(prop, weeklyRent, bondNum)
  if (particularsErr) {
    return { ok: false, status: 400, error: particularsErr }
  }

  const listerRole = prop.lister_role === 'head_tenant' ? 'head_tenant' : 'owner'
  const { data: t3Attestation, error: t3AttestErr } = await admin
    .from('property_t3_attestations')
    .select(
      'id, property_id, attested_by, attested_at, registration_number, da_lawful_use_declared, afss_current_declared, afss_statement_date, afss_expiry_date, head_lessor_consent_declared, warranty_version, superseded_at',
    )
    .eq('property_id', booking.property_id)
    .is('superseded_at', null)
    .maybeSingle()

  if (t3AttestErr) {
    console.error('[nsw-boarding-house] t3 attestation lookup', t3AttestErr)
    return { ok: false, status: 500, error: 'Could not verify boarding-house compliance attestation' }
  }
  if (!isCompleteNswT3ComplianceAttestation(t3Attestation, listerRole)) {
    return { ok: false, status: 400, error: NSW_T3_COMPLIANCE_BLOCKED_MESSAGE }
  }

  const payeeFields = await loadOccupancyListingPayeeFields(admin, {
    serviceTier: 'listing',
    propertyId: booking.property_id,
    prop,
    moveIn,
    sp,
    propertyAddressLine: propertyAddressLine(prop),
  })

  const sharedAreas = parseNswT3SharedAreas(prop.shared_areas)
  const additionalCharges = parseNswT3AdditionalCharges(prop.additional_charges)
  const lpRec = lp as Record<string, unknown>
  const pdfProps: NswBoardingHouseAgreementProps = {
    documentId: PREFLIGHT_DOCUMENT_ID,
    generatedAt: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
    proprietor: {
      fullName:
        [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
        (typeof lp.full_name === 'string' ? lp.full_name : 'Proprietor'),
      companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
      abn: typeof lp.abn === 'string' && lp.abn.trim() ? lp.abn.trim() : null,
      addressLine: landlordAddressLine(lpRec),
      email: typeof lp.email === 'string' ? lp.email : ' ',
      phone: typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone : ' ',
    },
    resident: {
      fullName: tenantLegalNameForDocuments(sp, 'Resident'),
      email: typeof sp.email === 'string' ? sp.email : ' ',
      phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone : ' ',
      emergencyContactName:
        typeof sp.emergency_contact_name === 'string' && sp.emergency_contact_name.trim()
          ? sp.emergency_contact_name.trim()
          : null,
      emergencyContactPhone:
        typeof sp.emergency_contact_phone === 'string' && sp.emergency_contact_phone.trim()
          ? sp.emergency_contact_phone.trim()
          : null,
    },
    premises: {
      addressLine: propertyAddressLine(prop) || ' ',
      roomDescription: typeof prop.room_description === 'string' ? prop.room_description.trim() : '',
      furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
      sharedAreas,
    },
    term: {
      startDate: moveIn,
      endDate: periodic ? null : endDate,
      periodic,
      leaseLengthDescription: leaseLen || 'As agreed',
    },
    occupancyFeeWeeklyAud: weeklyRent,
    securityDepositAud: bondNum,
    payout: payeeFields.payout,
    paymentReference: payeeFields.paymentReference,
    houseRules: typeof prop.house_rules === 'string' ? prop.house_rules : null,
    additionalCharges,
  }

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
      pdfProps,
      chargesSnapshot: additionalCharges,
    },
  }
}

async function buildNswBoardingHousePdfBuffer(
  ctx: LoadedNswBoardingHouseContext,
  documentId: string,
): Promise<Buffer> {
  const pdfProps = { ...ctx.pdfProps, documentId }
  const element = React.createElement(NswBoardingHouseOccupancyAgreement, pdfProps)
  const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  if (!pdfBuffer.length) {
    throw new Error('Generated PDF buffer is empty')
  }
  return pdfBuffer
}

export async function preflightNswBoardingHouseListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const loaded = await loadNswBoardingHouseContext(admin, bookingId, { requireConfirmable: false })
  if (isListingContextLoadFail(loaded)) {
    return listingContextLoadFailure(loaded)
  }
  try {
    await buildNswBoardingHousePdfBuffer(loaded.ctx, PREFLIGHT_DOCUMENT_ID)
    return { ok: true, generator: NSW_BOARDING_HOUSE_GENERATOR_ID }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[nsw-boarding-house] preflight pdf build', e)
    return { ok: false, status: 500, error: 'Could not build occupancy agreement PDF', detail: msg }
  }
}

export async function runNswBoardingHouseListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean },
): Promise<ListingDocGenResult> {
  const loaded = await loadNswBoardingHouseContext(admin, bookingId)
  if (isListingContextLoadFail(loaded)) {
    return listingContextLoadFailure(loaded)
  }

  const { booking, lp, moveIn, weeklyRent, periodic, endDate, bondNum, chargesSnapshot } = loaded.ctx
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
    .select('id, status, metadata')
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
  const metadata = nswBoardingHouseLeaseMetadata(existingLease?.metadata, chargesSnapshot)

  let documentId: string
  if (existingLease?.id) {
    documentId = existingLease.id
    const { error: metaErr } = await admin
      .from('tenancy_documents')
      .update({ metadata })
      .eq('id', documentId)
    if (metaErr) {
      console.error('tenancy_documents metadata update', metaErr)
    }
  } else {
    const { data: insD, error: dErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancyId,
        document_type: 'lease',
        status: 'draft',
        generated_by: landlordUserId,
        metadata,
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
    pdfBuffer = await buildNswBoardingHousePdfBuffer(loaded.ctx, documentId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not build occupancy agreement PDF', detail: msg }
  }

  const storagePath = `${tenancyId}/lease/${STORAGE_DRAFT_NAME}`
  const { error: upErr } = await admin.storage
    .from('tenancy-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    console.error('storage upload boarding-house draft', upErr)
    return { ok: false, status: 500, error: 'Could not upload PDF' }
  }

  if (refreshDraftPdfsOnly) {
    return { ok: true, tenancyId, documentId }
  }

  const { error: pathErr } = await admin
    .from('tenancy_documents')
    .update({ file_path: storagePath, status: 'draft', metadata })
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
      await sendForSigning(documentId, {
        documentPdfName: 'Standard Occupancy Agreement.pdf',
        removeTags: true,
        skipCoTenantSigner: true,
      })
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
