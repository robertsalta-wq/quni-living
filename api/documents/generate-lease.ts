/// <reference types="node" />
/**
 * Generate NSW Residential Tenancy Agreement PDF, upload to Storage, create tenancy rows,
 * optionally send to DocuSeal (see src/lib/docuseal.ts).
 *
 * POST JSON: { booking_id: string }
 * Authorization: Bearer INTERNAL_DOC_FLOW_SECRET (or X-Internal-Doc-Flow-Secret - some Vercel paths strip Authorization on internal fetch)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTERNAL_DOC_FLOW_SECRET,
 *      DOCUSEAL_* (optional for signing step)
 */
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Database } from '../../src/lib/database.types.js'
import type { ListingDocGenResult } from '../lib/booking/listingAgreementTypes.js'
import { runNswOccupancyListingTenancy } from '../lib/documents/listingTenancyGeneration/nswOccupancy.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

function mapDocGenResult(
  result: ListingDocGenResult,
  deferSigning: boolean,
): { status: number; body: Record<string, unknown> } {
  if (!result.ok) {
    return {
      status: result.status,
      body: {
        error: result.error,
        ...(result.detail ? { detail: result.detail, message: result.detail } : {}),
      },
    }
  }
  if ('skipped' in result && result.skipped) {
    return {
      status: 200,
      body: { ok: true, skipped: true, reason: result.reason },
    }
  }
  return {
    status: 200,
    body: {
      ok: true,
      tenancy_id: result.tenancyId,
      document_id: result.documentId,
      deferred_signing: deferSigning,
      ...(result.docusealSubmissionId ? { docuseal_submission_id: result.docusealSubmissionId } : {}),
    },
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[generate-lease] incoming request', { method: req.method })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  const authHeader = headerString(req.headers, 'authorization')
  let token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    token = headerString(req.headers, 'x-internal-doc-flow-secret').trim()
  }

  const match = Boolean(secret) && token === secret

  if (!secret || !match) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  let body: { booking_id?: string; defer_signing?: boolean }
  try {
    body = (await readJsonBody(req)) as { booking_id?: string; defer_signing?: boolean }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return res.status(400).json({ error: 'booking_id is required' })
  }

  const deferSigning = body.defer_signing === true
  const admin = createClient<Database>(supabaseUrl, serviceRole)
  const result = await runNswOccupancyListingTenancy(admin, bookingId, { deferSigning })
  const mapped = mapDocGenResult(result, deferSigning)
  return res.status(mapped.status).json(mapped.body)
}
