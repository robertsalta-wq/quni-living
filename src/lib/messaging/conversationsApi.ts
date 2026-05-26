import { apiUrl } from '../apiUrl'
import { supabase } from '../supabase'

async function bearerHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export type OpenConversationResult = {
  ok: boolean
  conversationId: string
  contactUnlocked: boolean
  maskingEnabled: boolean
  created: boolean
}

export async function openConversation(propertyId: string): Promise<OpenConversationResult> {
  const res = await fetch(apiUrl('/api/conversations/open'), {
    method: 'POST',
    headers: await bearerHeaders(),
    body: JSON.stringify({ propertyId }),
  })
  const data = (await res.json().catch(() => ({}))) as OpenConversationResult & { error?: string }
  if (!res.ok || !data.conversationId) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not open conversation')
  }
  return data
}

export type SendMessageResult = {
  ok: boolean
  messageId: string
  displayBody: string
  createdAt: string
  contactUnlocked: boolean
  maskingEnabled: boolean
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const res = await fetch(apiUrl('/api/conversations/message'), {
    method: 'POST',
    headers: await bearerHeaders(),
    body: JSON.stringify({ conversationId, body }),
  })
  const data = (await res.json().catch(() => ({}))) as SendMessageResult & { error?: string }
  if (!res.ok || !data.messageId) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not send message')
  }
  return data
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const res = await fetch(apiUrl('/api/conversations/read'), {
    method: 'POST',
    headers: await bearerHeaders(),
    body: JSON.stringify({ conversationId }),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !data.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not mark as read')
  }
}

export const PENDING_MESSAGE_PROPERTY_KEY = 'quni_message_property_id'
