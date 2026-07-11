import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ConversationRow } from '../lib/messaging/conversationTypes'

export type ConversationLiveFields = Pick<
  ConversationRow,
  'landlord_last_read_at' | 'tenant_last_read_at' | 'contact_unlocked_at'
>

/** Live conversation row updates (read timestamps, unlock state). */
export function useConversationRowRealtime(
  conversationId: string | undefined,
  onUpdate: (fields: ConversationLiveFields) => void,
) {
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation-row:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ConversationRow
          if (!row?.id) return
          onUpdate({
            landlord_last_read_at: row.landlord_last_read_at,
            tenant_last_read_at: row.tenant_last_read_at,
            contact_unlocked_at: row.contact_unlocked_at,
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, onUpdate])
}
