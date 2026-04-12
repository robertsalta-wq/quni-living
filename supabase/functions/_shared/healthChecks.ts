/**
 * Parallel platform health checks (5s timeout each) for operational_status + Apps dashboard.
 */
import { fetchTppDomainsWithDetails, loadTppEnvFromDeno, TppApiError } from './tppWholesale.ts'

export type HealthStatus = 'operational' | 'degraded' | 'down'

export type HealthResult = {
  service: string
  status: HealthStatus
  message: string
}

/** Reserved for future overrides; checks read Supabase/TPP/Stripe secrets from Deno.env. */
export type HealthCheckEnv = Record<string, never>

const TIMEOUT_MS = 5000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS)
}

async function checkTppDomains(): Promise<HealthResult> {
  const service = 'tpp_domains'
  try {
    const env = loadTppEnvFromDeno()
    if (!env) {
      return {
        service,
        status: 'down',
        message: 'TPP_API_USER, TPP_API_PASSWORD, or TPP_ACCOUNT_NUM not configured',
      }
    }
    const rows = await fetchTppDomainsWithDetails(env)
    if (rows.length === 0) {
      return { service, status: 'operational', message: 'No quni domains in TPP list' }
    }
    const daysList = rows.map((r) => r.daysUntilExpiry)
    if (daysList.some((d) => d === null || d === undefined)) {
      return { service, status: 'degraded', message: 'Some domains missing expiry data' }
    }
    const minDays = Math.min(...(daysList as number[]))
    if (minDays < 60) {
      return {
        service,
        status: 'degraded',
        message: `Shortest renewal window: ${minDays} day(s); target ≥ 60`,
      }
    }
    return { service, status: 'operational', message: 'All quni domains renew in 60+ days' }
  } catch (e) {
    const msg =
      e instanceof TppApiError
        ? `${e.code}: ${e.detail || e.message}`
        : e instanceof Error
          ? e.message
          : 'TPP check failed'
    return { service, status: 'down', message: msg }
  }
}

async function checkDocuseal(): Promise<HealthResult> {
  const service = 'docuseal'
  try {
    const res = await fetch('https://sign.quni.com.au', {
      method: 'GET',
      redirect: 'follow',
      signal: timeoutSignal(),
    })
    if (res.status >= 200 && res.status < 400) {
      return { service, status: 'operational', message: `HTTP ${res.status}` }
    }
    return { service, status: 'down', message: `HTTP ${res.status}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return { service, status: 'down', message: msg }
  }
}

async function checkStripe(): Promise<HealthResult> {
  const service = 'stripe'
  const key = Deno.env.get('STRIPE_SECRET_KEY')?.trim()
  if (!key) {
    return { service, status: 'down', message: 'STRIPE_SECRET_KEY not set' }
  }
  try {
    const res = await fetch('https://api.stripe.com/v1/account', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: timeoutSignal(),
    })
    const text = await res.text()
    if (!res.ok) {
      return { service, status: 'down', message: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    let data: { charges_enabled?: boolean; payouts_enabled?: boolean }
    try {
      data = JSON.parse(text) as { charges_enabled?: boolean; payouts_enabled?: boolean }
    } catch {
      return { service, status: 'down', message: 'Invalid JSON from Stripe' }
    }
    const c = data.charges_enabled === true
    const p = data.payouts_enabled === true
    if (c && p) {
      return { service, status: 'operational', message: 'charges_enabled and payouts_enabled' }
    }
    if (!c && !p) {
      return { service, status: 'degraded', message: 'charges_enabled and payouts_enabled both false' }
    }
    return {
      service,
      status: 'degraded',
      message: `charges_enabled=${String(data.charges_enabled)}, payouts_enabled=${String(data.payouts_enabled)}`,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stripe request failed'
    return { service, status: 'down', message: msg }
  }
}

async function checkResend(): Promise<HealthResult> {
  const service = 'resend'
  const key = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!key) {
    return { service, status: 'down', message: 'RESEND_API_KEY not set' }
  }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: timeoutSignal(),
    })
    if (res.status >= 200 && res.status < 300) {
      return { service, status: 'operational', message: `HTTP ${res.status}` }
    }
    const t = await res.text()
    return { service, status: 'down', message: `HTTP ${res.status}: ${t.slice(0, 200)}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Resend request failed'
    return { service, status: 'down', message: msg }
  }
}

async function checkVercel(): Promise<HealthResult> {
  const service = 'vercel'
  try {
    const res = await fetch('https://quni.com.au', {
      method: 'GET',
      redirect: 'follow',
      signal: timeoutSignal(),
    })
    if (res.status >= 200 && res.status < 400) {
      return { service, status: 'operational', message: `HTTP ${res.status}` }
    }
    return { service, status: 'down', message: `HTTP ${res.status}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return { service, status: 'down', message: msg }
  }
}

export async function checkAllServices(_env: HealthCheckEnv = {}): Promise<HealthResult[]> {
  void _env
  return await Promise.all([
    checkTppDomains(),
    checkDocuseal(),
    checkStripe(),
    checkResend(),
    checkVercel(),
  ])
}
