import type { ChatRole } from '../../lib/aiChat/chatTypes'

type Props = {
  role: ChatRole
  text: string
  isStreaming?: boolean
}

function streamingDots() {
  // Simple “typing” indicator.
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5 ml-1 text-gray-500">
      <span className="inline-block w-1 h-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.2s]" />
      <span className="inline-block w-1 h-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.1s]" />
      <span className="inline-block w-1 h-1 rounded-full bg-gray-500 animate-bounce" />
    </span>
  )
}

export default function ChatMessageBubble({ role, text, isStreaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-2xl bg-[#FF6F61] text-white shadow-sm'
            : 'rounded-2xl bg-white border border-gray-100 text-gray-900 shadow-sm',
        ].join(' ')}
        aria-live={isUser ? undefined : 'polite'}
      >
        <span>{text}</span>
        {!isUser && isStreaming ? streamingDots() : null}
      </div>
    </div>
  )
}

