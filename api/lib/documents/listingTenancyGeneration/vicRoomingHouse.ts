import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../../src/lib/database.types.js'
import {
  buildVicRoomingHouseRulesPdf,
  fillOfficialVicRoomingHousePdf,
  type VicRoomingHouseFillProps,
} from '../officialVicRoomingHouseFill.js'
import {
  fillVicRoomingNotice,
  readVicRoomingMoveInPdf,
  sha256Bytes,
  type VicRoomingNoticeKind,
} from '../officialVicRoomingMoveInPack.js'
import { sendVicRoomingHousePackageForSigning } from '../../docuseal.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import { coTenantEmailDistinctFromPrimary, bookingRequiresCoTenantSignature } from '../../booking/coTenantSigning.js'
import { parseCoTenantFromBooking } from '../../booking/occupancyLeaseContext.js'
import { inclusiveLeaseLastDay } from '../../booking/leaseEndDate.js'
import { resolveTenancyPackage, tenancyPackageInputFromPropertyRow } from '../../resolveTenancyPackage.js'
import {
  VIC_ROOMING_CONDITION_REPORT_REQUIRED,
  VIC_ROOMING_FIXED_TERM_MESSAGE,
  VIC_ROOMING_GENERATOR_ID,
  VIC_ROOMING_OPERATOR_EMAIL_REQUIRED,
  VIC_ROOMING_RESIDENT_EMAIL_REQUIRED,
  VIC_ROOMING_RESIDENT_2_EMAIL_REQUIRED,
  VIC_ROOMING_SIGNING_PACKAGE,
  VIC_ROOMING_TWO_RESIDENTS_MESSAGE,
  VIC_ROOMING_UNSHARED_RENT_HIGHER,
  parseVicRoomingConditionReport,
  parseVicRoomingUnsharedWeeklyRent,
  vicRoomingUnsharedRentAcceptBlock,
  vicRoomingPayMethodsFromRow,
  vicRoomingRentInAdvanceError,
} from '../../tenancy/vicRoomingHouse.js'

const DRAFT_PATH = 'vic_rooming_house_agreement_draft.pdf'
const RULES_DRAFT = 'vic_rooming_house_rules_draft.pdf'
const RULES_2_DRAFT = 'vic_rooming_house_rules_resident_2_draft.pdf'
const RIGHTS_DRAFT = 'vic_rooming_rights_and_duties.pdf'
const GUIDE_DRAFT = 'vic_rooming_residents_guide.pdf'
const NOTICE_DRAFT = 'vic_rooming_notice.pdf'
const NOTICE_2_DRAFT = 'vic_rooming_notice_resident_2.pdf'

type MoveInRecord = { id: string; name: string; file_path: string; sha256: string }

function noticeDateLabel(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')}`
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function auDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function weekday(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

function personName(row: Record<string, unknown> | null, fallback: string): string {
  if (!row) return fallback
  const joined = [text(row.first_name), text(row.last_name)].filter(Boolean).join(' ').trim()
  return joined || text(row.full_name) || fallback
}

export async function preflightVicRoomingHouseListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const loaded = await loadVicRoomingHouseContext(admin, bookingId, { requireResidentConsent: false })
  if (!loaded.ok) return loaded
  return { ok: true, generator: VIC_ROOMING_GENERATOR_ID }
}

export async function runVicRoomingHouseListingTenancy(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean },
): Promise<ListingDocGenResult> {
  const loaded = await loadVicRoomingHouseContext(admin, bookingId, {
    requireResidentConsent: !opts.deferSigning,
  })
  if (!loaded.ok) return loaded

  const { data: existingTenancy } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()
  let tenancyId = existingTenancy?.id
  if (!tenancyId) {
    const { data: insT, error: tInsErr } = await admin
      .from('tenancies')
      .insert({
        booking_id: bookingId,
        property_id: loaded.propertyId,
        landlord_profile_id: loaded.landlordId,
        student_profile_id: loaded.studentId,
        start_date: loaded.moveIn,
        end_date: loaded.endDate,
        weekly_rent: loaded.weeklyRent,
        bond_amount: loaded.bondAmount,
        status: 'active',
      })
      .select('id')
      .single()
    if (tInsErr || !insT) return { ok: false, status: 500, error: 'Could not create tenancy' }
    tenancyId = insT.id
  }

  const { data: existingDoc } = await admin
    .from('tenancy_documents')
    .select('id, status, metadata')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'residential_tenancy')
    .maybeSingle()

  if (existingDoc?.status === 'signed') {
    return { ok: true, tenancyId, documentId: existingDoc.id }
  }
  const existingMeta =
    existingDoc?.metadata && typeof existingDoc.metadata === 'object' && !Array.isArray(existingDoc.metadata)
      ? (existingDoc.metadata as Record<string, unknown>)
      : {}
  if (
    existingDoc &&
    existingDoc.status === 'sent_for_signing' &&
    existingMeta.signing_package &&
    existingMeta.signing_package !== VIC_ROOMING_SIGNING_PACKAGE
  ) {
    return {
      ok: false,
      status: 409,
      error: 'This booking already has an agreement out for signing. It stays on that agreement.',
    }
  }

  const refreshOnly = existingDoc?.status === 'sent_for_signing'
  let documentId = existingDoc?.id
  if (!documentId) {
    const { data: insD, error: dErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancyId,
        document_type: 'residential_tenancy',
        status: 'draft',
        metadata: { signing_package: VIC_ROOMING_SIGNING_PACKAGE, generator: VIC_ROOMING_GENERATOR_ID } as Json,
      })
      .select('id')
      .single()
    if (dErr || !insD) return { ok: false, status: 500, error: 'Could not create tenancy document' }
    documentId = insD.id
  }

  let agreement: Uint8Array
  let rules: Uint8Array
  let rulesForResident2: Uint8Array | null = null
  try {
    agreement = (await fillOfficialVicRoomingHousePdf(loaded.fill)).pdfBytes
    rules = await buildVicRoomingHouseRulesPdf({
      premisesLine: loaded.premisesLine,
      rules: loaded.houseRules,
    })
    if (loaded.fill.resident2Name.trim()) {
      rulesForResident2 = await buildVicRoomingHouseRulesPdf({
        premisesLine: loaded.premisesLine,
        rules: loaded.houseRules,
        signer: {
          role: 'Co-tenant',
          signatureName: 'Resident 2 House Rules Signature',
          dateName: 'Resident 2 House Rules Date',
        },
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not build the rooming house agreement', detail: msg }
  }

  const agreementPath = `${tenancyId}/rooming/${DRAFT_PATH}`
  const rulesPath = `${tenancyId}/rooming/${RULES_DRAFT}`
  const rules2Path = rulesForResident2 ? `${tenancyId}/rooming/${RULES_2_DRAFT}` : null
  const up1 = await admin.storage
    .from('tenancy-documents')
    .upload(agreementPath, Buffer.from(agreement), { contentType: 'application/pdf', upsert: true })
  if (up1.error) return { ok: false, status: 500, error: 'Could not upload the rooming house agreement' }
  const up2 = await admin.storage
    .from('tenancy-documents')
    .upload(rulesPath, Buffer.from(rules), { contentType: 'application/pdf', upsert: true })
  if (up2.error) return { ok: false, status: 500, error: 'Could not upload the house rules' }
  if (rulesForResident2 && rules2Path) {
    const up3 = await admin.storage
      .from('tenancy-documents')
      .upload(rules2Path, Buffer.from(rulesForResident2), { contentType: 'application/pdf', upsert: true })
    if (up3.error) return { ok: false, status: 500, error: 'Could not upload resident 2 house rules' }
  }

  let moveInPack: MoveInRecord[]
  try {
    moveInPack = await uploadMoveInPack(admin, tenancyId, loaded)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not build the move-in documents', detail: msg }
  }

  if (refreshOnly) return { ok: true, tenancyId, documentId }

  const { error: pathErr } = await admin
    .from('tenancy_documents')
    .update({
      file_path: agreementPath,
      status: 'draft',
      metadata: {
        signing_package: VIC_ROOMING_SIGNING_PACKAGE,
        generator: VIC_ROOMING_GENERATOR_ID,
        house_rules_file_path: rulesPath,
        house_rules_co_tenant_file_path: rules2Path,
        move_in_pack: moveInPack,
      } as Json,
    })
    .eq('id', documentId)
  if (pathErr) return { ok: false, status: 500, error: 'Could not save the agreement file path' }

  if (opts.deferSigning) return { ok: true, tenancyId, documentId }

  const hasDocuseal = (process.env.DOCUSEAL_API_URL || '').trim() && (process.env.DOCUSEAL_API_TOKEN || '').trim()
  if (!hasDocuseal) return { ok: true, tenancyId, documentId }

  try {
    await sendVicRoomingHousePackageForSigning(documentId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 500, error: 'Could not send the agreement for signing', detail: msg }
  }
  const { data: docRow } = await admin
    .from('tenancy_documents')
    .select('docuseal_submission_id')
    .eq('id', documentId)
    .maybeSingle()
  return {
    ok: true,
    tenancyId,
    documentId,
    docusealSubmissionId: typeof docRow?.docuseal_submission_id === 'string' ? docRow.docuseal_submission_id : null,
  }
}

async function loadVicRoomingColumns(
  admin: SupabaseClient<Database>,
  propertyId: string,
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const { data, error } = await admin
    .from('properties')
    .select(
      'vic_premises_occupant_capacity, vic_rooming_unshared_weekly_rent, vic_rooming_house_operator_licence_number, vic_rooming_house_rules, vic_rooming_items_let_with_room, vic_rooming_operator_accepts_electronic_service, vic_rooming_pay_direct_debit, vic_rooming_pay_bank_deposit, vic_rooming_pay_cash, vic_rooming_pay_cheque, vic_rooming_pay_bpay, vic_rooming_pay_other_eft',
    )
    .eq('id', propertyId)
    .maybeSingle()
  if (error || !data) {
    return {
      ok: false,
      status: 503,
      error: 'Victorian rooming house columns are not available yet. Apply the migration before generating this agreement.',
    }
  }
  return { ok: true, row: data as Record<string, unknown> }
}

async function loadVicRoomingHouseContext(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { requireResidentConsent: boolean },
): Promise<
  | {
      ok: true
      fill: VicRoomingHouseFillProps
      houseRules: string
      premisesLine: string
      propertyId: string
      landlordId: string
      studentId: string
      moveIn: string
      endDate: string
      weeklyRent: number
      bondAmount: number | null
      noticeKind: VicRoomingNoticeKind
      peopleInRoom: string
      noticeAddress: string
      unsharedWeeklyRent: string
    }
  | { ok: false; status: number; error: string; detail?: string }
> {
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id, property_id, student_id, landlord_id, weekly_rent, bond_amount, move_in_date, start_date, end_date,
      lease_length, occupant_count, co_tenant,
      properties (
        address, suburb, state, postcode, rent_per_week, property_type, is_registered_rooming_house,
        rooms_rented_to_residents, qld_shares_kitchen_or_bathroom, room_description, max_occupants
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()
  if (bErr || !booking) return { ok: false, status: 404, error: 'Booking not found' }
  const prop = (booking.properties ?? null) as Record<string, unknown> | null
  if (!prop || !booking.property_id) return { ok: false, status: 404, error: 'Property not found' }

  const vicCols = await loadVicRoomingColumns(admin, booking.property_id)
  if (!vicCols.ok) return vicCols
  const propertyRow = { ...prop, ...vicCols.row }

  const moveIn = text(booking.move_in_date || booking.start_date).slice(0, 10)
  const pkg = resolveTenancyPackage(tenancyPackageInputFromPropertyRow(propertyRow, { date: moveIn || undefined }))
  if (!pkg.supported || pkg.generator !== VIC_ROOMING_GENERATOR_ID) {
    return { ok: false, status: 400, error: 'This listing does not use the Victorian rooming house agreement.' }
  }

  const endDate = text(booking.end_date).slice(0, 10)
  if (!endDate || text(booking.lease_length) === 'Flexible') {
    return { ok: false, status: 422, error: VIC_ROOMING_FIXED_TERM_MESSAGE }
  }
  const occupantCount = Math.floor(Number(booking.occupant_count ?? 1))
  if (occupantCount > 2) {
    return { ok: false, status: 422, error: VIC_ROOMING_TWO_RESIDENTS_MESSAGE }
  }
  const coSigner = bookingRequiresCoTenantSignature(booking) ? parseCoTenantFromBooking(booking.co_tenant) : null
  if (occupantCount === 2 && !coSigner) {
    return {
      ok: false,
      status: 422,
      error: 'Enter resident 2\'s name and email. Both residents have to sign the rooming house agreement.',
    }
  }

  const condition = await admin
    .from('bookings')
    .select('vic_rooming_condition_report, vic_rooming_resident_accepts_electronic_service')
    .eq('id', bookingId)
    .maybeSingle()
  if (condition.error || !condition.data) {
    return {
      ok: false,
      status: 503,
      error: 'Victorian rooming house booking columns are not available yet. Apply the migration before generating this agreement.',
    }
  }
  const conditionReport = parseVicRoomingConditionReport(condition.data.vic_rooming_condition_report)
  if (!conditionReport) return { ok: false, status: 422, error: VIC_ROOMING_CONDITION_REPORT_REQUIRED }

  const operatorConsent = propertyRow.vic_rooming_operator_accepts_electronic_service
  if (operatorConsent !== true) return { ok: false, status: 422, error: VIC_ROOMING_OPERATOR_EMAIL_REQUIRED }
  const residentConsentRaw = condition.data.vic_rooming_resident_accepts_electronic_service
  const residentConsent = residentConsentRaw === true ? true : residentConsentRaw === false ? false : null
  if (opts.requireResidentConsent && residentConsent == null) {
    return { ok: false, status: 422, error: VIC_ROOMING_RESIDENT_EMAIL_REQUIRED }
  }
  if (opts.requireResidentConsent && coSigner && coSigner.accepts_electronic_service == null) {
    return { ok: false, status: 422, error: VIC_ROOMING_RESIDENT_2_EMAIL_REQUIRED }
  }

  const houseRules = text(propertyRow.vic_rooming_house_rules)
  if (!houseRules) return { ok: false, status: 422, error: 'Enter the rooming house rules before the agreement is generated.' }
  const roomNumber = text(propertyRow.room_description)
  if (!roomNumber) return { ok: false, status: 422, error: 'Enter the room number printed on the agreement.' }

  if (!booking.landlord_id || !booking.student_id) {
    return { ok: false, status: 404, error: 'Booking is missing the operator or the resident.' }
  }
  const { data: lp } = await admin
    .from('landlord_profiles')
    .select('full_name, first_name, last_name, email, phone, address, suburb, state, postcode, abn')
    .eq('id', booking.landlord_id)
    .maybeSingle()
  const { data: sp } = await admin
    .from('student_profiles')
    .select('full_name, first_name, last_name, email, phone')
    .eq('id', booking.student_id)
    .maybeSingle()
  if (!lp || !sp) return { ok: false, status: 500, error: 'Could not load profiles' }
  if (coSigner && !coTenantEmailDistinctFromPrimary(text(sp.email), coSigner.email)) {
    return {
      ok: false,
      status: 422,
      error: 'Resident 2 must use a different email from resident 1 so each resident can sign.',
    }
  }

  const { data: payout } = await admin
    .from('property_payout_details')
    .select('account_name, bsb, account_number')
    .eq('property_id', booking.property_id)
    .maybeSingle()

  const noticeKind = text(prop.property_type) === 'shared_room' ? 'shared' : 'exclusive'
  const unsharedWeekly = parseVicRoomingUnsharedWeeklyRent(propertyRow.vic_rooming_unshared_weekly_rent)
  const weeklyRent = Number(booking.weekly_rent ?? prop.rent_per_week ?? 0)
  if (noticeKind === 'shared') {
    const missing = vicRoomingUnsharedRentAcceptBlock({
      propertyType: 'shared_room',
      unsharedWeeklyRent: unsharedWeekly,
    })
    if (!missing.ok) return { ok: false, status: 422, error: missing.message }
    if (unsharedWeekly == null || !(unsharedWeekly > weeklyRent)) {
      return { ok: false, status: 422, error: VIC_ROOMING_UNSHARED_RENT_HIGHER }
    }
  }
  const rentErr = vicRoomingRentInAdvanceError({ weeklyRent, amountDueOnOrBeforeMoveIn: weeklyRent })
  if (rentErr) return { ok: false, status: 422, error: rentErr }

  const lastDay = inclusiveLeaseLastDay(endDate) || endDate
  const operator = lp as Record<string, unknown>
  const resident = sp as Record<string, unknown>
  const premisesLine = [text(prop.address), text(prop.suburb), text(prop.state), text(prop.postcode)].filter(Boolean).join(', ')
  const fill: VicRoomingHouseFillProps = {
    agreementDateLabel: '',
    roomNumber,
    streetAddress: text(prop.address),
    suburb: text(prop.suburb),
    postcode: text(prop.postcode),
    itemsLetWithRoom: text(propertyRow.vic_rooming_items_let_with_room),
    operatorName: personName(operator, 'Operator'),
    operatorAddress: [text(operator.address), text(operator.suburb), text(operator.state)].filter(Boolean).join(', '),
    operatorPostcode: text(operator.postcode),
    operatorPhone: text(operator.phone),
    operatorAbn: text(operator.abn),
    operatorEmail: text(operator.email),
    resident1Name: personName(resident, 'Resident'),
    resident1Address: '',
    resident1Postcode: '',
    resident1Phone: text(resident.phone),
    resident1Email: text(resident.email),
    resident2Name: coSigner?.full_name ?? '',
    resident2Address: '',
    resident2Postcode: '',
    resident2Phone: coSigner?.phone ?? '',
    resident2Email: coSigner?.email ?? '',
    startDateLabel: auDate(moveIn),
    endDateLabel: auDate(lastDay),
    weeklyRent: weeklyRent.toFixed(2),
    rentDueDay: weekday(moveIn),
    firstRentDueLabel: auDate(moveIn),
    bondAmount: booking.bond_amount != null ? Number(booking.bond_amount).toFixed(2) : '',
    bondDueLabel: auDate(moveIn),
    pay: vicRoomingPayMethodsFromRow(propertyRow),
    bankAccountName: text(payout?.account_name),
    bankBsb: text(payout?.bsb),
    bankAccountNumber: text(payout?.account_number),
    operatorAcceptsElectronicService: operatorConsent === true,
    residentAcceptsElectronicService: residentConsent,
    resident2AcceptsElectronicService: coSigner?.accepts_electronic_service ?? null,
    urgentContactName: personName(operator, 'Operator'),
    urgentContactPhone: text(operator.phone),
    urgentContactEmail: text(operator.email),
    conditionReport,
  }
  const people = Math.floor(Number(prop.max_occupants))
  return {
    ok: true,
    fill,
    houseRules,
    premisesLine,
    propertyId: booking.property_id,
    landlordId: booking.landlord_id,
    studentId: booking.student_id,
    moveIn,
    endDate,
    weeklyRent,
    bondAmount: booking.bond_amount != null ? Number(booking.bond_amount) : null,
    noticeKind,
    peopleInRoom: Number.isFinite(people) && people > 0 ? String(people) : '',
    noticeAddress: [text(prop.address), text(prop.suburb), text(prop.state)].filter(Boolean).join(', '),
    unsharedWeeklyRent: unsharedWeekly != null ? unsharedWeekly.toFixed(2) : '',
  }
}

async function storePdf(
  admin: SupabaseClient<Database>,
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const uploaded = await admin.storage
    .from('tenancy-documents')
    .upload(path, Buffer.from(bytes), { contentType: 'application/pdf', upsert: true })
  if (uploaded.error) throw new Error(uploaded.error.message)
}

async function uploadMoveInPack(
  admin: SupabaseClient<Database>,
  tenancyId: string,
  loaded: {
    fill: VicRoomingHouseFillProps
    noticeKind: VicRoomingNoticeKind
    peopleInRoom: string
    noticeAddress: string
    weeklyRent: number
    unsharedWeeklyRent: string
  },
): Promise<MoveInRecord[]> {
  const rights = readVicRoomingMoveInPdf('rooming-house-rights-and-duties-s124.pdf')
  const guide = readVicRoomingMoveInPdf('rooming-house-residents-guide.pdf')
  const rightsPath = `${tenancyId}/rooming/${RIGHTS_DRAFT}`
  const guidePath = `${tenancyId}/rooming/${GUIDE_DRAFT}`
  await storePdf(admin, rightsPath, rights)
  await storePdf(admin, guidePath, guide)
  const records: MoveInRecord[] = [
    {
      id: 'rights_and_duties',
      name: 'Rights and duties of a rooming house resident.pdf',
      file_path: rightsPath,
      sha256: sha256Bytes(rights),
    },
    {
      id: 'residents_guide',
      name: 'Rooming house residents guide.pdf',
      file_path: guidePath,
      sha256: sha256Bytes(guide),
    },
  ]
  const residents = [loaded.fill.resident1Name, loaded.fill.resident2Name].map((name) => name.trim()).filter(Boolean)
  for (const [index, residentName] of residents.entries()) {
    const notice = await fillVicRoomingNotice({
      kind: loaded.noticeKind,
      noticeDateLabel: noticeDateLabel(),
      residentName,
      address: loaded.noticeAddress,
      postcode: loaded.fill.postcode,
      roomNumber: loaded.fill.roomNumber,
      operatorName: loaded.fill.operatorName,
      peopleInRoom: loaded.peopleInRoom,
      sharedWeeklyRent: loaded.weeklyRent.toFixed(2),
      unsharedWeeklyRent: loaded.unsharedWeeklyRent,
      signatureLabel: index === 0 ? 'Operator notice signature' : 'Operator notice signature 2',
    })
    const path = `${tenancyId}/rooming/${index === 0 ? NOTICE_DRAFT : NOTICE_2_DRAFT}`
    await storePdf(admin, path, notice.pdfBytes)
    records.push({
      id: loaded.noticeKind === 'shared' ? 'notice_shared' : 'notice_exclusive',
      name:
        loaded.noticeKind === 'shared'
          ? `Notice to proposed resident - shared room${index === 0 ? '' : ' - resident 2'}.pdf`
          : `Notice to proposed resident - exclusive occupancy${index === 0 ? '' : ' - resident 2'}.pdf`,
      file_path: path,
      sha256: sha256Bytes(notice.pdfBytes),
    })
  }
  return records
}
