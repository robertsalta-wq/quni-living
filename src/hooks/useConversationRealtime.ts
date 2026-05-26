import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ConversationMessageRow } from '../lib/messaging/conversationTypes'

export function useConversationRealtime(
  conversationId: string | undefined,
  onInsert: (message: ConversationMessageRow) => void,
) {
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ConversationMessageRow
          if (row?.id) onInsert(row)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, onInsert])
}
