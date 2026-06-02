import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  CONVERSATION_WITH_PROPERTY_SELECT,
  type ConversationThreadNavigationState,
  type ConversationWithProperty,
} from '../lib/messaging/conversationsApi'
import ConversationThread from '../components/messaging/ConversationThread'
import Seo from '../components/Seo'
import UserDashboardShell from '../components/dashboard/UserDashboardShell'
import { userDashboardBreadcrumbs } from '../lib/userDashboardNav'

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
  const navigate = useNavigate()
  const { user, role } = useAuthContext()
  const initialPreload =
    conversationId != null ? preloadedForRoute(location.state, conversationId) : null
  const [conversation, setConversation] = useState<ConversationWithProperty | null>(initialPreload)
  const [loading, setLoading] = useState(initialPreload == null)
  const [error, setError] = useState<string | null>(null)

  const dashboardRole = role === 'landlord' ? 'landlord' : 'student'

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

  if (loading) {
    return (
      <UserDashboardShell
        role={dashboardRole}
        breadcrumbs={userDashboardBreadcrumbs(dashboardRole, { label: 'Messages', to: '/messages' }, { label: '…' })}
        showSectionNav
        activeSection="messages"
        onSectionSelect={(section) => {
          if (dashboardRole === 'landlord') {
            navigate(section === 'bookings' ? '/landlord/dashboard?tab=bookings' : '/landlord/dashboard')
            return
          }
          navigate(`/student-dashboard?tab=${section}`)
        }}
      >
        <p className="text-sm text-gray-500">Loading conversation…</p>
      </UserDashboardShell>
    )
  }

  if (error || !conversation) {
    return (
      <UserDashboardShell
        role={dashboardRole}
        breadcrumbs={userDashboardBreadcrumbs(dashboardRole, { label: 'Messages', to: '/messages' }, { label: 'Not found' })}
        showSectionNav
        activeSection="messages"
        onSectionSelect={(section) => {
          if (dashboardRole === 'landlord') {
            navigate(section === 'bookings' ? '/landlord/dashboard?tab=bookings' : '/landlord/dashboard')
            return
          }
          navigate(`/student-dashboard?tab=${section}`)
        }}
      >
        <p className="text-sm text-red-700">{error ?? 'Conversation not found'}</p>
        <Link to="/messages" className="mt-4 inline-block text-sm font-medium text-[#FF6F61] hover:underline">
          Back to messages
        </Link>
      </UserDashboardShell>
    )
  }

  const viewerRole = conversation.tenant_user_id === user.id ? 'tenant' : 'landlord'
  const threadLabel = conversation.property?.title?.trim() || 'Conversation'

  return (
    <UserDashboardShell
      role={dashboardRole}
      breadcrumbs={userDashboardBreadcrumbs(
        dashboardRole,
        { label: 'Messages', to: '/messages' },
        { label: threadLabel },
      )}
      showSectionNav
      activeSection="messages"
      onSectionSelect={(section) => {
        if (dashboardRole === 'landlord') {
          navigate(section === 'bookings' ? '/landlord/dashboard?tab=bookings' : '/landlord/dashboard')
          return
        }
        navigate(`/student-dashboard?tab=${section}`)
      }}
      contentClassName="py-4 md:py-6"
    >
      <Seo title="Conversation" canonicalPath={`/messages/${conversation.id}`} />
      <ConversationThread
        conversation={conversation}
        currentUserId={user.id}
        viewerRole={viewerRole}
      />
    </UserDashboardShell>
  )
}
