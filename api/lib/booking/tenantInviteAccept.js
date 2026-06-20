/**
 * Landlord tenant invite provenance on listing-tier booking commit.
 * Deferred: platform email send, service_tier_events telemetry (Phase 3 not built).
 */

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input).trim())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function assertRenterEmailConfirmed(user, json, origin) {
  if (user?.email_confirmed_at) return null
  return json(
    {
      error: 'email_not_confirmed',
      message:
        'Confirm your email before submitting a booking request. Check your inbox for the confirmation link.',
    },
    403,
    origin,
  )
}

export function readTenantInviteTokenFromBody(body) {
  const raw = body?.tenantInviteToken ?? body?.tenant_invite_token
  return typeof raw === 'string' ? raw.trim() : ''
}

/** @returns {Promise<string | null>} invite row id when token matches a pending invite for this property */
export async function resolvePendingTenantInviteForBooking(admin, rawToken, propertyId) {
  const row = await fetchPendingTenantInviteForBooking(admin, rawToken, propertyId)
  return row?.id ?? null
}

/** @returns {Promise<object | null>} pending invite row including offer fields */
export async function fetchPendingTenantInviteForBooking(admin, rawToken, propertyId) {
  const trimmed = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (!trimmed || !propertyId) return null

  const tokenHash = await sha256Hex(trimmed)
  const { data: invite, error } = await admin
    .from('tenant_invites')
    .select('id, property_id, status, expires_at, offered_weekly_rent, offer_reason, landlord_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !invite || invite.property_id !== propertyId || invite.status !== 'pending') {
    return null
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    await admin
      .from('tenant_invites')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invite.id)
    return null
  }

  return invite
}

export async function markTenantInviteAccepted(admin, inviteId, studentId, bookingId) {
  const { error } = await admin
    .from('tenant_invites')
    .update({
      status: 'accepted',
      accepted_by: studentId,
      accepted_booking_id: bookingId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .eq('status', 'pending')

  if (error) console.error('[tenant_invite] accept', error)
}
