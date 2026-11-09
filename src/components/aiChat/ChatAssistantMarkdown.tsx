import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function safeHref(href: string | undefined): string | null {
  if (!href) return null
  const trimmed = href.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return null
}

/**
 * Assistant replies only. react-markdown does not render raw HTML.
 * Links are limited to http(s).
 */
export default function ChatAssistantMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        a: ({ href, children }) => {
          const safe = safeHref(href)
          if (!safe) return <span>{children}</span>
          return (
            <a href={safe} className="underline underline-offset-2 break-all" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        },
        h1: ({ children }) => <p className="mb-2 font-semibold last:mb-0">{children}</p>,
        h2: ({ children }) => <p className="mb-2 font-semibold last:mb-0">{children}</p>,
        h3: ({ children }) => <p className="mb-2 font-semibold last:mb-0">{children}</p>,
        code: ({ children }) => <code className="rounded bg-gray-100 px-1 text-[0.85em]">{children}</code>,
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs last:mb-0">{children}</pre>
        ),
        img: () => null,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
