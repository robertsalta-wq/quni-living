import { supabase, isSupabaseConfigured } from './supabase'
import { getQuniTenantInviteToken } from './quniTenantInvite'
import { isSafeInternalPath } from './postAuthRedirect'

export type TenantInviteFunnelEvent = 'signup_started' | 'booking_started' | 'booking_submitted'

/** Extract invite token from `/booking/:id?invite=…` redirect paths. */
export function inviteTokenFromBookingRedirect(redirect: string | null | undefined): string | null {
  if (!redirect || !isSafeInternalPath(redirect)) return null
  try {
    const q = redirect.includes('?') ? redirect.slice(redirect.indexOf('?')) : ''
    const token = new URLSearchParams(q).get('invite')?.trim()
    return token && token.length >= 16 ? token : null
  } catch {
    return null
  }
}

/** Best-effort invite token for signup / booking funnel events. */
export function resolveTenantInviteTokenForFunnel(redirect?: string | null): string | null {
  return getQuniTenantInviteToken() || inviteTokenFromBookingRedirect(redirect) || null
}

/** Fire-and-forget funnel telemetry — failures are logged only. */
export function recordTenantInviteFunnelEvent(
  token: string | null | undefined,
  event: TenantInviteFunnelEvent,
): void {
  const t = token?.trim()
  if (!t || t.length < 16 || !isSupabaseConfigured) return
  void supabase.rpc('record_tenant_invite_funnel_event', { p_token: t, p_event: event }).then(({ error }) => {
    if (error) console.warn('[tenant_invite_funnel]', event, error.message)
  })
}

export type TenantInviteFunnelTimestamps = {
  first_opened_at: string | null
  signup_started_at: string | null
  booking_started_at: string | null
  booking_submitted_at: string | null
}

/** Short landlord-facing funnel summary for pending invites. */
export function tenantInviteFunnelSummary(inv: TenantInviteFunnelTimestamps): string {
  const steps: string[] = []
  if (inv.first_opened_at) steps.push('Opened')
  if (inv.signup_started_at) steps.push('Signed up')
  if (inv.booking_started_at) steps.push('Started booking')
  if (inv.booking_submitted_at) steps.push('Submitted request')
  if (steps.length === 0) return 'Not opened yet'
  return steps.join(' · ')
}

/** Format funnel timestamp for landlord invite modal (date + short time). */
export function formatTenantInviteFunnelAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}
