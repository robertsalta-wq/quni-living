import type { ReactNode, Ref } from 'react'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

/**
 * Sole owner of header geometry for marketing + dashboard.
 * Marketing Header is the reference: cream bg, border, safe-area, content max-width,
 * horizontal padding, vertical padding, and a content track at least as tall as the
 * marketing hamburger (`min-h-11`) so logo vertical position matches.
 *
 * Stickiness / fixed positioning is passed via `className` only.
 */
export const CHROME_HEADER_OUTER_CLASS =
  'pt-safe-top w-full max-w-full shrink-0 overflow-x-clip overflow-y-hidden bg-[var(--brand-header-bg)] border-b border-[var(--brand-header-border)] z-50'

/**
 * Marketing reference content track: same max-width + px as the site, py-4, and
 * min-h-11 so a short dashboard row cannot collapse shorter than marketing.
 */
export const CHROME_HEADER_INNER_CLASS = `${SITE_CONTENT_MAX_CLASS} py-4`

/** Locked content-row height — matches marketing `min-h-11` menu control. */
export const CHROME_HEADER_ROW_CLASS = 'flex min-h-11 w-full max-w-full items-center'

type Props = {
  children: ReactNode
  /** Extra classes on <header> (positioning only — not geometry tokens). */
  className?: string
  /**
   * Extra classes on the padded max-width wrapper.
   * Must not remove py-4 / max-w-site / px unless replacing with an equivalent lock.
   */
  innerClassName?: string
  innerRef?: Ref<HTMLDivElement>
  embedded?: boolean
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
        <div className={CHROME_HEADER_ROW_CLASS} data-chrome-header-row="">
          {children}
        </div>
      </div>
    </header>
  )
}
