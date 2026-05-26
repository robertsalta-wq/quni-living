import { apiUrl } from '../apiUrl'
import { supabase } from '../supabase'
import type { ConversationRow } from './conversationTypes'

export type ConversationInboxProperty = {
  id: string
  title: string
  suburb: string | null
  rent_per_week: number | null
  slug: string | null
  images: string[] | null
}

export const CONVERSATION_WITH_PROPERTY_SELECT = `
  *,
  property:properties (
    id,
    title,
    suburb,
    rent_per_week,
    slug,
    images
  )
`

export type ConversationWithProperty = ConversationRow & { property: ConversationInboxProperty | null }

export type ConversationThreadNavigationState = {
  preloadedConversation: ConversationWithProperty
}

export type OpenConversationResult = {
  ok: boolean
  conversationId: string
  contactUnlocked: boolean
  maskingEnabled: boolean
  created: boolean
  /** Present when opened via Supabase (skips thread page refetch). */
  conversation?: ConversationWithProperty
}

export type OpenConversationOptions = {
  accessToken?: string | null
  userId?: string
  /** Use direct Supabase get/create for tenants (faster than Vercel API). */
  preferClient?: boolean
  propertyStatus?: string | null
}

async function authHeaders(accessToken?: string | null): Promise<HeadersInit> {
  let token = accessToken?.trim() || null
  if (!token) {
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token ?? null
  }
  if (!token) throw new Error('Not signed in')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function mapOpenResult(
  row: ConversationWithProperty,
  created: boolean,
  maskingEnabled = true,
): OpenConversationResult {
  return {
    ok: true,
    conversationId: row.id,
    contactUnlocked: row.contact_unlocked_at != null,
    maskingEnabled,
    created,
    conversation: row,
  }
}

async function fetchConversationWithProperty(conversationId: string): Promise<ConversationWithProperty> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_WITH_PROPERTY_SELECT)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Conversation not found')
  return data as ConversationWithProperty
}

/** Tenant open/create via RLS — one round-trip to Supabase instead of Vercel + auth. */
async function openConversationViaSupabase(
  propertyId: string,
  userId: string,
  propertyStatus?: string | null,
): Promise<OpenConversationResult> {
  if (propertyStatus != null && propertyStatus !== 'active') {
    throw new Error('This listing is not available')
  }

  const { data: existing, error: existingErr } = await supabase
    .from('conversations')
    .select(CONVERSATION_WITH_PROPERTY_SELECT)
    .eq('property_id', propertyId)
    .eq('tenant_user_id', userId)
    .maybeSingle()

  if (existingErr) throw existingErr
  if (existing) {
    return mapOpenResult(existing as ConversationWithProperty, false)
  }

  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert({
      property_id: propertyId,
      tenant_user_id: userId,
    })
    .select(CONVERSATION_WITH_PROPERTY_SELECT)
    .single()

  if (!createErr && created) {
    return mapOpenResult(created as ConversationWithProperty, true)
  }

  if (createErr?.code === '23505') {
    const { data: race, error: raceErr } = await supabase
      .from('conversations')
      .select(CONVERSATION_WITH_PROPERTY_SELECT)
      .eq('property_id', propertyId)
      .eq('tenant_user_id', userId)
      .maybeSingle()
    if (raceErr) throw raceErr
    if (race) return mapOpenResult(race as ConversationWithProperty, false)
  }

  if (createErr) throw createErr
  throw new Error('Could not open conversation')
}

async function openConversationViaApi(
  propertyId: string,
  accessToken?: string | null,
): Promise<OpenConversationResult> {
  const res = await fetch(apiUrl('/api/conversations/open'), {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ propertyId }),
  })
  const data = (await res.json().catch(() => ({}))) as OpenConversationResult & { error?: string }
  if (!res.ok || !data.conversationId) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not open conversation')
  }
  return data
}

export async function openConversation(
  propertyId: string,
  options?: OpenConversationOptions,
): Promise<OpenConversationResult> {
  const userId = options?.userId?.trim()
  if (userId && options?.preferClient !== false) {
    try {
      return await openConversationViaSupabase(propertyId, userId, options?.propertyStatus)
    } catch (e) {
      console.warn('[openConversation] Supabase path failed, using API', e)
    }
  }

  const apiResult = await openConversationViaApi(propertyId, options?.accessToken)
  if (!apiResult.conversation) {
    try {
      apiResult.conversation = await fetchConversationWithProperty(apiResult.conversationId)
    } catch {
      /* thread page will load */
    }
  }
  return apiResult
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
  accessToken?: string | null,
): Promise<SendMessageResult> {
  const res = await fetch(apiUrl('/api/conversations/message'), {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ conversationId, body }),
  })
  const data = (await res.json().catch(() => ({}))) as SendMessageResult & { error?: string }
  if (!res.ok || !data.messageId) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not send message')
  }
  return data
}

export async function markConversationRead(
  conversationId: string,
  accessToken?: string | null,
): Promise<void> {
  const res = await fetch(apiUrl('/api/conversations/read'), {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify({ conversationId }),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !data.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not mark as read')
  }
}

export const PENDING_MESSAGE_PROPERTY_KEY = 'quni_message_property_id'
