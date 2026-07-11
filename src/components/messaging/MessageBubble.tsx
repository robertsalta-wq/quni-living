import type { ConversationMessageRow } from '../../lib/messaging/conversationTypes'
import {
  avatarColorClassForName,
  initialsFromDisplayName,
} from '../../lib/messaging/conversationDisplayNames'
import { formatMessageTime } from '../../lib/messaging/formatMessageTime'

type Props = {
  message: ConversationMessageRow
  displayBody: string
  isOwn: boolean
  senderDisplayName?: string | null
  showSenderIdentity?: boolean
  showReadReceipt?: boolean
}

export default function MessageBubble({
  message,
  displayBody,
  isOwn,
  senderDisplayName,
  showSenderIdentity = false,
  showReadReceipt = false,
}: Props) {
  const displayName = senderDisplayName?.trim() || 'Unknown'
  const initials = initialsFromDisplayName(displayName)
  const avatarClass = avatarColorClassForName(displayName)

  if (isOwn) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
          <div className="rounded-2xl rounded-br-md bg-[#FF6F61] px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
            <p className="whitespace-pre-wrap break-words">{displayBody}</p>
          </div>
          <p className="mt-1 text-right text-[10px] tabular-nums text-gray-400">
            {formatMessageTime(message.created_at)}
            {showReadReceipt ? (
              <span className="ml-1.5 text-gray-400">· Read</span>
            ) : null}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2">
      {showSenderIdentity ? (
        <div
          className={`mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarClass}`}
          aria-hidden
        >
          {initials}
        </div>
      ) : (
        <div className="w-8 shrink-0" aria-hidden />
      )}
      <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
        {showSenderIdentity && (
          <p className="mb-1 text-xs font-medium text-gray-500 truncate">{displayName}</p>
        )}
        <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm">
          <p className="whitespace-pre-wrap break-words">{displayBody}</p>
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-gray-400">
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
