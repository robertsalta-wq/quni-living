/**
 * Hourly: probe latest GitHub Actions CI run on main; upsert operational_status for Admin Apps dot.
 * Vercel Cron: GET /api/cron/github-health
 * Secure with Authorization: Bearer CRON_SECRET
 * Env: GITHUB_STATUS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { captureSentryMessageEdge } from '../lib/sentryEdgeCapture.js'

export const config = { runtime: 'edge' }

const PROBE_TIMEOUT_MS = 15_000
const SERVICE = 'github'
const GITHUB_RUNS_URL =
  'https://api.github.com/repos/robertsalta-wq/quni-living/actions/runs?branch=main&per_page=1'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * @returns {Promise<
 *   | { kind: 'ok', status: 'operational' | 'degraded' | 'down', message: string }
 *   | { kind: 'auth', status: number }
 *   | { kind: 'misconfigured', message: string }
 *   | { kind: 'unreachable', status: number, message: string, url?: string }
 * >}
 */
async function probeGithubActions() {
  const token = (process.env.GITHUB_STATUS_TOKEN || '').trim()
  if (!token) {
    return { kind: 'misconfigured', message: 'GITHUB_STATUS_TOKEN not set' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const res = await fetch(GITHUB_RUNS_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    })

    if (res.status === 401 || res.status === 403) {
      return { kind: 'auth', status: res.status }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        kind: 'unreachable',
        status: res.status,
        message: text.slice(0, 500) || res.statusText,
        url: GITHUB_RUNS_URL,
      }
    }

    let data
    try {
      data = await res.json()
    } catch {
      return {
        kind: 'unreachable',
        status: res.status,
        message: 'Invalid JSON from GitHub Actions API',
        url: GITHUB_RUNS_URL,
      }
    }

    const run = data?.workflow_runs?.[0]
    if (!run) {
      return {
        kind: 'unreachable',
        status: res.status,
        message: 'No workflow runs returned for main',
        url: GITHUB_RUNS_URL,
      }
    }

    const runStatus = String(run.status ?? '').toLowerCase()
    const conclusion = String(run.conclusion ?? '').toLowerCase()
    const name = String(run.name ?? 'CI').trim() || 'CI'

    if (runStatus === 'completed') {
      if (conclusion === 'success') {
        return { kind: 'ok', status: 'operational', message: `${name}: success` }
      }
      if (conclusion === 'failure') {
        return { kind: 'ok', status: 'down', message: `${name}: failure` }
      }
      return {
        kind: 'ok',
        status: 'down',
        message: `${name}: ${conclusion || 'completed without success'}`,
      }
    }

    if (
      runStatus === 'in_progress' ||
      runStatus === 'queued' ||
      runStatus === 'waiting' ||
      runStatus === 'requested' ||
      runStatus === 'pending'
    ) {
      return { kind: 'ok', status: 'degraded', message: `${name}: ${runStatus}` }
    }

    return { kind: 'ok', status: 'degraded', message: `${name}: ${runStatus || 'unknown'}` }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const timedOut = e instanceof Error && e.name === 'AbortError'
    return {
      kind: 'unreachable',
      status: 0,
      message: timedOut ? `GitHub probe timed out after ${PROBE_TIMEOUT_MS}ms` : message,
      url: GITHUB_RUNS_URL,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function clearGithubOperationalStatus(admin) {
  const { error } = await admin.from('operational_status').delete().eq('service_name', SERVICE)
  if (error) {
    console.error('github-health clear operational_status', error)
  }
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const cronToken = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || cronToken !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) {
    return json({ ok: false, reason: 'misconfigured' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const result = await probeGithubActions()

  if (result.kind === 'ok') {
    const checkedAt = new Date().toISOString()
    const { error: upErr } = await admin.from('operational_status').upsert(
      {
        service_name: SERVICE,
        status: result.status,
        message: result.message,
        checked_at: checkedAt,
      },
      { onConflict: 'service_name' },
    )
    if (upErr) {
      console.error('github-health operational_status upsert', upErr)
      return json({ ok: false, reason: 'db' }, 500)
    }
    return json({ ok: true, status: result.status, message: result.message })
  }

  await clearGithubOperationalStatus(admin)

  if (result.kind === 'auth') {
    captureSentryMessageEdge(
      'GitHub Actions API returned 401/403: GITHUB_STATUS_TOKEN is stale or lacks Actions read access — CI status dot will be hidden until the token is rotated on Vercel.',
      { status: result.status },
      {
        level: 'error',
        tags: { service: 'github' },
        fingerprint: ['github-auth-401'],
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
      ? 'GitHub healthcheck misconfigured: GITHUB_STATUS_TOKEN missing on Vercel.'
      : 'GitHub Actions API unreachable — CI status dot hidden until the next successful probe.',
    extra,
    {
      level: 'error',
      tags: { service: 'github' },
      fingerprint: ['github-unreachable'],
    },
  )

  return json({ ok: false, reason: result.kind === 'misconfigured' ? 'misconfigured' : 'unreachable' }, 502)
}
