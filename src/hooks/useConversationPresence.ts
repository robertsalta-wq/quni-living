import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function counterpartyIsPresent(
  presenceState: Record<string, unknown[]>,
  counterpartyUserId: string,
): boolean {
  const entries = presenceState[counterpartyUserId]
  return Array.isArray(entries) && entries.length > 0
}

/** Tracks whether the other participant is on the conversation presence channel. */
export function useConversationPresence(
  conversationId: string | undefined,
  currentUserId: string | undefined,
  counterpartyUserId: string | undefined,
): boolean {
  const [counterpartyOnline, setCounterpartyOnline] = useState(false)

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setCounterpartyOnline(false)
      return
    }

    let cancelled = false

    const sync = (channel: ReturnType<typeof supabase.channel>) => {
      if (cancelled || !counterpartyUserId) {
        if (!cancelled) setCounterpartyOnline(false)
        return
      }
      try {
        const state = channel.presenceState() as Record<string, unknown[]>
        setCounterpartyOnline(counterpartyIsPresent(state, counterpartyUserId))
      } catch {
        setCounterpartyOnline(false)
      }
    }

    const channel = supabase.channel(`presence:conversation:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => sync(channel))
      .on('presence', { event: 'join' }, () => sync(channel))
      .on('presence', { event: 'leave' }, () => sync(channel))
      .subscribe(async (status) => {
        if (cancelled || status !== 'SUBSCRIBED') return
        try {
          await channel.track({ online_at: Date.now() })
        } catch {
          /* presence unavailable — degrade to no indicator */
        }
      })

    return () => {
      cancelled = true
      setCounterpartyOnline(false)
      void supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, counterpartyUserId])

  return counterpartyOnline
}
