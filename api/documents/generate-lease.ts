/// <reference types="node" />
// @ts-nocheck — Vercel runs a separate TS check on api/*.ts; see tsconfig.api.json for full project typecheck.
/**
 * Generate NSW Residential Tenancy Agreement PDF, upload to Storage, create tenancy rows,
 * optionally send to DocuSeal (see src/lib/docuseal.ts).
 *
 * POST JSON: { booking_id: string }
 * Authorization: Bearer INTERNAL_DOC_FLOW_SECRET (or X-Internal-Doc-Flow-Secret — some Vercel paths strip Authorization on internal fetch)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTERNAL_DOC_FLOW_SECRET,
 *      DOCUSEAL_* (optional for signing step)
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import { ResidentialTenancyAgreement } from './ResidentialTenancyAgreement.tsx'
import type { ResidentialTenancyAgreementProps } from './rtaTypes.ts'
import { PLATFORM_FEE_PERCENT, sendForSigning } from '../lib/docuseal'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

export default async function handler(request: Request): Promise<Response> {
  console.log('[generate-lease] incoming request', { method: request.method })

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const secret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  const authHeader = request.headers.get('Authorization') ?? ''
  let token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    token = (request.headers.get('x-internal-doc-flow-secret') || '').trim()
  }

  const authHeaderPreview = authHeader.slice(0, 10) || '(empty)'
  const secretPreview = secret.slice(0, 10) || '(empty)'
  const tokenPreview = token.slice(0, 10) || '(empty)'
  const match = Boolean(secret) && token === secret
  console.log('[generate-lease] auth check', {
    authorizationHeaderFirst10: authHeaderPreview,
    expectedSecretFirst10: secretPreview,
    resolvedTokenFirst10: tokenPreview,
    match,
  })

  if (!secret || !match) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  let body: { booking_id?: string }
  try {
    body = (await request.json()) as { booking_id?: string }
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return json({ error: 'booking_id is required' }, 400)
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
        weekly_cleaning_service
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !bookingRaw) {
    return json({ error: 'Booking not found' }, 404)
  }

  type BookingRow = Database['public']['Tables']['bookings']['Row']
  const booking = bookingRaw as BookingRow & {
    properties?: Record<string, unknown> | null
  }

  if (booking.status !== 'confirmed') {
    return json({ error: 'Booking must be confirmed' }, 400)
  }

  if (!booking.property_id || !booking.student_id || !booking.landlord_id) {
    return json({ error: 'Booking missing property or profile ids' }, 400)
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
    return json({ error: 'Could not load profiles' }, 500)
  }

  const prop =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? (booking.properties as Record<string, unknown>)
      : {}

  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  if (!moveIn) {
    return json({ error: 'Booking missing move-in / start date' }, 400)
  }

  const weeklyRent = Number(booking.weekly_rent)
  if (!Number.isFinite(weeklyRent) || weeklyRent <= 0) {
    return json({ error: 'Invalid weekly rent' }, 400)
  }

  const leaseLen = typeof booking.lease_length === 'string' ? booking.lease_length : null
  const endDate = leaseEndDateFromMoveIn(moveIn, leaseLen)
  const periodic = leaseLen === 'Flexible' || endDate == null

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
      return json({ error: 'Could not create tenancy' }, 500)
    }
    tenancyId = insT.id
  }

  const { data: existingLease } = await admin
    .from('tenancy_documents')
    .select('id, status')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'lease')
    .maybeSingle()

  if (existingLease && (existingLease.status === 'sent_for_signing' || existingLease.status === 'signed')) {
    return json({
      ok: true,
      skipped: true,
      tenancy_id: tenancyId,
      document_id: existingLease.id,
      message: 'Lease already sent or signed',
    })
  }

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
      return json({ error: 'Could not create tenancy document' }, 500)
    }
    documentId = insD.id
  }

  const platformFee = Math.round(weeklyRent * (PLATFORM_FEE_PERCENT / 100) * 100) / 100
  const totalWeekly = Math.round((weeklyRent + platformFee) * 100) / 100

  const lpRec = lp as Record<string, unknown>

  const pdfProps: ResidentialTenancyAgreementProps = {
    documentId,
    generatedAt: new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
    landlord: {
      fullName:
        [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim() ||
        (typeof lp.full_name === 'string' ? lp.full_name : 'Landlord'),
      companyName: typeof lp.company_name === 'string' && lp.company_name.trim() ? lp.company_name.trim() : null,
      addressLine: landlordAddressLine(lpRec),
      email: typeof lp.email === 'string' ? lp.email : '—',
      phone: typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone : '—',
    },
    tenant: {
      fullName:
        [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
        (typeof sp.full_name === 'string' ? sp.full_name : 'Tenant'),
      email: typeof sp.email === 'string' ? sp.email : '—',
      phone: typeof sp.phone === 'string' && sp.phone.trim() ? sp.phone : '—',
      dateOfBirth:
        typeof sp.date_of_birth === 'string' && sp.date_of_birth.trim() ? sp.date_of_birth.trim() : null,
    },
    premises: {
      addressLine: propertyAddressLine(prop) || '—',
      propertyType: typeof prop.property_type === 'string' ? prop.property_type : null,
      roomType: typeof prop.room_type === 'string' ? prop.room_type : null,
      furnished: typeof prop.furnished === 'boolean' ? prop.furnished : null,
      linenSupplied: typeof prop.linen_supplied === 'boolean' ? prop.linen_supplied : null,
      weeklyCleaningService:
        typeof prop.weekly_cleaning_service === 'boolean' ? prop.weekly_cleaning_service : null,
    },
    term: {
      startDate: moveIn,
      endDate: periodic ? null : endDate,
      periodic,
      leaseLengthDescription: leaseLen || 'As agreed',
    },
    rent: {
      weeklyRent,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      totalWeekly,
      paymentMethod: 'Via Quni Living platform (quni.com.au)',
    },
    bond: { amount: bondNum },
    specialConditions: [
      'This agreement is facilitated through the Quni Living platform (quni.com.au).',
      'Bond handling is the responsibility of the landlord. Quni Living does not hold or manage bond payments.',
      "Rent payments are processed through Quni Living's secure payment system powered by Stripe.",
    ],
    bookingNotes: typeof booking.notes === 'string' && booking.notes.trim() ? booking.notes.trim() : null,
  }

  const element = React.createElement(ResidentialTenancyAgreement, pdfProps)
  // @react-pdf/renderer expects Document root; our component returns <Document>.
  const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])

  const storagePath = `${tenancyId}/lease/lease_draft.pdf`
  const { error: upErr } = await admin.storage
    .from('tenancy-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    console.error('storage upload lease draft', upErr)
    return json({ error: 'Could not upload PDF' }, 500)
  }

  const { error: pathErr } = await admin
    .from('tenancy_documents')
    .update({ file_path: storagePath, status: 'draft' })
    .eq('id', documentId)

  if (pathErr) {
    console.error('tenancy_documents update path', pathErr)
    return json({ error: 'Could not save file path' }, 500)
  }

  let docusealError: string | undefined
  const hasDocuseal =
    (process.env.DOCUSEAL_API_URL || '').trim() && (process.env.DOCUSEAL_API_TOKEN || '').trim()

  if (hasDocuseal) {
    try {
      await sendForSigning(documentId)
    } catch (e) {
      console.error('sendForSigning', e)
      docusealError = e instanceof Error ? e.message : String(e)
    }
  }

  return json({
    ok: true,
    tenancy_id: tenancyId,
    document_id: documentId,
    file_path: storagePath,
    ...(docusealError ? { docuseal_error: docusealError } : {}),
  })
}
