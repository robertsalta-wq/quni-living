import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { useConversationInbox } from '../hooks/useConversationInbox'
import MessagesInbox from '../components/messaging/MessagesInbox'
import Seo from '../components/Seo'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

export default function MessagesInboxPage() {
  const { user } = useAuthContext()
  const { items, loading, error, reload } = useConversationInbox(user?.id)

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      <Seo title="Messages" canonicalPath="/messages" />
      <div className={`${SITE_CONTENT_MAX_CLASS} py-6 md:py-10 w-full flex-1`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-4 px-4 md:px-0">
            <h1 className="font-display text-2xl font-bold text-gray-900">Messages</h1>
            <Link to="/listings" className="text-sm font-medium text-[#FF6F61] hover:underline shrink-0">
              Browse listings
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <MessagesInbox items={items} loading={loading} error={error} onRetry={reload} />
          </div>
        </div>
      </div>
    </div>
  )
}
