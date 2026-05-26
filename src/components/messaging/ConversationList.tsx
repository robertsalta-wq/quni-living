import { Link } from 'react-router-dom'
import type { InboxConversation } from '../../hooks/useConversationInbox'
import { formatMessageTime } from '../../lib/messaging/formatMessageTime'
import { firstPropertyImageUrl } from '../../lib/propertyImages'

type Props = {
  items: InboxConversation[]
}

export default function ConversationList({ items }: Props) {
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => {
        const thumb = firstPropertyImageUrl(item.property?.images ?? null)
        const title = item.property?.title ?? 'Listing'
        const preview = item.last_message_preview?.trim() || 'No messages yet'
        return (
          <li key={item.id}>
            <Link
              to={`/messages/${item.id}`}
              className="flex gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0 ring-1 ring-gray-100" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-100 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 truncate">{title}</p>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {formatMessageTime(item.last_message_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">{preview}</p>
              </div>
              {item.unread && (
                <span className="shrink-0 mt-2 h-2.5 w-2.5 rounded-full bg-[#FF6F61]" aria-label="Unread" />
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
