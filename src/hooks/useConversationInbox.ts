import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ConversationRow } from '../lib/messaging/conversationTypes'

export type InboxProperty = {
  id: string
  title: string
  suburb: string | null
  rent_per_week: number | null
  slug: string | null
  images: string[] | null
}

export type InboxConversation = ConversationRow & {
  property: InboxProperty | null
  unread: boolean
}

export function useConversationInbox(userId: string | undefined) {
  const [items, setItems] = useState<InboxConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('conversations')
        .select(
          `
          *,
          property:properties (
            id,
            title,
            suburb,
            rent_per_week,
            slug,
            images
          )
        `,
        )
        .or(`tenant_user_id.eq.${userId},landlord_user_id.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (qErr) throw qErr

      const rows: InboxConversation[] = (data ?? []).map((row) => {
        const c = row as ConversationRow & { property: InboxProperty | null }
        const isLandlord = c.landlord_user_id === userId
        const lastRead = isLandlord ? c.landlord_last_read_at : c.tenant_last_read_at
        const unread =
          Boolean(c.last_message_at) &&
          (!lastRead || new Date(c.last_message_at) > new Date(lastRead))
        return { ...c, unread }
      })
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`inbox:${userId}`)
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

  return { items, loading, error, reload: load }
}
