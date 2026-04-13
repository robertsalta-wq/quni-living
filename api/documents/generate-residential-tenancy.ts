/// <reference types="node" />
// @ts-nocheck — Vercel runs a separate TS check on api/*.ts; see tsconfig.api.json for full project typecheck.
/**
 * Generate NSW Residential Tenancy Agreement (FT6600) + Quni Platform Addendum PDFs, upload to Storage,
 * create tenancy_documents row, optionally send both to DocuSeal as one submission.
 *
 * POST JSON: { booking_id: string }
 * Authorization: Bearer INTERNAL_DOC_FLOW_SECRET (or X-Internal-Doc-Flow-Secret)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTERNAL_DOC_FLOW_SECRET,
 *      DOCUSEAL_* (optional for signing step)
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../src/lib/database.types'
/** Bundled from `src/lib/documents/NswResidentialTenancyAgreement.tsx` via `npm run build:api-documents` — not `_legacy`. */
import { NswResidentialTenancyAgreement } from './NswResidentialTenancyAgreement.js'
import { QuniPlatformAddendum } from './QuniPlatformAddendum.js'
import type { NswResidentialTenancyAgreementProps } from './rtaTypes'
import { PLATFORM_FEE_PERCENT, sendResidentialTenancyPackageForSigning } from '../lib/docuseal.js'
import { captureSentryMessageEdge } from '../lib/sentryEdgeCapture.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import {
  buildRtaRentPaymentMethodLine,
  fetchBankDetailsForRta,
  fetchPlatformConfigValueMap,
} from '../lib/platformConfig.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
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
  return parts.join(', ') || '—'
}

export default async function handler(req: any, res: any) {
  console.log('[generate-residential-tenancy] incoming request', { method: req.method })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  const authHeader = headerString(req.headers, 'authorization')
  let token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    token = headerString(req.headers, 'x-internal-doc-flow-secret').trim()
  }

  const authHeaderPreview = authHeader.slice(0, 10) || '(empty)'
  const secretPreview = secret.slice(0, 10) || '(empty)'
  const tokenPreview = token.slice(0, 10) || '(empty)'
  const match = Boolean(secret) && token === secret
  console.log('[generate-residential-tenancy] auth check', {
    authorizationHeaderFirst10: authHeaderPreview,
    expectedSecretFirst10: secretPreview,
    resolvedTokenFirst10: tokenPreview,
    match,
  })

  if (!secret || !match) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  let body: { booking_id?: string }
  try {
    body = (await readJsonBody(req)) as { booking_id?: string }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return res.status(400).json({ error: 'booking_id is required' })
  }

  const admin = createClient<Database>(supabaseUrl, serviceRole)

  const { data: bookingRaw, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      property_id,
      student_id,
      landlord_id,
      status,
      weekly_rent,
      move_in_date,
      start_date,
      end_date,
      lease_length,
      notes,
      housemates_count,
      rent_payment_method,
      properties (
        title,
        address,
        suburb,
        state,
        postcode,
        rent_per_week,
        room_type,
        property_type,
        furnished,
        bond,
        linen_supplied,
        weekly_cleaning_service,
        house_rules
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !bookingRaw) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  type BookingRow = Database['public']['Tables']['bookings']['Row']
  const booking = bookingRaw as BookingRow & {
    properties?: Record<string, unknown> | null
  }

  if (booking.status !== 'confirmed') {
    return res.status(400).json({ error: 'Booking must be confirmed' })
  }

  if (!booking.property_id || !booking.student_id || !booking.landlord_id) {
    return res.status(400).json({ error: 'Booking missing property or profile ids' })
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
    return res.status(500).json({ error: 'Could not load profiles' })
  }

  const prop =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? (booking.properties as Record<string, unknown>)
      : {}

  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  if (!moveIn) {
    return res.status(400).json({ error: 'Booking missing move-in / start date' })
  }

  const weeklyRent = Number(booking.weekly_rent)
  if (!Number.isFinite(weeklyRent) || weeklyRent <= 0) {
    return res.status(400).json({ error: 'Invalid weekly rent' })
  }

  const leaseLen = typeof booking.lease_length === 'string' ? booking.lease_length : null
  const bookingEndRaw = typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null
  const bookingEnd =
    bookingEndRaw && /^\d{4}-\d{2}-\d{2}$/.test(bookingEndRaw) ? bookingEndRaw : null
  const periodic = leaseLen === 'Flexible'
  const computedEnd = periodic ? null : leaseEndDateFromMoveIn(moveIn, leaseLen)
  const endDate = periodic ? null : bookingEnd || computedEnd

  const bondNum =
    typeof prop.bond === 'number' && Number.isFinite(prop.bond)
      ? prop.bond
      : Math.round(weeklyRent * 4 * 100) / 100

  const { data: existingTenancy } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()

  let tenancyId = existingTenancy?.id
  if (!tenancyId) {
    const { data: insT, error: tInsErr } = await admin
      .from('tenancies')
      .insert({
        booking_id: bookingId,
        property_id: booking.property_id,
        landlord_profile_id: booking.landlord_id,
        student_profile_id: booking.student_id,
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
      return res.status(500).json({ error: 'Could not create tenancy' })
    }
    tenancyId = insT.id
  }

  const { data: existingRta } = await admin
    .from('tenancy_documents')
    .select('id, status')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'residential_tenancy')
    .maybeSingle()

  /** Signed PDFs are immutable (DocuSeal output). Draft blobs may still be refreshed for `sent_for_signing`. */
  const existingRtaStatus = existingRta?.status
  const skipEntirely = existingRtaStatus === 'signed'
  const refreshDraftPdfsOnly = existingRtaStatus === 'sent_for_signing'

  if (skipEntirely) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      tenancy_id: tenancyId,
      document_id: existingRta?.id,
      message: 'Residential tenancy package already signed',
    })
  }

  let bankDetails
  try {
    bankDetails = await fetchBankDetailsForRta(admin)
  } catch (e) {
    console.error('[generate-residential-tenancy] platform_config bank fetch', e)
    await captureSentryMessageEdge('Residential tenancy: failed to load platform_config for bank details', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
    return res.status(500).json({ error: 'Could not load platform payment settings' })
  }

  if (!bankDetails.bsb || !bankDetails.accountNumber) {
    await captureSentryMessageEdge(
      'Residential tenancy: bank BSB or account number missing in platform_config',
      { booking_id: bookingId },
    )
    return res.status(400).json({
      error:
        'Rent payment details are not configured: set bank BSB and account number under Admin → Business settings before generating this document.',
    })
  }

  const rentPaymentMethodLine = buildRtaRentPaymentMethodLine(bankDetails)

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
      return res.status(500).json({ error: 'Could not create tenancy document' })
    }
    documentId = insD.id
  }

  const platformFee = Math.round(weeklyRent * (PLATFORM_FEE_PERCENT / 100) * 100) / 100
  const totalWeekly = Math.round((weeklyRent + platformFee) * 100) / 100

  const lpRec = lp as Record<string, unknown>

  const landlordFullName =
    [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof lp.full_name === 'string' ? lp.full_name : 'Landlord')
  const landlordPhoneRaw = typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone.trim() : '—'
  const urgentTradeLine =
    landlordPhoneRaw && landlordPhoneRaw !== '—'
      ? `${landlordFullName} — ${landlordPhoneRaw}`
      : landlordFullName

  const housematesRaw = booking.housemates_count
  const maxOccupantsPermitted = (housematesRaw ?? 1) + 1

  const generatedAt = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })

  const sharedLandlord = {
    fullName: landlordFullName,
    companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
    addressLine: landlordAddressLine(lpRec),
    email: typeof lp.email === 'string' ? lp.email : '—',
    phone: landlordPhoneRaw,
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
    email: typeof sp.email === 'string' ? sp.email : '—',
    phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone.trim() : '—',
    dateOfBirth:
      typeof sp.date_of_birth === 'string' && sp.date_of_birth.trim() ? sp.date_of_birth.trim() : null,
    emergencyContactName: emergencyContactNameRaw ? emergencyContactNameRaw : null,
    emergencyContactPhone: emergencyContactPhoneRaw ? emergencyContactPhoneRaw : null,
    addressForServiceLine: null,
  }

  const sharedPremises = {
    addressLine: propertyAddressLine(prop) || '—',
    propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
    roomType: typeof prop.room_type === 'string' ? prop.room_type : null,
    furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
    linenSupplied: typeof prop.linen_supplied === 'boolean' ? prop.linen_supplied : null,
    weeklyCleaningService:
      typeof prop.weekly_cleaning_service === 'boolean' ? prop.weekly_cleaning_service : null,
  }

  const sharedTerm = {
    startDate: moveIn,
    endDate: periodic ? null : endDate,
    periodic,
    leaseLengthDescription: leaseLen || 'As agreed',
  }

  const sharedRent = {
    weeklyRent,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    totalWeekly,
    paymentMethod: rentPaymentMethodLine,
  }

  const landlordEmailForService = typeof lp.email === 'string' && lp.email.trim() ? lp.email.trim() : '—'
  const tenantEmailForService = typeof sp.email === 'string' && sp.email.trim() ? sp.email.trim() : '—'

  const rtaProps: NswResidentialTenancyAgreementProps = {
    documentId,
    generatedAt,
    landlord: sharedLandlord,
    tenant: sharedTenant,
    additionalTenantNames: [],
    premises: sharedPremises,
    premisesPartDescription: null,
    additionalPremisesInclusions: [],
    maxOccupantsPermitted,
    term: sharedTerm,
    rent: {
      ...sharedRent,
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: bondNum },
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
    specialConditions: [],
    bookingNotes: typeof booking.notes === 'string' && booking.notes.trim() ? booking.notes.trim() : null,
  }

  const rpm = booking.rent_payment_method
  const rentPaymentMethod: 'bank_transfer' | 'quni_platform' | null =
    rpm === 'bank_transfer' || rpm === 'quni_platform' ? rpm : null

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
    console.error('[generate-residential-tenancy] platform_config communication emails', e)
    await captureSentryMessageEdge('Residential tenancy: failed to load platform_config for addendum emails', {
      booking_id: bookingId,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  const ecName = (sharedTenant.emergencyContactName ?? '').trim()
  const ecPhone = (sharedTenant.emergencyContactPhone ?? '').trim()
  const emergencyContact =
    ecName && ecPhone ? `${ecName} — ${ecPhone}` : ecPhone || ecName || '—'

  let utilitiesCap = 0
  try {
    const { data: pcRow, error: pcErr } = await admin
      .from('pricing_config')
      .select('utilities_cap')
      .eq('tier', 't2')
      .limit(1)
      .maybeSingle()
    if (!pcErr && pcRow != null) {
      const raw = (pcRow as { utilities_cap?: number | string | null }).utilities_cap
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (Number.isFinite(n) && n >= 0) utilitiesCap = n
    }
  } catch (e) {
    console.error('[generate-residential-tenancy] pricing_config utilities_cap t2', e)
  }

  const houseRulesFromProperty =
    typeof prop.house_rules === 'string' ? prop.house_rules.trim() : ''
  const houseRules = houseRulesFromProperty || platformDefaultHouseRules

  const addendumProps = {
    documentId,
    generatedAt,
    landlord: sharedLandlord,
    tenant: sharedTenant,
    premises: sharedPremises,
    term: sharedTerm,
    rent: sharedRent,
    bond: { amount: bondNum },
    utilitiesDescription:
      'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.',
    signingPackage: 'residential_tenancy' as const,
    rentPaymentMethod,
    bankDetails: {
      bsb: bankDetails.bsb,
      accountNumber: bankDetails.accountNumber,
      accountName: bankDetails.accountName,
      bankName: bankDetails.bankName,
    },
    emergencyContact,
    rentEnquiriesEmail,
    generalEnquiriesEmail,
    houseCommunicationsChannel: 'Property WhatsApp group (house-related only)',
    utilitiesCap,
    houseRules,
  }

  const rtaEl = React.createElement(NswResidentialTenancyAgreement, rtaProps)
  const addendumEl = React.createElement(QuniPlatformAddendum, addendumProps)

  const rtaBuffer = await renderToBuffer(rtaEl as Parameters<typeof renderToBuffer>[0])
  const addendumBuffer = await renderToBuffer(addendumEl as Parameters<typeof renderToBuffer>[0])

  const rtaStoragePath = `${tenancyId}/residential_tenancy/nsw_residential_tenancy_agreement_draft.pdf`
  const addendumStoragePath = `${tenancyId}/residential_tenancy/quni_platform_addendum_draft.pdf`

  const { error: rtaUpErr } = await admin.storage
    .from('tenancy-documents')
    .upload(rtaStoragePath, rtaBuffer, { contentType: 'application/pdf', upsert: true })

  if (rtaUpErr) {
    console.error('storage upload NSW RTA draft', rtaUpErr)
    return res.status(500).json({ error: 'Could not upload NSW RTA PDF' })
  }

  const { error: addUpErr } = await admin.storage
    .from('tenancy-documents')
    .upload(addendumStoragePath, addendumBuffer, { contentType: 'application/pdf', upsert: true })

  if (addUpErr) {
    console.error('storage upload addendum draft', addUpErr)
    return res.status(500).json({ error: 'Could not upload addendum PDF' })
  }

  if (refreshDraftPdfsOnly) {
    return res.status(200).json({
      ok: true,
      tenancy_id: tenancyId,
      document_id: documentId,
      file_path: rtaStoragePath,
      addendum_file_path: addendumStoragePath,
      refreshed_draft_pdfs_only: true,
      message:
        'Draft RTA PDFs re-uploaded to Storage; DocuSeal submission unchanged. Downloaded signed copies stay as executed until a new signing round.',
    })
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
    return res.status(500).json({ error: 'Could not save file path' })
  }

  let docusealError: string | undefined
  const hasDocuseal =
    (process.env.DOCUSEAL_API_URL || '').trim() && (process.env.DOCUSEAL_API_TOKEN || '').trim()

  if (hasDocuseal) {
    try {
      await sendResidentialTenancyPackageForSigning(documentId, { submitterSignReason: false })
    } catch (e) {
      console.error('sendResidentialTenancyPackageForSigning', e)
      docusealError = e instanceof Error ? e.message : String(e)
    }
  }

  return res.status(200).json({
    ok: true,
    tenancy_id: tenancyId,
    document_id: documentId,
    file_path: rtaStoragePath,
    addendum_file_path: addendumStoragePath,
    ...(docusealError ? { docuseal_error: docusealError } : {}),
  })
}
