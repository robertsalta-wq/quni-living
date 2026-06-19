import { apiUrl } from './apiUrl'
import { supabase } from './supabase'

export type SendTenantInviteEmailArgs = {
  inviteId: string
  /** Full invite URL with raw token — required on first send after create. Omit to rotate and resend. */
  inviteUrl?: string
  toEmail?: string
}

export async function sendTenantInviteEmail(
  args: SendTenantInviteEmailArgs,
): Promise<{ ok: true; emailedTo: string; rotated?: boolean }> {
  const inviteId = args.inviteId.trim()
  if (!inviteId) throw new Error('Invite id is required')

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Session expired. Please sign in again.')

  const res = await fetch(apiUrl('/api/send-tenant-invite-email'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      inviteId,
      ...(args.inviteUrl?.trim() ? { inviteUrl: args.inviteUrl.trim() } : {}),
      ...(args.toEmail?.trim() ? { toEmail: args.toEmail.trim() } : {}),
    }),
  })

  const raw = await res.text()
  let j: { ok?: boolean; emailedTo?: string; rotated?: boolean; error?: string; message?: string }
  try {
    j = JSON.parse(raw) as typeof j
  } catch {
    throw new Error('Invalid response while sending invite email.')
  }

  if (!res.ok || !j.ok || !j.emailedTo) {
    throw new Error(j.message || j.error || 'Could not send invite email.')
  }

  return { ok: true, emailedTo: j.emailedTo, rotated: j.rotated }
}
