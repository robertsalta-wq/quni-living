/// <reference types="node" />
// @ts-nocheck - Vercel isolated API TS pass.
/**
 * Dev/ops: mint wrapped /api/sign/{token} URLs for DocuSeal submitter ids.
 * POST JSON: { submitter_ids: number[], refresh_dates?: boolean }
 * Auth: Bearer SUPABASE_SERVICE_ROLE_KEY (same as other server-side tooling).
 */
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import { publicSignWrapUrl } from '../lib/docuseal/signLinkWrap.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
}

function parseBearer(authHeader: string): string {
  const m = /^Bearer\s+(.+)$/i.exec((authHeader || '').trim())
  return (m?.[1] ?? '').trim()
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expected = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const bearer = parseBearer(headerString(req.headers, 'authorization'))
  if (!expected || bearer !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let body: { submitter_ids?: unknown; refresh_dates?: unknown }
  try {
    body = (await readJsonBody(req)) as typeof body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const ids = Array.isArray(body.submitter_ids)
    ? body.submitter_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : []
  if (!ids.length) {
    return res.status(400).json({ error: 'submitter_ids required' })
  }

  const refreshDates = body.refresh_dates !== false

  try {
    const links = Object.fromEntries(
      ids.map((id) => [String(id), publicSignWrapUrl(id, refreshDates)]),
    )
    return res.status(200).json({ ok: true, links, refresh_dates: refreshDates })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ error: msg })
  }
}
