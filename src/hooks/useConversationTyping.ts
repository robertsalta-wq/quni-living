import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const TYPING_BROADCAST_INTERVAL_MS = 2000
const TYPING_IDLE_STOP_MS = 3000
const TYPING_DISPLAY_TIMEOUT_MS = 4000

type TypingPayload = { userId?: string }

/** Ephemeral typing signals via Realtime broadcast (no DB writes). */
export function useConversationTyping(
  conversationId: string | undefined,
  currentUserId: string | undefined,
) {
  const [counterpartyTyping, setCounterpartyTyping] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastBroadcastRef = useRef(0)
  const idleTimerRef = useRef<number | null>(null)
  const displayTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setCounterpartyTyping(false)
      return
    }

    const channel = supabase.channel(`typing:conversation:${conversationId}`)

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const userId = (payload as TypingPayload)?.userId
        if (!userId || userId === currentUserId) return
        setCounterpartyTyping(true)
        if (displayTimerRef.current != null) window.clearTimeout(displayTimerRef.current)
        displayTimerRef.current = window.setTimeout(
          () => setCounterpartyTyping(false),
          TYPING_DISPLAY_TIMEOUT_MS,
        )
      })
      .on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
        const userId = (payload as TypingPayload)?.userId
        if (!userId || userId === currentUserId) return
        setCounterpartyTyping(false)
        if (displayTimerRef.current != null) {
          window.clearTimeout(displayTimerRef.current)
          displayTimerRef.current = null
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channelRef.current = null
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current)
      if (displayTimerRef.current != null) window.clearTimeout(displayTimerRef.current)
      setCounterpartyTyping(false)
      void supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId])

  const notifyTyping = useCallback(() => {
    const channel = channelRef.current
    if (!channel || !currentUserId) return

    const now = Date.now()
    if (now - lastBroadcastRef.current >= TYPING_BROADCAST_INTERVAL_MS) {
      lastBroadcastRef.current = now
      void channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId },
      })
    }

    if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => {
      void channel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: { userId: currentUserId },
      })
    }, TYPING_IDLE_STOP_MS)
  }, [currentUserId])

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    const channel = channelRef.current
    if (!channel || !currentUserId) return
    void channel.send({
      type: 'broadcast',
      event: 'typing_stop',
      payload: { userId: currentUserId },
    })
  }, [currentUserId])

  const dismissCounterpartyTyping = useCallback(() => {
    setCounterpartyTyping(false)
    if (displayTimerRef.current != null) {
      window.clearTimeout(displayTimerRef.current)
      displayTimerRef.current = null
    }
  }, [])

  return {
    counterpartyTyping,
    notifyTyping,
    stopTyping,
    dismissCounterpartyTyping,
  }
}
