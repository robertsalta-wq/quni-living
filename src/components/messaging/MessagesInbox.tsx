import ConversationList from './ConversationList'
import type { InboxConversation } from '../../hooks/useConversationInbox'

type Props = {
  items: InboxConversation[]
  loading: boolean
  error: string | null
  onRetry: () => void
  viewerRole?: 'tenant' | 'landlord'
}

export default function MessagesInbox({ items, loading, error, onRetry, viewerRole = 'tenant' }: Props) {
  if (loading && items.length === 0) {
    return (
      <div className="px-4 py-8 space-y-4" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-12 w-12 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm font-medium text-[var(--quni-coral)] hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-display text-lg font-bold text-gray-900">No messages yet</p>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          {viewerRole === 'landlord'
            ? 'When a student messages you about a listing, your conversations will appear here.'
            : 'When you message a landlord from a listing, your conversations will appear here.'}
        </p>
      </div>
    )
  }

  return <ConversationList items={items} />
}
