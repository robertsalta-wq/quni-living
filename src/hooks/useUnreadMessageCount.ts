import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useUnreadMessageCount(userId: string | undefined): number {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }
    const { data, error } = await supabase
      .from('conversations')
      .select('id, landlord_user_id, tenant_user_id, last_message_at, landlord_last_read_at, tenant_last_read_at')
      .or(`tenant_user_id.eq.${userId},landlord_user_id.eq.${userId}`)

    if (error) {
      setCount(0)
      return
    }

    const n = (data ?? []).filter((c) => {
      const isLandlord = c.landlord_user_id === userId
      const lastRead = isLandlord ? c.landlord_last_read_at : c.tenant_last_read_at
      return (
        Boolean(c.last_message_at) &&
        (!lastRead || new Date(c.last_message_at) > new Date(lastRead))
      )
    }).length
    setCount(n)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`unread:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          void load()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, load])

  return count
}
