import type { ConversationMessageRow } from '../../lib/messaging/conversationTypes'
import { formatMessageTime } from '../../lib/messaging/formatMessageTime'

type Props = {
  message: ConversationMessageRow
}

function systemLabel(message: ConversationMessageRow): string {
  const event = typeof message.metadata === 'object' && message.metadata !== null
    ? (message.metadata as { event?: string }).event
    : undefined
  if (event === 'booking_requested') return 'Booking requested'
  if (event === 'booking_accepted' || event === 'contact_unlocked') return 'Contact details unlocked'
  if (event === 'booking_declined') return 'Booking declined'
  return message.body.trim() || 'Update'
}

export default function SystemEventLine({ message }: Props) {
  return (
    <div className="flex justify-center py-2">
      <p className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 text-center max-w-md">
        {systemLabel(message)}
        <span className="text-gray-400 ml-1.5">{formatMessageTime(message.created_at)}</span>
      </p>
    </div>
  )
}
