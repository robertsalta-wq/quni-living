import { type ReactNode, isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugifyHeading } from '../../lib/guides/slugifyHeading'

function childText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return childText(node.props.children)
  return ''
}

const guideLinkClass =
  'font-medium text-[#FF6F61] underline underline-offset-2 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40 rounded-sm'

export default function GuideMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => {
          const id = slugifyHeading(childText(children))
          return (
            <h2 id={id} className="scroll-mt-28 font-display text-xl font-bold text-gray-900 mt-10 first:mt-0 mb-3 sm:text-2xl">
              {children}
            </h2>
          )
        },
        h3: ({ children }) => {
          const id = slugifyHeading(childText(children))
          return (
            <h3 id={id} className="scroll-mt-28 text-base font-bold text-gray-900 mt-6 mb-2 sm:text-lg">
              {children}
            </h3>
          )
        },
        p: ({ children }) => (
          <p className="text-[15px] leading-relaxed text-gray-700 mb-4 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-2 text-[15px] leading-relaxed text-gray-700 mb-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-2 text-[15px] leading-relaxed text-gray-700 mb-4">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        a: ({ href, children }) => (
          <a href={href} className={guideLinkClass} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#FF6F61]/40 pl-4 text-gray-600 italic mb-4">{children}</blockquote>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
