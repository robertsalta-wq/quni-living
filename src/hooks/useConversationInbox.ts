import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ConversationRow } from '../lib/messaging/conversationTypes'
import {
  LANDLORD_DISPLAY_NAME_SELECT,
  STUDENT_DISPLAY_NAME_SELECT,
  resolveCounterpartyDisplayName,
} from '../lib/messaging/conversationDisplayNames'
import type { NameProfile } from '../lib/nameResolution'

export type InboxProperty = {
  id: string
  title: string
  suburb: string | null
  rent_per_week: number | null
  slug: string | null
  images: string[] | null
}

type InboxStudentProfile = NameProfile & { user_id?: string }
type InboxLandlordProfile = NameProfile

type InboxConversationRow = ConversationRow & {
  property: InboxProperty | null
  landlord_profile: InboxLandlordProfile | null
  tenant_profile: InboxStudentProfile | null
}

export type InboxConversation = ConversationRow & {
  property: InboxProperty | null
  unread: boolean
  counterpartyDisplayName: string
}

async function loadStudentProfilesByUserId(
  userIds: string[],
): Promise<Map<string, InboxStudentProfile>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (!unique.length) return new Map()

  const { data, error } = await supabase
    .from('student_profiles')
    .select(`${STUDENT_DISPLAY_NAME_SELECT}, user_id`)
    .in('user_id', unique)

  if (error) throw error
  const map = new Map<string, InboxStudentProfile>()
  for (const row of data ?? []) {
    const uid = typeof row.user_id === 'string' ? row.user_id : ''
    if (uid) map.set(uid, row as InboxStudentProfile)
  }
  return map
}

function studentProfileForConversation(
  row: InboxConversationRow,
  studentsByUserId: Map<string, InboxStudentProfile>,
): NameProfile | null {
  if (row.tenant_profile) return row.tenant_profile
  const uid = row.tenant_user_id
  return uid ? studentsByUserId.get(uid) ?? null : null
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
          ),
          landlord_profile:landlord_profiles!conversations_landlord_profile_id_fkey (
            ${LANDLORD_DISPLAY_NAME_SELECT}
          ),
          tenant_profile:student_profiles!conversations_tenant_profile_id_fkey (
            ${STUDENT_DISPLAY_NAME_SELECT}
          )
        `,
        )
        .or(`tenant_user_id.eq.${userId},landlord_user_id.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (qErr) throw qErr

      const rawRows = (data ?? []) as InboxConversationRow[]
      const missingTenantUserIds = rawRows
        .filter((row) => !row.tenant_profile && row.tenant_user_id)
        .map((row) => row.tenant_user_id)
      const studentsByUserId = await loadStudentProfilesByUserId(missingTenantUserIds)

      const rows: InboxConversation[] = rawRows.map((row) => {
        const isLandlord = row.landlord_user_id === userId
        const lastRead = isLandlord ? row.landlord_last_read_at : row.tenant_last_read_at
        const unread =
          Boolean(row.last_message_at) &&
          (!lastRead || new Date(row.last_message_at) > new Date(lastRead))
        const studentProfile = studentProfileForConversation(row, studentsByUserId)
        const counterpartyDisplayName = resolveCounterpartyDisplayName(
          userId,
          row,
          row.landlord_profile,
          studentProfile,
        )
        const { landlord_profile: _lp, tenant_profile: _tp, ...conversation } = row
        return { ...conversation, unread, counterpartyDisplayName }
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
