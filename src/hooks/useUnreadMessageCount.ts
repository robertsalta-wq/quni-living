import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const REALTIME_DEBOUNCE_MS = 400

/** Unread conversation count for header badge (RPC when available, else lightweight fallback). */
export function useUnreadMessageCount(userId: string | undefined): number {
  const [count, setCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }

    type RpcClient = {
      rpc(
        fn: 'count_unread_conversations_for_user',
        args: { p_user_id: string },
      ): Promise<{ data: number | null; error: { message: string } | null }>
    }

    const { data, error } = await (supabase as unknown as RpcClient).rpc(
      'count_unread_conversations_for_user',
      { p_user_id: userId },
    )

    if (!error && typeof data === 'number') {
      setCount(Math.max(0, data))
      return
    }

    // Fallback when migration not applied yet (e.g. local dev).
    const { data: rows, error: qErr } = await supabase
      .from('conversations')
      .select('landlord_user_id, tenant_user_id, last_message_at, landlord_last_read_at, tenant_last_read_at')
      .or(`tenant_user_id.eq.${userId},landlord_user_id.eq.${userId}`)

    if (qErr) {
      setCount(0)
      return
    }

    const n = (rows ?? []).filter((c) => {
      const isLandlord = c.landlord_user_id === userId
      const lastRead = isLandlord ? c.landlord_last_read_at : c.tenant_last_read_at
      return Boolean(c.last_message_at) && (!lastRead || new Date(c.last_message_at) > new Date(lastRead))
    }).length
    setCount(n)
  }, [userId])

  const scheduleLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void load()
    }, REALTIME_DEBOUNCE_MS)
  }, [load])

  useEffect(() => {
    void load()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [load])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`unread:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          scheduleLoad()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, scheduleLoad])

  return count
}
