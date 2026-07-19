import type { ReactNode, Ref } from 'react'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

/**
 * Sole owner of header geometry for marketing + dashboard.
 * Marketing Header is the reference (stable): cream bg, border, safe-area,
 * SITE_CONTENT_MAX_CLASS + py-4. No other component may re-declare this chrome.
 *
 * Stickiness / fixed positioning is passed via `className` (marketing sticky;
 * app shell stickiness lives on AppShellLayout's wrapper).
 */
export const CHROME_HEADER_OUTER_CLASS =
  'pt-safe-top w-full max-w-full shrink-0 overflow-x-clip overflow-y-hidden bg-[var(--brand-header-bg)] border-b border-[var(--brand-header-border)] z-50'

/** Inner content width + vertical padding — marketing reference. */
export const CHROME_HEADER_INNER_CLASS = `${SITE_CONTENT_MAX_CLASS} py-4`

type Props = {
  children: ReactNode
  /** Extra classes on <header> (positioning only — not geometry tokens). */
  className?: string
  /** Extra classes on the inner max-width row. */
  innerClassName?: string
  innerRef?: Ref<HTMLDivElement>
  embedded?: boolean
  /** Diagnostic attribute for which surface owns the slot content. */
  'data-chrome-header'?: string
}

export default function ChromeHeaderShell({
  children,
  className,
  innerClassName,
  innerRef,
  embedded,
  'data-chrome-header': dataChromeHeader,
}: Props) {
  return (
    <header
      className={[CHROME_HEADER_OUTER_CLASS, className].filter(Boolean).join(' ')}
      data-chrome-header-shell=""
      {...(dataChromeHeader ? { 'data-chrome-header': dataChromeHeader } : {})}
      {...(embedded ? { 'data-header-embedded': '' } : {})}
    >
      <div
        ref={innerRef}
        className={[CHROME_HEADER_INNER_CLASS, innerClassName].filter(Boolean).join(' ')}
      >
        {children}
      </div>
    </header>
  )
}
