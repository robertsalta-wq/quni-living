import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import type { LandlordProfileRow } from '../lib/authProfile'
import { supabase } from '../lib/supabase'
import {
  CONVERSATION_WITH_PROPERTY_SELECT,
  type ConversationThreadNavigationState,
  type ConversationWithProperty,
} from '../lib/messaging/conversationsApi'
import ConversationThread from '../components/messaging/ConversationThread'
import Seo from '../components/Seo'
import { LandlordMessagesTabShell } from '../components/landlord/LandlordDashboardPageHeader'
import { RenterDashboardTabShell } from '../components/student/RenterDashboardPageHeader'

function preloadedForRoute(
  state: unknown,
  conversationId: string,
): ConversationWithProperty | null {
  const s = state as ConversationThreadNavigationState | null
  if (s?.preloadedConversation?.id === conversationId) {
    return s.preloadedConversation
  }
  return null
}

export default function ConversationThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const location = useLocation()
  const { user, role, profile } = useAuthContext()
  const initialPreload =
    conversationId != null ? preloadedForRoute(location.state, conversationId) : null
  const [conversation, setConversation] = useState<ConversationWithProperty | null>(initialPreload)
  const [loading, setLoading] = useState(initialPreload == null)
  const [error, setError] = useState<string | null>(null)

  const landlordProfile = role === 'landlord' && profile ? (profile as LandlordProfileRow) : null

  useEffect(() => {
    const uid = user?.id
    if (!conversationId || !uid) return
    const convId = conversationId
    const cached = preloadedForRoute(location.state, convId)
    if (cached) {
      setConversation(cached)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: qErr } = await supabase
        .from('conversations')
        .select(CONVERSATION_WITH_PROPERTY_SELECT)
        .eq('id', convId)
        .maybeSingle()

      if (cancelled) return
      if (qErr || !data) {
        setError(qErr?.message ?? 'Conversation not found')
        setConversation(null)
      } else {
        const row = data as ConversationWithProperty
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
  }, [conversationId, user?.id, location.state])

  if (!user) {
    return null
  }

  if (landlordProfile) {
    if (loading) {
      return (
        <LandlordMessagesTabShell profile={landlordProfile} contentClassName="py-4 md:py-6">
          <p className="text-sm text-gray-500">Loading conversation…</p>
        </LandlordMessagesTabShell>
      )
    }

    if (error || !conversation) {
      return (
        <LandlordMessagesTabShell profile={landlordProfile} contentClassName="py-4 md:py-6">
          <p className="text-sm text-red-700">{error ?? 'Conversation not found'}</p>
          <Link to="/messages" className="mt-4 inline-block text-sm font-medium text-[#FF6F61] hover:underline">
            Back to messages
          </Link>
        </LandlordMessagesTabShell>
      )
    }

    const viewerRole = conversation.tenant_user_id === user.id ? 'tenant' : 'landlord'

    return (
      <LandlordMessagesTabShell profile={landlordProfile} contentClassName="py-4 md:py-6">
        <Seo title="Conversation" canonicalPath={`/messages/${conversation.id}`} />
        <ConversationThread
          conversation={conversation}
          currentUserId={user.id}
          viewerRole={viewerRole}
        />
      </LandlordMessagesTabShell>
    )
  }

  if (loading) {
    return (
      <RenterDashboardTabShell activeTab="messages" contentClassName="py-4 md:py-6">
        <p className="text-sm text-gray-500">Loading conversation…</p>
      </RenterDashboardTabShell>
    )
  }

  if (error || !conversation) {
    return (
      <RenterDashboardTabShell activeTab="messages" contentClassName="py-4 md:py-6">
        <p className="text-sm text-red-700">{error ?? 'Conversation not found'}</p>
        <Link to="/messages" className="mt-4 inline-block text-sm font-medium text-[#FF6F61] hover:underline">
          Back to messages
        </Link>
      </RenterDashboardTabShell>
    )
  }

  const viewerRole = conversation.tenant_user_id === user.id ? 'tenant' : 'landlord'

  return (
    <RenterDashboardTabShell activeTab="messages" contentClassName="py-4 md:py-6">
      <Seo title="Conversation" canonicalPath={`/messages/${conversation.id}`} />
      <ConversationThread
        conversation={conversation}
        currentUserId={user.id}
        viewerRole={viewerRole}
      />
    </RenterDashboardTabShell>
  )
}
