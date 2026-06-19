/**
 * AI integration canary for platform-health-cron.
 * POST with header x-cron-secret matching PLATFORM_HEALTH_CRON_SECRET (same value as Supabase cron).
 */
import { ANTHROPIC_SONNET_MODEL } from '../lib/anthropicModel.js'
import { probeAnthropicModel } from '../lib/anthropicProbe.js'
import { reportAiFailure } from '../lib/reportAiFailure.js'

export const config = {
  runtime: 'edge',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const expected = (process.env.PLATFORM_HEALTH_CRON_SECRET || '').trim()
  const got = request.headers.get('x-cron-secret')?.trim()
  if (!expected || got !== expected) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 503)
  }

  const probe = await probeAnthropicModel(apiKey)
  if (!probe.ok) {
    await reportAiFailure('health', 'probe failed', {
      status: probe.status,
      message: probe.message,
      model: ANTHROPIC_SONNET_MODEL,
    })
    return json({ ok: false, error: probe.message, model: ANTHROPIC_SONNET_MODEL }, 502)
  }

  return json({ ok: true, model: ANTHROPIC_SONNET_MODEL }, 200)
}
