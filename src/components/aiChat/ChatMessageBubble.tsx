import type { ChatRole } from '../../lib/aiChat/chatTypes'

type Props = {
  role: ChatRole
  text: string
  isStreaming?: boolean
}

function streamingDots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5 ml-1 text-gray-500">
      <span className="inline-block w-1 h-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.2s]" />
      <span className="inline-block w-1 h-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.1s]" />
      <span className="inline-block w-1 h-1 rounded-full bg-gray-500 animate-bounce" />
    </span>
  )
}

const URL_RE = /https?:\/\/[^\s)\]>'"]+/gi

function sourceHostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('fairtrading')) return 'NSW Fair Trading'
    if (host.includes('rta.qld')) return 'QLD RTA'
    if (host.includes('quni')) return 'Quni'
    return host
  } catch {
    return 'Source'
  }
}

function extractSourceUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? []
  const uniq: string[] = []
  for (const raw of found) {
    const cleaned = raw.replace(/[.,;:]+$/, '')
    if (!uniq.includes(cleaned)) uniq.push(cleaned)
  }
  return uniq.slice(0, 3)
}

export default function ChatMessageBubble({ role, text, isStreaming }: Props) {
  const isUser = role === 'user'
  const sources = !isUser && !isStreaming ? extractSourceUrls(text) : []

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] flex flex-col gap-1.5">
        <div
          className={[
            'whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-2xl bg-[var(--quni-coral)] text-white shadow-sm'
              : 'rounded-2xl bg-white border border-gray-100 text-gray-900 shadow-sm',
          ].join(' ')}
          aria-live={isUser ? undefined : 'polite'}
        >
          <span>{text}</span>
          {!isUser && isStreaming ? streamingDots() : null}
        </div>
        {!isUser && !isStreaming ? (
          <div className="flex flex-wrap gap-1.5 px-1">
            {sources.length > 0 ? (
              sources.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-sm border border-[var(--quni-brass)]/40 bg-[var(--quni-cream)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--quni-brass-ink)] hover:border-[var(--quni-brass)]"
                >
                  Source · {sourceHostLabel(url)}
                </a>
              ))
            ) : (
              <span className="inline-flex items-center rounded-sm border border-[var(--quni-brass)]/40 bg-[var(--quni-cream)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--quni-brass-ink)]">
                Source · Quni policy
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
