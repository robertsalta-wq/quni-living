import { supabase } from './supabase'
import { apiUrl } from './apiUrl'

export type ResetLandlordStripeConnectResult =
  | { ok: true; alreadyClear?: boolean; stripeDeleteWarning?: string | null }
  | { ok: false; error: string }

/**
 * Clear in-progress Stripe Connect and allow a fresh onboarding (wrong business type, etc.).
 */
export async function resetLandlordStripeConnect(): Promise<ResetLandlordStripeConnectResult> {
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) {
    return { ok: false, error: sessErr.message || 'Could not read your session.' }
  }
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return { ok: false, error: 'You need to be signed in.' }
  }

  const res = await fetch(apiUrl('/api/reset-stripe-connect'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const raw = await res.text()
  let body: { ok?: boolean; error?: string; alreadyClear?: boolean; stripeDeleteWarning?: string | null } = {}
  try {
    body = raw ? (JSON.parse(raw) as typeof body) : {}
  } catch {
    body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
  }

  if (!res.ok) {
    return { ok: false, error: body.error || `Request failed (${res.status})` }
  }

  return {
    ok: true,
    alreadyClear: body.alreadyClear,
    stripeDeleteWarning: body.stripeDeleteWarning ?? null,
  }
}
