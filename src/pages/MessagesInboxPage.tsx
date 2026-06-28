import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import type { LandlordProfileRow } from '../lib/authProfile'
import { isRenterRole } from '../lib/authProfile'
import { useConversationInbox } from '../hooks/useConversationInbox'
import MessagesInbox from '../components/messaging/MessagesInbox'
import Seo from '../components/Seo'
import UserDashboardShell from '../components/dashboard/UserDashboardShell'
import { LandlordMessagesTabShell } from '../components/landlord/LandlordDashboardPageHeader'
import { studentDashboardTabPath, userDashboardBreadcrumbs } from '../lib/userDashboardNav'

export default function MessagesInboxPage() {
  const { user, role, profile } = useAuthContext()
  const navigate = useNavigate()
  const { items, loading, error, reload } = useConversationInbox(user?.id)

  const dashboardRole = role === 'landlord' ? 'landlord' : 'renter'
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
    <UserDashboardShell
      role={dashboardRole}
      breadcrumbs={userDashboardBreadcrumbs(dashboardRole, { label: 'Messages' })}
      showSectionNav
      activeSection="messages"
      onSectionSelect={(section) => {
        if (section === 'overview' || section === 'bookings') {
          navigate(studentDashboardTabPath(section))
        }
      }}
    >
      <Seo title="Messages" canonicalPath="/messages" />
      <div className="max-w-2xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Messages</h1>
          {isRenterRole(dashboardRole) ? (
            <button
              type="button"
              onClick={() => navigate('/listings')}
              className="text-sm font-medium text-[#FF6F61] hover:underline shrink-0"
            >
              Browse listings
            </button>
          ) : null}
        </div>
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
    </UserDashboardShell>
  )
}
