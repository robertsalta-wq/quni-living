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
 * Lives under api/documents/ so Vercel NFT includes BondReceiptPdf.tsx the same way as
 * generate-bond-receipt (api/admin entry was FUNCTION_INVOCATION_FAILED on cold start).
 */
// @ts-nocheck - Vercel isolated API TS pass.
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'
import { generateAndPersistListingBondReceipt } from './listingBondReceipt.js'
import { sendListingBondReceivedEmails } from '../lib/booking/listingTransactionalEmails.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    },
  })
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }
  const { user } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const bookingId = typeof rec.bookingId === 'string' ? rec.bookingId.trim() : ''
  if (!bookingId) {
    return json({ error: 'bookingId is required' }, 400, origin)
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
    return json({ error: 'Could not load booking' }, 500, origin)
  }
  if (!booking) {
    return json({ error: 'Booking not found' }, 404, origin)
  }
  if (booking.service_tier_final !== 'listing') {
    return json({ error: 'Only Listing bookings support this bond receipt backfill' }, 400, origin)
  }

  const gen = await generateAndPersistListingBondReceipt({
    admin,
    bookingId,
    generatedByUserId: user.id,
    force,
    logger: console,
  })

  if (gen.status === 'skipped') {
    return json(
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
    return json(
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
  let emailWarning: string | null = null
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

  return json(
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
