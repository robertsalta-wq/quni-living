/// <reference types="node" />
// @ts-nocheck — Vercel runs a separate TS check on api/*.ts; see tsconfig.api.json.
/**
 * Generate boarding/lodger bond receipt PDF, upload, update tenancy, notify by email.
 *
 * POST JSON: { tenancy_id, date_received, amount, payment_method, notes? }
 * Authorization: Bearer INTERNAL_DOC_FLOW_SECRET, or Bearer <Supabase access_token> (landlord must own tenancy).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTERNAL_DOC_FLOW_SECRET,
 *      SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY, RESEND_API_KEY
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import { BondReceiptPdf } from './BondReceiptPdf.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'

/** Mirrors `src/lib/listings.ts` — kept local so Vercel’s API TS compile graph stays self-contained. */
function isBoardingLodgerBondContext(
  propertyType: string | null | undefined,
  listingType: string | null | undefined,
): boolean {
  if (listingType === 'homestay') return true
  const pt = typeof propertyType === 'string' ? propertyType.trim() : ''
  if (!pt) return false
  return ['private_room_landlord_on_site', 'boarding', 'lodger', 'homestay'].includes(pt)
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

const PAYMENT_METHODS = new Set(['Cash', 'Bank Transfer', 'Other'])

function parseBearerFromHeader(authHeader: string): string {
  const h = authHeader.trim()
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return (m?.[1] ?? '').trim()
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

function personFullName(row: Record<string, unknown>): string {
  const a = [row.first_name, row.last_name].filter((x) => typeof x === 'string' && String(x).trim())
  const joined = a.join(' ').trim()
  if (joined) return joined
  const full = typeof row.full_name === 'string' ? row.full_name.trim() : ''
  return full || '—'
}

function formatBondAud(amount: number): string {
  const n = Math.round(amount * 100) / 100
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function receiptNumberFromTenancy(tenancyId: string, dateReceivedYmd: string): string {
  const year = dateReceivedYmd.slice(0, 4)
  const idPart = tenancyId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `QR-${year}-${idPart}`
}

function bondLodgedAtIso(dateYmd: string): string {
  return `${dateYmd}T12:00:00.000Z`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendResendWithAttachment(opts: {
  to: string
  subject: string
  html: string
  pdfBase64: string
  filename: string
}) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Quni Living <noreply@quni.com.au>',
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      attachments: [{ filename: opts.filename, content: opts.pdfBase64 }],
    }),
  })
  if (!res.ok) {
    let detail: unknown
    try {
      detail = await res.json()
    } catch {
      detail = await res.text()
    }
    console.error('[generate-bond-receipt] Resend error', detail)
    throw new Error('Failed to send email')
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const internalSecret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const bearer = parseBearerFromHeader(headerString(req.headers, 'authorization'))
  if (!bearer) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const admin = createClient<Database>(supabaseUrl, serviceRole)

  let actingLandlordUserId: string | null = null

  if (internalSecret && bearer === internalSecret) {
    /* internal trigger */
  } else {
    if (!anonKey) {
      return res.status(500).json({ error: 'Server misconfigured' })
    }
    const authClient = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await authClient.auth.getUser(bearer)
    if (userErr || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    actingLandlordUserId = user.id
  }

  let body: {
    tenancy_id?: string
    date_received?: string
    amount?: number
    payment_method?: string
    notes?: string | null
  }
  try {
    body = (await readJsonBody(req)) as typeof body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const tenancyId = typeof body.tenancy_id === 'string' ? body.tenancy_id.trim() : ''
  const dateReceived = typeof body.date_received === 'string' ? body.date_received.trim().slice(0, 10) : ''
  const amountRaw = body.amount
  const paymentMethod = typeof body.payment_method === 'string' ? body.payment_method.trim() : ''
  const notesRaw = typeof body.notes === 'string' ? body.notes.trim() : ''

  if (!tenancyId) {
    return res.status(400).json({ error: 'tenancy_id is required' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateReceived)) {
    return res.status(400).json({ error: 'date_received must be YYYY-MM-DD' })
  }
  if (typeof amountRaw !== 'number' || !Number.isFinite(amountRaw) || amountRaw <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }
  const amount = Math.round(amountRaw * 100) / 100
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return res.status(400).json({ error: 'payment_method must be Cash, Bank Transfer, or Other' })
  }
  const notes = notesRaw ? notesRaw.slice(0, 2000) : null

  const { data: tenancy, error: tErr } = await admin.from('tenancies').select('*').eq('id', tenancyId).maybeSingle()
  if (tErr || !tenancy) {
    return res.status(404).json({ error: 'Tenancy not found' })
  }

  if (actingLandlordUserId) {
    const { data: lp, error: lpErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', actingLandlordUserId)
      .maybeSingle()
    if (lpErr || !lp?.id || lp.id !== tenancy.landlord_profile_id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

  if (!tenancy.property_id || !tenancy.student_profile_id || !tenancy.landlord_profile_id) {
    return res.status(400).json({ error: 'Tenancy is missing related records' })
  }

  const { data: existingDoc } = await admin
    .from('tenancy_documents')
    .select('id')
    .eq('tenancy_id', tenancyId)
    .eq('document_type', 'bond_receipt')
    .maybeSingle()

  if (existingDoc) {
    return res.status(409).json({ error: 'Bond receipt already exists for this tenancy' })
  }

  if (tenancy.bond_lodged_at) {
    return res.status(409).json({ error: 'Bond has already been marked as received' })
  }

  const { data: prop, error: pErr } = await admin
    .from('properties')
    .select('address, suburb, state, postcode, property_type, listing_type, bond')
    .eq('id', tenancy.property_id)
    .maybeSingle()

  if (pErr || !prop) {
    return res.status(404).json({ error: 'Property not found' })
  }

  const propRec = prop as Record<string, unknown>
  if (!isBoardingLodgerBondContext(prop.property_type, prop.listing_type)) {
    return res.status(400).json({ error: 'Bond receipts are only for boarding/lodger or homestay listings' })
  }

  const { data: landlord, error: llErr } = await admin
    .from('landlord_profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', tenancy.landlord_profile_id)
    .maybeSingle()

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', tenancy.student_profile_id)
    .maybeSingle()

  if (llErr || stErr || !landlord || !student) {
    return res.status(500).json({ error: 'Could not load landlord or student profile' })
  }

  const llRec = landlord as Record<string, unknown>
  const stRec = student as Record<string, unknown>
  const landlordName = personFullName(llRec)
  const tenantName = personFullName(stRec)
  const landlordEmail = typeof llRec.email === 'string' && llRec.email.trim() ? llRec.email.trim() : ''
  const studentEmail = typeof stRec.email === 'string' && stRec.email.trim() ? stRec.email.trim() : ''

  const receiptNumber = receiptNumberFromTenancy(tenancyId, dateReceived)
  const addressLine = propertyAddressLine(propRec) || '—'
  const dateObj = new Date(`${dateReceived}T12:00:00`)
  const dateReceivedDisplay = Number.isFinite(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : dateReceived

  const pdfProps = {
    receiptNumber,
    dateReceivedDisplay,
    propertyAddress: addressLine,
    landlordName,
    landlordEmail: landlordEmail || '—',
    tenantName,
    amountDisplay: formatBondAud(amount),
    paymentMethod,
    notes,
    acknowledgementName: landlordName,
  }

  const element = React.createElement(BondReceiptPdf, pdfProps)
  const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  const storagePath = `${tenancyId}/bond/bond_receipt.pdf`

  const { error: upErr } = await admin.storage
    .from('tenancy-documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    console.error('[generate-bond-receipt] storage upload', upErr)
    return res.status(500).json({ error: 'Could not upload PDF' })
  }

  const bondLodgedAt = bondLodgedAtIso(dateReceived)
  const { data: updatedTenancy, error: upT } = await admin
    .from('tenancies')
    .update({
      bond_lodged_at: bondLodgedAt,
      bond_lodgement_reference: receiptNumber,
    })
    .eq('id', tenancyId)
    .is('bond_lodged_at', null)
    .select('id')
    .maybeSingle()

  if (upT || !updatedTenancy) {
    console.error('[generate-bond-receipt] tenancy update race or error', upT)
    return res.status(409).json({ error: 'Could not update tenancy (it may have been updated already)' })
  }

  const { data: docRow, error: docErr } = await admin
    .from('tenancy_documents')
    .insert({
      tenancy_id: tenancyId,
      document_type: 'bond_receipt',
      status: 'signed',
      file_path: storagePath,
      generated_by: actingLandlordUserId,
      metadata: {
        payment_method: paymentMethod,
        notes,
        amount_received: amount,
      },
    })
    .select('id')
    .single()

  if (docErr || !docRow) {
    console.error('[generate-bond-receipt] tenancy_documents insert', docErr)
    return res.status(500).json({ error: 'Could not save document record' })
  }

  const { data: signedData } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

  const downloadUrl = signedData?.signedUrl ?? ''
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
  const amountLine = formatBondAud(amount)
  const subject = `Bond receipt for ${addressLine}`
  const safeAddr = escapeHtml(addressLine)
  const htmlBody = `
<p>Your bond receipt for ${safeAddr} is attached.</p>
<p>Receipt number: <strong>${escapeHtml(receiptNumber)}</strong>. Amount: <strong>${escapeHtml(amountLine)}</strong>.</p>
${downloadUrl ? `<p><a href="${escapeHtml(downloadUrl)}">Download PDF</a> (link expires in 7 days)</p>` : ''}
`.trim()

  const emailErrors: string[] = []
  if (landlordEmail) {
    try {
      await sendResendWithAttachment({
        to: landlordEmail,
        subject,
        html: htmlBody,
        pdfBase64,
        filename: 'bond_receipt.pdf',
      })
    } catch {
      emailErrors.push('landlord email failed')
    }
  } else {
    emailErrors.push('landlord email missing')
  }
  if (studentEmail) {
    try {
      await sendResendWithAttachment({
        to: studentEmail,
        subject,
        html: htmlBody,
        pdfBase64,
        filename: 'bond_receipt.pdf',
      })
    } catch {
      emailErrors.push('student email failed')
    }
  } else {
    emailErrors.push('student email missing')
  }

  return res.status(200).json({
    ok: true,
    tenancy_id: tenancyId,
    document_id: docRow.id,
    receipt_number: receiptNumber,
    file_path: storagePath,
    download_url: downloadUrl || undefined,
    ...(emailErrors.length ? { email_warnings: emailErrors } : {}),
  })
}
