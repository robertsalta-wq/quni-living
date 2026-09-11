import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../../src/lib/database.types.js'
import { QldHouseRulesPdf } from '../../../documents/QldHouseRulesPdf.js'
import {
  buildQldHouseRulesDocument,
  formatQldHouseRulesGeneratedAt,
  parseQldRoomingHouseRulesStored,
} from '../../tenancy/qldHouseRules/index.js'
import { fillOfficialQldFormR18Pdf, type QldFormR18FillProps } from '../officialQldFormR18Fill.js'
import { formatQldFormR18PaymentReference } from '../qldFormR18PaymentReference.js'
import { qldFormR18SampleFillProps } from '../qldFormR18SampleProps.js'
import { QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT } from '../../tenancy/qldRoomingListingFields.js'
import {
  projectQldNoticeConsents,
  type QldNoticeConsentEventRow,
  type QldNoticeConsentProjection,
} from '../../tenancy/qldNoticeConsent.js'
import { propertyPayoutDetailsQldRoomingComplete } from '../../../../src/lib/propertyPayoutDetails.js'
import { sendQldFormR18PackageForSigning } from '../../docuseal.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'

export const QLD_FORM_R18_GENERATOR_ID = 'qld-form-r18'

export const QLD_FORM_R18_HOUSE_RULES_REQUIRED =
  'Form R18 cannot be produced without house rules to give the resident (s 275).'

export const QLD_FORM_R18_ATTESTATION_REQUIRED =
  'Form R18 cannot be produced until the provider attests that the house rules have been given to the resident. Signing without that is an offence under s 275 (10 penalty units).'

function asEvents(data: unknown): QldNoticeConsentEventRow[] {
  return Array.isArray(data) ? (data as QldNoticeConsentEventRow[]) : []
}

function channelFromProjection(p: QldNoticeConsentProjection, key: 'email' | 'sms') {
  const row = p[key]
  if (!row) return { permitted: null as boolean | null, address: '' }
  return { permitted: row.permitted, address: row.address }
}

function weekdayFromIso(iso: string): string {
  const raw = iso.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return 'Monday'
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

function addressParts(prop: Record<string, unknown>): { street: string; suburbLine: string; postcode: string } {
  const street = typeof prop.address === 'string' ? prop.address.trim() : ''
  const suburb = typeof prop.suburb === 'string' ? prop.suburb.trim() : ''
  const state = typeof prop.state === 'string' ? prop.state.trim() : ''
  const postcode = typeof prop.postcode === 'string' ? prop.postcode.trim() : ''
  return { street, suburbLine: [suburb, state].filter(Boolean).join(' '), postcode }
}

export async function buildQldFormR18Pdfs(args: {
  r18: QldFormR18FillProps
  houseRules: { commonAreas: string; extras?: Record<string, unknown>; premisesLine: string }
  generatedAt: Date
}): Promise<{ r18Buffer: Buffer; houseRulesBuffer: Buffer }> {
  const { pdfBytes } = await fillOfficialQldFormR18Pdf(args.r18)
  const built = buildQldHouseRulesDocument({
    commonAreas: args.houseRules.commonAreas,
    extras: args.houseRules.extras,
    premisesLine: args.houseRules.premisesLine,
  })
  if (!built.ok) {
    throw new Error(built.error)
  }
  const houseRulesBuffer = await renderToBuffer(
    React.createElement(QldHouseRulesPdf, {
      variant: 'resident',
      document: built.document,
      generatedAtLabel: formatQldHouseRulesGeneratedAt(args.generatedAt),
    }) as Parameters<typeof renderToBuffer>[0],
  )
  return { r18Buffer: Buffer.from(pdfBytes), houseRulesBuffer }
}

export async function preflightQldFormR18ListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const loaded = await loadQldFormR18ListingContext(admin, bookingId)
  if (!loaded.ok) return loaded
  return { ok: true, generator: QLD_FORM_R18_GENERATOR_ID }
}

export async function runQldFormR18ListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean },
): Promise<ListingDocGenResult> {
  const loaded = await loadQldFormR18ListingContext(admin, bookingId)
  if (!loaded.ok) return loaded

  const { booking, lp, moveIn, weeklyRent, bondAmount } = loaded
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
        end_date: typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null,
        weekly_rent: weeklyRent,
        bond_amount: bondAmount,
        status: 'active',
      })
      .select('id')
      .single()

    if (tInsErr || !insT) {
      console.error('[qld-form-r18] tenancy insert', tInsErr)
      return { ok: false, status: 500, error: 'Could not create tenancy' }
    }
    tenancyId = insT.id
  }

  const { data: existingDoc } = await admin
    .from('tenancy_documents')
    .select('id, status')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'residential_tenancy')
    .maybeSingle()

  if (existingDoc?.status === 'signed') {
    return { ok: true, tenancyId, documentId: existingDoc.id }
  }

  const refreshDraftPdfsOnly = existingDoc?.status === 'sent_for_signing'
  const landlordUserId = typeof lp.user_id === 'string' ? lp.user_id : null

  let documentId: string
  if (existingDoc?.id) {
    documentId = existingDoc.id
  } else {
    const { data: insD, error: dErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancyId,
        document_type: 'residential_tenancy',
        status: 'draft',
        generated_by: landlordUserId,
        metadata: { signing_package: 'rooming_accommodation_qld' } as Json,
      })
      .select('id')
      .single()

    if (dErr || !insD) {
      console.error('[qld-form-r18] tenancy_documents insert', dErr)
      return { ok: false, status: 500, error: 'Could not create tenancy document' }
    }
    documentId = insD.id
  }

  let r18Buffer: Buffer
  let houseRulesBuffer: Buffer
  try {
    const built = await buildQldFormR18Pdfs({
      r18: loaded.fillProps,
      houseRules: loaded.houseRules,
      generatedAt: new Date(),
    })
    r18Buffer = built.r18Buffer
    houseRulesBuffer = built.houseRulesBuffer
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: msg }
  }

  const r18Path = `${tenancyId}/rooming/qld_form_r18_draft.pdf`
  const rulesPath = `${tenancyId}/rooming/qld_house_rules_resident_draft.pdf`
  const { error: up1 } = await admin.storage
    .from('tenancy-documents')
    .upload(r18Path, r18Buffer, { contentType: 'application/pdf', upsert: true })
  if (up1) {
    console.error('[qld-form-r18] upload Form R18', up1)
    return { ok: false, status: 500, error: 'Could not upload Form R18 PDF' }
  }
  const { error: up2 } = await admin.storage
    .from('tenancy-documents')
    .upload(rulesPath, houseRulesBuffer, { contentType: 'application/pdf', upsert: true })
  if (up2) {
    console.error('[qld-form-r18] upload house rules', up2)
    return { ok: false, status: 500, error: 'Could not upload house rules PDF' }
  }

  if (refreshDraftPdfsOnly) {
    return { ok: true, tenancyId, documentId }
  }

  const { error: pathErr } = await admin
    .from('tenancy_documents')
    .update({
      file_path: r18Path,
      status: 'draft',
      metadata: {
        signing_package: 'rooming_accommodation_qld',
        house_rules_file_path: rulesPath,
      } as Json,
    })
    .eq('id', documentId)

  if (pathErr) {
    console.error('[qld-form-r18] tenancy_documents update path', pathErr)
    return { ok: false, status: 500, error: 'Could not save file path' }
  }

  const hasDocuseal =
    (process.env.DOCUSEAL_API_URL || '').trim() && (process.env.DOCUSEAL_API_TOKEN || '').trim()

  let docusealSubmissionId: string | null = null
  if (hasDocuseal && !opts.deferSigning) {
    try {
      await sendQldFormR18PackageForSigning(documentId, { submitterSignReason: false })
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
      console.error('[qld-form-r18] sendQldFormR18PackageForSigning', e)
      return { ok: false, status: 500, error: 'Could not send agreement for signing', detail: msg }
    }
  }

  return { ok: true, tenancyId, documentId, docusealSubmissionId }
}

async function loadQldFormR18ListingContext(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<
  | {
      ok: true
      fillProps: QldFormR18FillProps
      houseRules: { commonAreas: string; extras?: Record<string, unknown>; premisesLine: string }
      booking: { id: string; property_id: string | null; landlord_id: string | null; student_id: string | null; end_date: string | null }
      lp: { user_id?: string | null }
      moveIn: string
      weeklyRent: number
      bondAmount: number | null
    }
  | { ok: false; status: number; error: string; detail?: string }
> {
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id, property_id, student_id, landlord_id, weekly_rent, move_in_date, start_date, end_date, lease_length,
      qld_house_rules_attested_at, occupant_count,
      properties (
        title, address, suburb, state, postcode, rent_per_week, max_occupants, property_type, furnished,
        linen_supplied, weekly_cleaning_service, room_description, qld_student_accommodation, qld_persons_at_premises,
        qld_rent_payment_method_2, qld_rent_payment_method_2_costs, qld_rent_payment_method_2_financial_benefit,
        qld_rent_last_increased_on, qld_rooming_house_rules, bond
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()
  if (bErr || !booking) return { ok: false, status: 404, error: 'Booking not found' }
  const prop = (booking.properties ?? null) as Record<string, unknown> | null
  if (!prop) return { ok: false, status: 404, error: 'Property not found' }

  const attestedAt =
    typeof (booking as { qld_house_rules_attested_at?: string | null }).qld_house_rules_attested_at === 'string'
      ? (booking as { qld_house_rules_attested_at?: string }).qld_house_rules_attested_at
      : null
  if (!attestedAt) {
    return { ok: false, status: 422, error: QLD_FORM_R18_ATTESTATION_REQUIRED }
  }

  const storedRules = parseQldRoomingHouseRulesStored(prop.qld_rooming_house_rules)
  if (!storedRules.commonAreas.trim()) {
    return { ok: false, status: 422, error: QLD_FORM_R18_HOUSE_RULES_REQUIRED }
  }

  const roomNumber = typeof prop.room_description === 'string' ? prop.room_description.trim() : ''
  if (!roomNumber) {
    return { ok: false, status: 422, error: 'Enter a room description that identifies this room on the agreement.' }
  }

  if (!booking.landlord_id || !booking.student_id || !booking.property_id) {
    return { ok: false, status: 404, error: 'Booking is missing landlord, resident, or property.' }
  }

  const { data: lp, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('user_id, full_name, first_name, last_name, email, phone, address, suburb, state, postcode, company_name')
    .eq('id', booking.landlord_id)
    .maybeSingle()
  const { data: sp, error: spErr } = await admin
    .from('student_profiles')
    .select(
      'full_name, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone, emergency_contact_email',
    )
    .eq('id', booking.student_id)
    .maybeSingle()
  if (lpErr || spErr || !lp || !sp) return { ok: false, status: 500, error: 'Could not load profiles' }

  const { data: payout } = await admin
    .from('property_payout_details')
    .select('account_name, bsb, account_number, bank_name')
    .eq('property_id', booking.property_id)
    .maybeSingle()
  if (!propertyPayoutDetailsQldRoomingComplete(payout)) {
    return { ok: false, status: 422, error: 'QLD rooming Item 11 needs complete payee bank details including bank name.' }
  }

  const { data: providerEvents } = await admin
    .from('qld_notice_consent_events')
    .select('id, property_id, booking_id, party, channel, action, permitted, address, created_at')
    .eq('property_id', booking.property_id)
    .eq('party', 'provider')
    .is('booking_id', null)
  const { data: residentEvents } = await admin
    .from('qld_notice_consent_events')
    .select('id, property_id, booking_id, party, channel, action, permitted, address, created_at')
    .eq('property_id', booking.property_id)
    .eq('party', 'resident')
    .eq('booking_id', bookingId)

  const providerNotice = projectQldNoticeConsents(asEvents(providerEvents))
  const residentNotice = projectQldNoticeConsents(asEvents(residentEvents))
  if (!providerNotice.email || !providerNotice.sms || !residentNotice.email || !residentNotice.sms) {
    return { ok: false, status: 422, error: 'Item 5 notice consents are missing for the provider or the resident.' }
  }

  const moveIn = (typeof booking.move_in_date === 'string' && booking.move_in_date) || booking.start_date
  const weeklyRent = Number(booking.weekly_rent ?? prop.rent_per_week ?? 0)
  const premises = addressParts(prop)
  const providerStreet = typeof lp.address === 'string' ? lp.address.trim() : ''
  const method2 = typeof prop.qld_rent_payment_method_2 === 'string' ? prop.qld_rent_payment_method_2.trim() : ''
  const costs =
    typeof prop.qld_rent_payment_method_2_costs === 'string' ? prop.qld_rent_payment_method_2_costs.trim() : ''
  const benefit =
    typeof prop.qld_rent_payment_method_2_financial_benefit === 'string'
      ? prop.qld_rent_payment_method_2_financial_benefit.trim()
      : ''
  const method2Line = [method2, costs ? `Cost to resident: ${costs}` : '', benefit ? `Financial benefit to provider: ${benefit}` : '']
    .filter(Boolean)
    .join('. ')

  const residentName =
    [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof sp.full_name === 'string' ? sp.full_name.trim() : '') ||
    'Resident'
  const providerName =
    (typeof lp.company_name === 'string' && lp.company_name.trim()) ||
    [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp.full_name === 'string' ? lp.full_name.trim() : '') ||
    'Provider'

  const personsInRoom = Number(booking.occupant_count ?? 1) || 1
  const personsAtPremises = Number(prop.qld_persons_at_premises ?? personsInRoom) || personsInRoom
  const lastInc =
    typeof prop.qld_rent_last_increased_on === 'string' && prop.qld_rent_last_increased_on.trim()
      ? prop.qld_rent_last_increased_on.slice(0, 10)
      : null

  const fillProps: QldFormR18FillProps = {
    providerName,
    providerStreet,
    providerSuburbLine: [typeof lp.suburb === 'string' ? lp.suburb.trim() : '', typeof lp.state === 'string' ? lp.state.trim() : '']
      .filter(Boolean)
      .join(' '),
    providerPostcode: typeof lp.postcode === 'string' ? lp.postcode.trim() : '',
    providerPhone: typeof lp.phone === 'string' ? lp.phone.trim() : '',
    providerMobile: typeof lp.phone === 'string' ? lp.phone.trim() : '',
    providerEmail: typeof lp.email === 'string' ? lp.email.trim() : '',
    providerAbn: '',
    residentFullName: residentName,
    residentPhone: typeof sp.phone === 'string' ? sp.phone.trim() : '',
    residentEmail: typeof sp.email === 'string' ? sp.email.trim() : '',
    emergencyContactName: typeof sp.emergency_contact_name === 'string' ? sp.emergency_contact_name.trim() : '',
    emergencyContactPhone: typeof sp.emergency_contact_phone === 'string' ? sp.emergency_contact_phone.trim() : '',
    emergencyContactEmail: typeof sp.emergency_contact_email === 'string' ? sp.emergency_contact_email.trim() : '',
    premisesStreet: premises.street,
    premisesSuburbLine: premises.suburbLine,
    premisesPostcode: premises.postcode,
    roomNumber,
    inclusions: [
      `Room: ${roomNumber}`,
      prop.furnished === true ? 'Furnished' : null,
      prop.linen_supplied === true ? 'linen supplied' : null,
    ]
      .filter(Boolean)
      .join('; '),
    studentAccommodation: prop.qld_student_accommodation === true,
    termFixed: Boolean(booking.end_date),
    startDateIso: String(moveIn).slice(0, 10),
    endDateIso: typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null,
    weeklyRent,
    bondAmount: typeof prop.bond === 'number' ? prop.bond : null,
    rentDueWeekday: weekdayFromIso(String(moveIn)),
    method1: QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT,
    method2: method2Line,
    bankName: payout!.bank_name!.trim(),
    accountName: payout!.account_name!.trim(),
    bsb: payout!.bsb!.trim(),
    accountNumber: payout!.account_number!.trim(),
    paymentReference: formatQldFormR18PaymentReference({
      fullName: residentName,
      lastName: typeof sp.last_name === 'string' ? sp.last_name : '',
      roomNumber,
    }),
    lastRentIncreaseIso: lastInc,
    utilitiesLine: '',
    personsInRoom,
    personsAtPremises,
    houseRulesProvided: true,
    providerNoticeEmail: channelFromProjection(providerNotice, 'email'),
    providerNoticeSms: channelFromProjection(providerNotice, 'sms'),
    residentNoticeEmail: channelFromProjection(residentNotice, 'email'),
    residentNoticeSms: channelFromProjection(residentNotice, 'sms'),
  }

  return {
    ok: true,
    fillProps,
    houseRules: {
      commonAreas: storedRules.commonAreas,
      extras: storedRules.extras,
      premisesLine: [premises.street, premises.suburbLine, premises.postcode].filter(Boolean).join(', '),
    },
    booking: {
      id: booking.id,
      property_id: booking.property_id,
      landlord_id: booking.landlord_id,
      student_id: booking.student_id,
      end_date: typeof booking.end_date === 'string' ? booking.end_date : null,
    },
    lp,
    moveIn: String(moveIn).slice(0, 10),
    weeklyRent,
    bondAmount: typeof prop.bond === 'number' ? prop.bond : null,
  }
}

export function qldFormR18SamplePackageProps() {
  return {
    r18: qldFormR18SampleFillProps(),
    houseRules: {
      commonAreas: 'Kitchen, bathrooms, and shared living room.',
      premisesLine: '22 Rental Street, Jamboree Heights QLD 4074',
    },
  }
}
