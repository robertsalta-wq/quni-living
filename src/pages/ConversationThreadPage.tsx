import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { ConversationRow } from '../lib/messaging/conversationTypes'
import type { InboxProperty } from '../hooks/useConversationInbox'
import ConversationThread from '../components/messaging/ConversationThread'
import Seo from '../components/Seo'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

export default function ConversationThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [conversation, setConversation] = useState<
    (ConversationRow & { property: InboxProperty | null }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const uid = user?.id
    if (!conversationId || !uid) return
    const convId = conversationId
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
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
        .eq('id', convId)
        .maybeSingle()

      if (cancelled) return
      if (qErr || !data) {
        setError(qErr?.message ?? 'Conversation not found')
        setConversation(null)
      } else {
        const row = data as ConversationRow & { property: InboxProperty | null }
        if (row.landlord_user_id !== uid && row.tenant_user_id !== uid) {
          setError('You do not have access to this conversation')
          setConversation(null)
        } else {
          setConversation(row)
        }
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [conversationId, user?.id])

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className={`${SITE_CONTENT_MAX_CLASS} py-12 text-center text-sm text-gray-500`}>
        Loading conversation…
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className={`${SITE_CONTENT_MAX_CLASS} py-12 text-center px-6`}>
        <p className="text-sm text-red-700">{error ?? 'Conversation not found'}</p>
        <Link to="/messages" className="mt-4 inline-block text-sm font-medium text-[#FF6F61] hover:underline">
          Back to messages
        </Link>
      </div>
    )
  }

  const viewerRole = conversation.tenant_user_id === user.id ? 'tenant' : 'landlord'

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <Seo title="Conversation" canonicalPath={`/messages/${conversation.id}`} />
      <div className={`${SITE_CONTENT_MAX_CLASS} w-full flex-1 py-4 md:py-6`}>
        <div className="hidden md:block mb-3">
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← All messages
          </button>
        </div>
        <ConversationThread
          conversation={conversation}
          currentUserId={user.id}
          viewerRole={viewerRole}
        />
      </div>
    </div>
  )
}
