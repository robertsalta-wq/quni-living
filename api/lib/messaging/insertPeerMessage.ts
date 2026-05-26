import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import { contentDedupHash, normalizeForDedupHash } from '../../../src/lib/messaging/contentDedupHash.js'
import { displayMessageBody, previewMessageBody } from '../../../src/lib/messaging/displayMessageBody.js'
import { maskContactInfo } from '../../../src/lib/messaging/maskContactInfo.js'
import type { MaskType } from '../../../src/lib/messaging/conversationTypes.js'

const MAX_BODY_LEN = 10_000

export type ConversationRow = Database['public']['Tables']['conversations']['Row']

export type InsertPeerMessageInput = {
  admin: SupabaseClient<Database>
  conversation: ConversationRow
  senderUserId: string
  senderRole: 'tenant' | 'landlord'
  body: string
  maskingEnabled: boolean
}

export type InsertPeerMessageResult = {
  messageId: string
  displayBody: string
  createdAt: string
  maskEventCount: number
}

function validateBody(body: string): string | null {
  const t = body.trim()
  if (!t) return 'Message cannot be empty'
  if (t.length > MAX_BODY_LEN) return 'Message is too long'
  return null
}

async function insertMaskEvents(
  admin: SupabaseClient<Database>,
  conversationId: string,
  messageId: string,
  senderUserId: string,
  matches: ReturnType<typeof maskContactInfo>['matches'],
): Promise<number> {
  if (matches.length === 0) return 0

  const byType = new Map<MaskType, { count: number; sample: string }>()
  for (const m of matches) {
    const prev = byType.get(m.maskType)
    if (prev) {
      prev.count += 1
    } else {
      byType.set(m.maskType, { count: 1, sample: m.match })
    }
  }

  const rows = await Promise.all(
    [...byType.entries()].map(async ([maskType, { count, sample }]) => {
      const normalized = normalizeForDedupHash(sample, maskType)
      const hash = await contentDedupHash(normalized)
      return {
        conversation_id: conversationId,
        message_id: messageId,
        sender_user_id: senderUserId,
        mask_type: maskType,
        match_count: count,
        content_dedup_hash: hash,
      }
    }),
  )

  const { error } = await admin.from('message_contact_mask_events').insert(rows)
  if (error) throw error
  return rows.length
}

export async function insertPeerMessage(input: InsertPeerMessageInput): Promise<InsertPeerMessageResult> {
  const validation = validateBody(input.body)
  if (validation) {
    throw new PeerMessageValidationError(validation)
  }

  const body = input.body.trim()
  const contactUnlocked = input.conversation.contact_unlocked_at != null
  const displayOpts = {
    contactUnlocked,
    maskingEnabled: input.maskingEnabled,
  }

  const { data: inserted, error: insertErr } = await input.admin
    .from('conversation_messages')
    .insert({
      conversation_id: input.conversation.id,
      sender_user_id: input.senderUserId,
      sender_role: input.senderRole,
      kind: 'user',
      body,
      metadata: {},
    })
    .select('id, created_at')
    .single()

  if (insertErr || !inserted) {
    throw insertErr ?? new Error('Failed to insert message')
  }

  const { matches } = maskContactInfo(body)
  const maskEventCount = await insertMaskEvents(
    input.admin,
    input.conversation.id,
    inserted.id,
    input.senderUserId,
    matches,
  )

  const preview = previewMessageBody(body, displayOpts)
  const { error: convErr } = await input.admin
    .from('conversations')
    .update({
      last_message_at: inserted.created_at,
      last_message_preview: preview,
    })
    .eq('id', input.conversation.id)

  if (convErr) throw convErr

  return {
    messageId: inserted.id,
    displayBody: displayMessageBody(body, displayOpts),
    createdAt: inserted.created_at,
    maskEventCount,
  }
}

export class PeerMessageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PeerMessageValidationError'
  }
}

export async function fetchContactMaskingEnabled(admin: SupabaseClient<Database>): Promise<boolean> {
  const { data, error } = await admin
    .from('platform_config')
    .select('config_value')
    .eq('config_key', 'contact_masking_enabled')
    .maybeSingle()

  if (error) {
    console.warn('[messaging] contact_masking_enabled lookup failed', error.message)
    return true
  }
  const v = (data?.config_value ?? 'true').trim().toLowerCase()
  return v !== 'false'
}
