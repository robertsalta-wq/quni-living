/**
 * Send landlord tenant invite email via Resend.
 * POST JSON: { inviteId, inviteUrl?, toEmail? }
 * - inviteUrl: required on first send when client just created the invite (verifies token hash).
 * - Omit inviteUrl to rotate token server-side and email a fresh link (resend).
 * Authorization: Bearer <landlord Supabase access_token>
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendEmail.js'
import { tenantInviteProspectEmail, propertyAddressLine } from './lib/emailTemplates.js'
import { siteBaseUrl } from './lib/booking/listingTransactionalEmails.js'

export const config = { runtime: 'edge' }

function json(body, status = 200, origin) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input).trim())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateRawToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function parseInviteTokenFromUrl(inviteUrl) {
  try {
    const u = new URL(inviteUrl.trim())
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('invite')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1].trim()
    if (parts[0] === 'invite' && parts[1]) return parts[1].trim()
  } catch {
    /* ignore */
  }
  return ''
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : ''
  const inviteUrlRaw = typeof body.inviteUrl === 'string' ? body.inviteUrl.trim() : ''
  const toEmailOverride = typeof body.toEmail === 'string' ? body.toEmail.trim().toLowerCase() : ''

  if (!inviteId) {
    return json({ error: 'inviteId is required' }, 400, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  if (user.user_metadata?.role !== 'landlord') {
    return json({ error: 'Only landlord accounts can send tenant invites' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: landlord, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('id, full_name, first_name, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (lpErr || !landlord) {
    return json({ error: 'Landlord profile not found' }, 404, origin)
  }

  const { data: invite, error: invErr } = await admin
    .from('tenant_invites')
    .select('id, property_id, landlord_id, invited_email, invited_name, token_hash, status, expires_at')
    .eq('id', inviteId)
    .maybeSingle()

  if (invErr || !invite) {
    return json({ error: 'Invite not found' }, 404, origin)
  }

  if (invite.landlord_id !== landlord.id) {
    return json({ error: 'Forbidden' }, 403, origin)
  }

  if (invite.status !== 'pending') {
    return json({ error: 'invite_not_pending', message: 'This invite is no longer active.' }, 409, origin)
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return json({ error: 'invite_expired', message: 'This invite has expired.' }, 409, origin)
  }

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select('id, title, suburb, state, postcode, address, open_to_non_students, status, service_tier')
    .eq('id', invite.property_id)
    .maybeSingle()

  if (propErr || !property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  if (property.status !== 'active' || property.service_tier !== 'listing') {
    return json({ error: 'Listing is not available for invites' }, 409, origin)
  }

  const recipient =
    toEmailOverride || (typeof invite.invited_email === 'string' ? invite.invited_email.trim().toLowerCase() : '')
  if (!recipient || !isValidEmail(recipient)) {
    return json({ error: 'A valid tenant email is required' }, 400, origin)
  }

  let inviteUrl = inviteUrlRaw
  let rotated = false

  if (inviteUrl) {
    const rawToken = parseInviteTokenFromUrl(inviteUrl)
    if (!rawToken || rawToken.length < 16) {
      return json({ error: 'Invalid inviteUrl' }, 400, origin)
    }
    const hash = await sha256Hex(rawToken)
    if (hash !== invite.token_hash) {
      return json({ error: 'Invite link does not match this invite' }, 403, origin)
    }
  } else {
    const rawToken = generateRawToken()
    const hash = await sha256Hex(rawToken)
    const { error: upErr } = await admin
      .from('tenant_invites')
      .update({ token_hash: hash, updated_at: new Date().toISOString() })
      .eq('id', invite.id)
      .eq('status', 'pending')
    if (upErr) {
      return json({ error: 'Could not refresh invite link' }, 500, origin)
    }
    inviteUrl = `${siteBaseUrl()}/invite/${rawToken}`
    rotated = true
  }

  if (toEmailOverride && toEmailOverride !== (invite.invited_email || '').trim().toLowerCase()) {
    await admin
      .from('tenant_invites')
      .update({ invited_email: recipient, updated_at: new Date().toISOString() })
      .eq('id', invite.id)
  }

  const landlordDisplay =
    landlord.full_name?.trim() ||
    landlord.first_name?.trim() ||
    landlord.email?.split('@')[0] ||
    'Your landlord'

  const tpl = tenantInviteProspectEmail({
    invitee_name: invite.invited_name || '',
    landlord_name: landlordDisplay,
    property_title: property.title || 'Room listing',
    property_address: propertyAddressLine(property),
    invite_url: inviteUrl,
    student_only: property.open_to_non_students === false,
  })

  try {
    await sendEmail({
      to: recipient,
      subject: tpl.subject,
      html: tpl.html,
      replyTo: landlord.email?.trim() || undefined,
    })
  } catch (e) {
    console.error('send-tenant-invite-email', e)
    return json(
      { error: e instanceof Error ? e.message : 'Failed to send email' },
      500,
      origin,
    )
  }

  const emailSentAt = new Date().toISOString()
  const { error: markErr } = await admin
    .from('tenant_invites')
    .update({ email_sent_at: emailSentAt, updated_at: emailSentAt })
    .eq('id', invite.id)
  if (markErr) {
    console.error('tenant_invites email_sent_at update', markErr)
  }

  return json({ ok: true, emailedTo: recipient, rotated, emailSentAt }, 200, origin)
}
