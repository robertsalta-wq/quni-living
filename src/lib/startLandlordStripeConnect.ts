import { supabase } from './supabase'
import { apiUrl } from './apiUrl'
import { openStripeHostedUrl } from './stripeConnectOpen'

export type StartLandlordStripeConnectResult =
  | { ok: true; alreadyConnected: true }
  | { ok: true; alreadyConnected: false }
  | { ok: false; error: string }

/**
 * Create a Stripe Connect Account Link and open Stripe hosted onboarding (or account update).
 */
export async function startLandlordStripeConnect(
  returnContext: 'landlord_dashboard' | 'landlord_onboarding' | 'landlord_profile' = 'landlord_dashboard',
): Promise<StartLandlordStripeConnectResult> {
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) {
    return { ok: false, error: sessErr.message || 'Could not read your session.' }
  }
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return { ok: false, error: 'You need to be signed in.' }
  }

  const res = await fetch(apiUrl('/api/create-connect-account-link'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ returnContext }),
  })

  const raw = await res.text()
  let body: { url?: string; error?: string; alreadyConnected?: boolean } = {}
  try {
    body = raw ? (JSON.parse(raw) as typeof body) : {}
  } catch {
    body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
  }

  if (!res.ok) {
    return { ok: false, error: body.error || `Request failed (${res.status})` }
  }
  if (body.alreadyConnected) {
    return { ok: true, alreadyConnected: true }
  }
  if (!body.url?.trim()) {
    return { ok: false, error: 'No onboarding URL returned.' }
  }

  openStripeHostedUrl(body.url)
  return { ok: true, alreadyConnected: false }
}
