/**
 * Hourly: verify DocuSeal API auth and instance reachability.
 * Vercel Cron: GET /api/cron/docuseal-health
 * Secure with Authorization: Bearer CRON_SECRET
 */
import { getDocusealApiBase, getDocusealAuthHeaders } from '../lib/docusealClient.js'
import { captureSentryMessageEdge } from '../lib/sentryEdgeCapture.js'

export const config = { runtime: 'edge' }

const PROBE_TIMEOUT_MS = 15_000

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function probeDocusealSubmissions() {
  const base = getDocusealApiBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  if (!base || !token) {
    return { kind: 'misconfigured', message: 'DOCUSEAL_API_URL or DOCUSEAL_API_TOKEN not set' }
  }

  const url = `${base}/api/submissions?limit=1`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getDocusealAuthHeaders(),
      signal: controller.signal,
    })
    if (res.status === 200) {
      return { kind: 'ok' }
    }
    if (res.status === 401) {
      return { kind: 'auth', status: res.status }
    }
    const text = await res.text().catch(() => '')
    return {
      kind: 'unreachable',
      status: res.status,
      message: text.slice(0, 500) || res.statusText,
      url,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const timedOut = e instanceof Error && e.name === 'AbortError'
    return {
      kind: 'unreachable',
      status: 0,
      message: timedOut ? `DocuSeal probe timed out after ${PROBE_TIMEOUT_MS}ms` : message,
      url,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await probeDocusealSubmissions()

  if (result.kind === 'ok') {
    return json({ ok: true })
  }

  if (result.kind === 'auth') {
    captureSentryMessageEdge(
      'DocuSeal API returned 401: DOCUSEAL_API_TOKEN is stale or invalid — tenancy agreement signing is down until the token is rotated on Vercel and Railway.',
      { status: result.status },
      {
        level: 'error',
        tags: { service: 'docuseal' },
        fingerprint: ['docuseal-auth-401'],
      },
    )
    return json({ ok: false, reason: 'auth' }, 502)
  }

  const extra =
    result.kind === 'misconfigured'
      ? { detail: result.message }
      : { status: result.status, url: result.url, detail: result.message }

  captureSentryMessageEdge(
    result.kind === 'misconfigured'
      ? 'DocuSeal healthcheck misconfigured: DOCUSEAL_API_URL or DOCUSEAL_API_TOKEN missing on Vercel.'
      : 'DocuSeal API unreachable or returned a non-auth error — signing may be down (instance down, network, or unexpected HTTP status).',
    extra,
    {
      level: 'error',
      tags: { service: 'docuseal' },
      fingerprint: ['docuseal-unreachable'],
    },
  )

  return json({ ok: false, reason: 'unreachable' }, 502)
}
