import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'
import { isValidElement } from 'react'
import featureInventoryMarkdown from '../../../docs/feature-inventory.md?raw'
import { slugifyHeading } from '../../lib/guides/slugifyHeading'
import { AdminPageHeader, Card } from '../../components/admin/primitives'

function childText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return childText(node.props.children)
  return ''
}

const linkClass =
  'font-medium text-[var(--quni-coral)] underline underline-offset-2 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-coral/40 rounded-sm'

/**
 * Human-readable product capability list for marketing / ops.
 * Source: docs/feature-inventory.md (same file synced into AI knowledge base).
 */
export default function AdminFeatureInventory() {
  return (
    <div className="mx-auto max-w-[880px]">
      <AdminPageHeader
        title="Feature inventory"
        subtitle={
          <>
            Living product checklist for marketing and support. Edit{' '}
            <code className="rounded bg-admin-surface-3 px-1 text-[12px] text-admin-ink-3">
              docs/feature-inventory.md
            </code>
            , then sync AI with{' '}
            <code className="rounded bg-admin-surface-3 px-1 text-[12px] text-admin-ink-3">
              npm run sync:knowledge-inventory
            </code>{' '}
            and{' '}
            <code className="rounded bg-admin-surface-3 px-1 text-[12px] text-admin-ink-3">
              npm run seed:knowledge
            </code>
            . RAG chunks live in{' '}
            <Link to="/admin/knowledge-base" className={linkClass}>
              Knowledge base
            </Link>
            .
          </>
        }
      />

      <Card padding={32}>
        <article>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="font-display text-2xl font-bold tracking-tight text-admin-ink !mt-0 !mb-4 sm:text-3xl">
                  {children}
                </h1>
              ),
              h2: ({ children }) => {
                const id = slugifyHeading(childText(children))
                return (
                  <h2
                    id={id}
                    className="scroll-mt-28 font-display text-xl font-bold text-admin-ink mt-10 first:mt-0 mb-3 border-b border-admin-line pb-2 sm:text-2xl"
                  >
                    {children}
                  </h2>
                )
              },
              h3: ({ children }) => {
                const id = slugifyHeading(childText(children))
                return (
                  <h3 id={id} className="scroll-mt-28 text-base font-bold text-admin-ink mt-7 mb-2 sm:text-lg">
                    {children}
                  </h3>
                )
              },
              h4: ({ children }) => (
                <h4 className="text-sm font-bold uppercase tracking-wide text-admin-ink-3 mt-5 mb-2">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="text-[15px] leading-relaxed text-admin-ink-2 mb-4 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 space-y-2 text-[15px] leading-relaxed text-admin-ink-2 mb-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 space-y-2 text-[15px] leading-relaxed text-admin-ink-2 mb-4">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="marker:text-admin-ink-4">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-admin-ink">{children}</strong>,
              em: ({ children }) => <em>{children}</em>,
              a: ({ href, children }) => {
                const external = Boolean(href?.startsWith('http'))
                if (href?.startsWith('/') && !external) {
                  return (
                    <Link to={href} className={linkClass}>
                      {children}
                    </Link>
                  )
                }
                return (
                  <a
                    href={href}
                    className={linkClass}
                    rel={external ? 'noopener noreferrer' : undefined}
                    target={external ? '_blank' : undefined}
                  >
                    {children}
                  </a>
                )
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-admin-coral/40 pl-4 text-admin-ink-3 italic mb-4">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-8 border-admin-line" />,
              code: ({ children, className }) => {
                const block = className?.includes('language-')
                if (block) {
                  return (
                    <code className="block overflow-x-auto rounded-admin-md bg-admin-surface-3 p-3 text-[13px] text-admin-ink-2 mb-4">
                      {children}
                    </code>
                  )
                }
                return (
                  <code className="rounded bg-admin-surface-3 px-1 py-0.5 text-[13px] text-admin-ink-2">
                    {children}
                  </code>
                )
              },
              table: ({ children }) => (
                <div className="mb-5 overflow-x-auto rounded-admin border border-admin-line">
                  <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-admin-surface-2">{children}</thead>,
              th: ({ children }) => (
                <th className="border-b border-admin-line px-3 py-2 font-semibold text-admin-ink">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border-b border-admin-line-soft px-3 py-2 align-top text-admin-ink-2">{children}</td>
              ),
            }}
          >
            {featureInventoryMarkdown}
          </ReactMarkdown>
        </article>
      </Card>
    </div>
  )
}
