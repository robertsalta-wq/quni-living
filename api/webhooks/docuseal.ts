/// <reference types="node" />
// @ts-nocheck — Vercel isolated API TS pass.
/**
 * DocuSeal webhook — submission completed → signed PDF in Storage + emails.
 * Configure in DocuSeal: POST https://YOUR_DOMAIN/api/webhooks/docuseal
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DOCUSEAL_API_URL, DOCUSEAL_API_TOKEN, RESEND_API_KEY
 */
import { handleSigningWebhook } from '../lib/docuseal.js'
import { readJsonBody } from '../lib/nodeHandler.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  let payload: unknown
  try {
    payload = await readJsonBody(req)
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' })
  }

  try {
    const result = await handleSigningWebhook(payload)
    return res.status(200).json(result)
  } catch (e) {
    console.error('docuseal webhook', e)
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(500).json({ ok: false, error: msg })
  }
}
