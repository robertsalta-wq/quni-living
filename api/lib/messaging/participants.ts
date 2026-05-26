import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import type { ConversationRow } from './insertPeerMessage.js'

export function isConversationParticipant(conv: ConversationRow, userId: string): boolean {
  return conv.landlord_user_id === userId || conv.tenant_user_id === userId
}

export function participantRole(
  conv: ConversationRow,
  userId: string,
): 'tenant' | 'landlord' | null {
  if (conv.tenant_user_id === userId) return 'tenant'
  if (conv.landlord_user_id === userId) return 'landlord'
  return null
}

export async function loadConversationForUser(
  admin: SupabaseClient<Database>,
  conversationId: string,
  user: User,
): Promise<{ ok: true; conversation: ConversationRow } | { ok: false; status: number; error: string }> {
  const { data, error } = await admin
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    return { ok: false, status: 500, error: error.message }
  }
  if (!data) {
    return { ok: false, status: 404, error: 'Conversation not found' }
  }
  if (!isConversationParticipant(data, user.id)) {
    return { ok: false, status: 403, error: 'Not a participant in this conversation' }
  }
  return { ok: true, conversation: data }
}
