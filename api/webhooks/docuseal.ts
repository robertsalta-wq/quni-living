/// <reference types="node" />
// @ts-nocheck — Vercel isolated API TS pass.
/**
 * DocuSeal webhook — submission completed → signed PDF in Storage + emails.
 * Configure in DocuSeal: POST https://YOUR_DOMAIN/api/webhooks/docuseal
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DOCUSEAL_API_URL, DOCUSEAL_API_TOKEN, RESEND_API_KEY
 */
import { handleSigningWebhook } from '../lib/docuseal'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: unknown
  try {
    const text = await request.text()
    payload = text ? JSON.parse(text) : {}
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await handleSigningWebhook(payload)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('docuseal webhook', e)
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
