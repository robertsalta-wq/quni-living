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
import { useConversationInbox } from '../hooks/useConversationInbox'
import MessagesInbox from '../components/messaging/MessagesInbox'
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

function MessagesPanes({
  conversationId,
  inboxItems,
  inboxLoading,
  inboxError,
  onInboxRetry,
  viewerRole,
  conversation,
  threadLoading,
  threadError,
  currentUserId,
}: {
  conversationId: string | undefined
  inboxItems: ReturnType<typeof useConversationInbox>['items']
  inboxLoading: boolean
  inboxError: string | null
  onInboxRetry: () => void
  viewerRole: 'tenant' | 'landlord'
  conversation: ConversationWithProperty | null
  threadLoading: boolean
  threadError: string | null
  currentUserId: string
}) {
  const showListOnMobile = !conversationId
  const showThreadOnMobile = Boolean(conversationId)

  return (
    <div className="quni-dashboard-panel flex flex-col md:min-h-[min(70vh,calc(100dvh-12rem))] md:flex-row">
      <aside
        className={`md:w-80 md:shrink-0 md:border-r md:border-gray-100 min-h-0 ${
          showListOnMobile ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        }`}
      >
        <MessagesInbox
          items={inboxItems}
          loading={inboxLoading}
          error={inboxError}
          onRetry={onInboxRetry}
          viewerRole={viewerRole}
        />
      </aside>

      <main
        className={`flex-1 min-w-0 min-h-0 flex flex-col ${
          showThreadOnMobile ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!conversationId ? (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
            Select a conversation to view messages
          </div>
        ) : threadLoading ? (
          <p className="text-sm text-gray-500 p-6">Loading conversation…</p>
        ) : threadError || !conversation ? (
          <div className="p-6">
            <p className="text-sm text-red-700">{threadError ?? 'Conversation not found'}</p>
            <Link to="/messages" className="mt-4 inline-block text-sm font-medium text-[#FF6F61] hover:underline">
              Back to messages
            </Link>
          </div>
        ) : (
          <ConversationThread
            conversation={conversation}
            currentUserId={currentUserId}
            viewerRole={conversation.tenant_user_id === currentUserId ? 'tenant' : 'landlord'}
          />
        )}
      </main>
    </div>
  )
}

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const location = useLocation()
  const { user, role, profile } = useAuthContext()
  const { items, loading: inboxLoading, error: inboxError, reload } = useConversationInbox(user?.id)

  const viewerRole = role === 'landlord' ? 'landlord' : 'tenant'
  const landlordProfile = role === 'landlord' && profile ? (profile as LandlordProfileRow) : null

  const initialPreload =
    conversationId != null ? preloadedForRoute(location.state, conversationId) : null
  const [conversation, setConversation] = useState<ConversationWithProperty | null>(initialPreload)
  const [threadLoading, setThreadLoading] = useState(
    conversationId != null && initialPreload == null,
  )
  const [threadError, setThreadError] = useState<string | null>(null)

  useEffect(() => {
    const uid = user?.id
    if (!conversationId || !uid) {
      setConversation(null)
      setThreadLoading(false)
      setThreadError(null)
      return
    }

    const convId = conversationId
    const cached = preloadedForRoute(location.state, convId)
    if (cached) {
      setConversation(cached)
      setThreadLoading(false)
      setThreadError(null)
      return
    }

    let cancelled = false

    async function load() {
      setThreadLoading(true)
      setThreadError(null)
      const { data, error: qErr } = await supabase
        .from('conversations')
        .select(CONVERSATION_WITH_PROPERTY_SELECT)
        .eq('id', convId)
        .maybeSingle()

      if (cancelled) return
      if (qErr || !data) {
        setThreadError(qErr?.message ?? 'Conversation not found')
        setConversation(null)
      } else {
        const row = data as ConversationWithProperty
        if (row.landlord_user_id !== uid && row.tenant_user_id !== uid) {
          setThreadError('You do not have access to this conversation')
          setConversation(null)
        } else {
          setConversation(row)
        }
      }
      setThreadLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [conversationId, user?.id, location.state])

  if (!user) {
    return null
  }

  const seoPath = conversationId ? `/messages/${conversationId}` : '/messages'
  const seoTitle = conversationId ? 'Conversation' : 'Messages'

  const panes = (
    <MessagesPanes
      conversationId={conversationId}
      inboxItems={items}
      inboxLoading={inboxLoading}
      inboxError={inboxError}
      onInboxRetry={reload}
      viewerRole={viewerRole}
      conversation={conversation}
      threadLoading={threadLoading}
      threadError={threadError}
      currentUserId={user.id}
    />
  )

  if (landlordProfile) {
    return (
      <LandlordMessagesTabShell profile={landlordProfile}>
        <Seo title={seoTitle} canonicalPath={seoPath} />
        {panes}
      </LandlordMessagesTabShell>
    )
  }

  return (
    <RenterDashboardTabShell activeTab="messages">
      <Seo title={seoTitle} canonicalPath={seoPath} />
      {panes}
    </RenterDashboardTabShell>
  )
}
