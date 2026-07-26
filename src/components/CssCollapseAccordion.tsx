import { useId, useState, type ReactNode } from 'react'

export type CssCollapseAccordionItem = {
  id: string
  question: string
  answer: ReactNode
}

type Props = {
  items: CssCollapseAccordionItem[]
  /** Exclusive open id within this list; null = all collapsed. */
  defaultOpenId?: string | null
  /** Visual variant for marketing FAQ vs pricing FAQ. */
  variant?: 'faq' | 'pricing'
  /** Heading level for each question (pricing already has an h3 bucket label). */
  questionHeading?: 'h3' | 'div'
}

/**
 * Accordion that keeps every answer in the DOM (CSS max-height collapse).
 * Prefer this over conditional render (`{open ? x : null}`) and over `<details>`
 * when content must remain extractable as ordinary HTML.
 *
 * Accessibility: button + aria-expanded + aria-controls → labelled region.
 */
export default function CssCollapseAccordion({
  items,
  defaultOpenId = items[0]?.id ?? null,
  variant = 'faq',
  questionHeading = variant === 'faq' ? 'h3' : 'div',
}: Props) {
  const baseId = useId()
  const [openId, setOpenId] = useState<string | null>(defaultOpenId)
  const QuestionHeading = questionHeading

  const isFaq = variant === 'faq'
  const buttonClass = isFaq
    ? 'flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-coral/40 sm:px-6 sm:text-base'
    : 'flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--quni-coral)] sm:px-5'
  const panelClass = isFaq
    ? 'px-5 text-sm leading-relaxed text-gray-600 sm:px-6'
    : 'px-4 text-sm leading-relaxed text-gray-600 sm:px-5'
  const chevronClass = isFaq
    ? 'h-5 w-5 shrink-0 text-gray-400 transition-transform'
    : 'h-5 w-5 shrink-0 text-[var(--quni-coral)] transition-transform'

  return (
    <div className={isFaq ? 'divide-y divide-gray-100' : 'mt-3 divide-y divide-stone-100 rounded-xl border border-stone-100'}>
      {items.map((item) => {
        const open = openId === item.id
        const panelId = `${baseId}-panel-${item.id}`
        const buttonId = `${baseId}-btn-${item.id}`
        return (
          <div key={item.id}>
            <QuestionHeading className="m-0 text-inherit font-inherit">
              <button
                type="button"
                id={buttonId}
                className={buttonClass}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
              >
                <span className={isFaq ? 'min-w-0 pr-2' : 'font-semibold text-gray-900'}>{item.question}</span>
                <svg
                  className={`${chevronClass} ${open ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>
            </QuestionHeading>
            {/*
              Always in the DOM. Closed = CSS grid-rows collapse (not display:none,
              conditional null, or <details>). Parsers see ordinary text nodes.
            */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className={`${panelClass} pb-4`}>{item.answer}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
