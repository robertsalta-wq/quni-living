import type { ConversationMessageRow } from '../../lib/messaging/conversationTypes'
import { formatMessageTime } from '../../lib/messaging/formatMessageTime'

type Props = {
  message: ConversationMessageRow
  displayBody: string
  isOwn: boolean
}

export default function MessageBubble({ message, displayBody, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isOwn
            ? 'bg-[#FF6F61] text-white rounded-br-md'
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{displayBody}</p>
        <p
          className={`mt-1 text-[10px] tabular-nums ${isOwn ? 'text-white/80' : 'text-gray-400'}`}
        >
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
