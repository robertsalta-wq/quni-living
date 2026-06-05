import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import { sendEmail } from '../sendEmail.js'
import { firstNameFromFullName } from './auth.js'
import { conversationThreadUrl } from './siteUrl.js'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type NewMessageNotifyInput = {
  propertyTitle: string
  senderFirstName: string
  conversationId: string
}

/** HTML for peer message notification - no message body or contact details. */
export function buildNewMessageNotificationHtml(input: NewMessageNotifyInput): string {
  const title = escapeHtml(input.propertyTitle)
  const name = escapeHtml(input.senderFirstName)
  const url = escapeHtml(conversationThreadUrl(input.conversationId))

  return `<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
  <p>You have a new message about <strong>${title}</strong> from ${name}.</p>
  <p style="margin: 1.5rem 0;">
    <a href="${url}" style="background-color: #FF6F61; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Open conversation</a>
  </p>
  <p style="font-size: 0.875rem; color: #6b7280;">Reply in Quni - we do not include message content in email for your privacy.</p>
</div>`
}

export function buildNewMessageNotificationSubject(propertyTitle: string): string {
  const t = propertyTitle.trim() || 'your listing'
  return `New message about ${t}`
}

export type SendConversationNotifyArgs = {
  admin: SupabaseClient<Database>
  conversationId: string
  messageId: string
}

export async function sendConversationMessageNotification(
  args: SendConversationNotifyArgs,
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const { data: message, error: msgErr } = await args.admin
    .from('conversation_messages')
    .select('id, conversation_id, sender_user_id, kind')
    .eq('id', args.messageId)
    .maybeSingle()

  if (msgErr || !message) {
    return { ok: false, error: msgErr?.message ?? 'Message not found' }
  }
  if (message.kind !== 'user') {
    return { ok: false, error: 'Notifications are only sent for user messages' }
  }

  const { data: conv, error: convErr } = await args.admin
    .from('conversations')
    .select('id, landlord_user_id, tenant_user_id, property_id')
    .eq('id', args.conversationId)
    .maybeSingle()

  if (convErr || !conv) {
    return { ok: false, error: convErr?.message ?? 'Conversation not found' }
  }

  const { data: property } = await args.admin
    .from('properties')
    .select('title')
    .eq('id', conv.property_id)
    .maybeSingle()

  const propertyTitle = property?.title?.trim() || 'Listing'

  const recipientUserId =
    message.sender_user_id === conv.landlord_user_id
      ? conv.tenant_user_id
      : conv.landlord_user_id

  const { data: recipientProfile } = await args.admin
    .from(
      recipientUserId === conv.tenant_user_id ? 'student_profiles' : 'landlord_profiles',
    )
    .select('email, full_name')
    .eq('user_id', recipientUserId)
    .maybeSingle()

  const to = (recipientProfile?.email ?? '').trim()
  if (!to) {
    return { ok: false, error: 'Recipient email not found' }
  }

  let senderFirstName = 'Someone'
  if (message.sender_user_id) {
    const senderIsLandlord = message.sender_user_id === conv.landlord_user_id
    const { data: senderProfile } = await args.admin
      .from(senderIsLandlord ? 'landlord_profiles' : 'student_profiles')
      .select('full_name')
      .eq('user_id', message.sender_user_id)
      .maybeSingle()
    senderFirstName = firstNameFromFullName(senderProfile?.full_name)
  }

  const html = buildNewMessageNotificationHtml({
    propertyTitle,
    senderFirstName,
    conversationId: conv.id,
  })

  await sendEmail({
    to,
    subject: buildNewMessageNotificationSubject(propertyTitle),
    html,
  })

  return { ok: true, to }
}
