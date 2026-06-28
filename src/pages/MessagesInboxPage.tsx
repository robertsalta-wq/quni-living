import { useAuthContext } from '../context/AuthContext'
import type { LandlordProfileRow } from '../lib/authProfile'
import { useConversationInbox } from '../hooks/useConversationInbox'
import MessagesInbox from '../components/messaging/MessagesInbox'
import Seo from '../components/Seo'
import { LandlordMessagesTabShell } from '../components/landlord/LandlordDashboardPageHeader'
import { RenterDashboardTabShell } from '../components/student/RenterDashboardPageHeader'

export default function MessagesInboxPage() {
  const { user, role, profile } = useAuthContext()
  const { items, loading, error, reload } = useConversationInbox(user?.id)

  const viewerRole = role === 'landlord' ? 'landlord' : 'tenant'

  if (role === 'landlord' && profile) {
    return (
      <LandlordMessagesTabShell profile={profile as LandlordProfileRow}>
        <Seo title="Messages" canonicalPath="/messages" />
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <MessagesInbox
              items={items}
              loading={loading}
              error={error}
              onRetry={reload}
              viewerRole={viewerRole}
            />
          </div>
        </div>
      </LandlordMessagesTabShell>
    )
  }

  return (
    <RenterDashboardTabShell activeTab="messages">
      <Seo title="Messages" canonicalPath="/messages" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <MessagesInbox
            items={items}
            loading={loading}
            error={error}
            onRetry={reload}
            viewerRole={viewerRole}
          />
        </div>
      </div>
    </RenterDashboardTabShell>
  )
}
