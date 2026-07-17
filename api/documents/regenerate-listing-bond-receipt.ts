/**
 * POST /api/documents/regenerate-listing-bond-receipt
 * (also rewritten from /api/admin/regenerate-listing-bond-receipt)
 *
 * Admin backfill / force-regenerate Listing bond_receipt PDF for a booking
 * (including already-active bookings that never got a receipt row).
 *
 * Body JSON:
 *   { bookingId: string, force?: boolean, reEmail?: boolean }
 *   - force (default true): overwrite existing bond_receipt PDF + row; if false, insert-only
 *   - reEmail (default false): email PDF to landlord + renter after success
 *
 * Auth: Bearer <admin Supabase JWT> via requireAdminUser
 *
 * Node (req, res) handler — Vercel Node runtime does not pass Fetch Request here
 * (Web-style handler crashed: request.headers.get is not a function).
 *
 * NFT: PDF components are .ts so `./BondReceiptPdf.js` resolves; entry imports them
 * so the lambda package includes the modules.
 */
// @ts-nocheck - Vercel isolated API TS pass.
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import { BondReceiptPdf } from './BondReceiptPdf.js'
import { QldBondPaymentReceiptPdf } from './QldBondPaymentReceiptPdf.js'
import { generateAndPersistListingBondReceipt } from './listingBondReceipt.js'
import { sendListingBondReceivedEmails } from '../lib/booking/listingTransactionalEmails.js'

// Keep entry-level bindings so NFT cannot tree-shake the PDF modules away.
void BondReceiptPdf
void QldBondPaymentReceiptPdf

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

function corsJson(res, body, status = 200, origin) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

export default async function handler(req, res) {
  const origin = headerString(req.headers, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return corsJson(res, { error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  // Adapt Node headers to the Fetch-shaped object requireAdminUser expects.
  const authRequest = {
    headers: {
      get: (name) => {
        const v = headerString(req.headers, String(name).toLowerCase())
        return v || null
      },
    },
  }

  const authResult = await requireAdminUser(authRequest, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return corsJson(res, { error: authResult.error }, authResult.status, origin)
  }
  const { user } = authResult

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const rec = body && typeof body === 'object' ? body : {}
  const bookingId = typeof rec.bookingId === 'string' ? rec.bookingId.trim() : ''
  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }

  const force = rec.force === false ? false : true
  const reEmail = rec.reEmail === true

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .select('id, status, service_tier_final, bond_received_by_landlord_at')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingErr) {
    console.error('[admin/regenerate-listing-bond-receipt] booking load', bookingErr)
    return corsJson(res, { error: 'Could not load booking' }, 500, origin)
  }
  if (!booking) {
    return corsJson(res, { error: 'Booking not found' }, 404, origin)
  }
  if (booking.service_tier_final !== 'listing') {
    return corsJson(res, { error: 'Only Listing bookings support this bond receipt backfill' }, 400, origin)
  }

  const gen = await generateAndPersistListingBondReceipt({
    admin,
    bookingId,
    generatedByUserId: user.id,
    force,
    logger: console,
  })

  if (gen.status === 'skipped') {
    return corsJson(
      res,
      {
        ok: false,
        code: gen.reason,
        error: `Bond receipt generation skipped: ${gen.reason}`,
        booking_id: bookingId,
        booking_status: booking.status,
      },
      422,
      origin,
    )
  }

  if (gen.status === 'skipped_exists') {
    return corsJson(
      res,
      {
        ok: true,
        status: 'skipped_exists',
        document_id: gen.documentId,
        booking_id: bookingId,
        message: 'bond_receipt already exists; pass force:true to overwrite',
      },
      200,
      origin,
    )
  }

  let emailed = false
  let emailWarning = null
  if (reEmail) {
    try {
      await sendListingBondReceivedEmails(admin, bookingId, {
        pdfAttachment: { filename: 'bond_receipt.pdf', content: gen.pdfBase64 },
      })
      emailed = true
    } catch (e) {
      console.error('[admin/regenerate-listing-bond-receipt] reEmail', bookingId, e)
      emailWarning = e instanceof Error ? e.message : 'email failed'
    }
  }

  return corsJson(
    res,
    {
      ok: true,
      status: gen.status,
      document_id: gen.documentId,
      file_path: gen.filePath,
      receipt_number: gen.receiptNumber,
      booking_id: bookingId,
      booking_status: booking.status,
      emailed,
      ...(emailWarning ? { email_warning: emailWarning } : {}),
    },
    200,
    origin,
  )
}
