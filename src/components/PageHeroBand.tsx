import type { ReactNode } from 'react'

/** Outer coral band — matches `/student-accommodation` page header */
export const PAGE_HERO_OUTER_CLASS = 'w-full bg-[#FF6F61] border-b border-[#CC4A3C]/20'

const INNER =
  'max-w-site mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 text-left'
const TITLE_CLASS = 'font-display text-3xl sm:text-4xl font-bold text-white tracking-tight'

type PageHeroBandProps = {
  title?: ReactNode
  subtitle?: ReactNode
  /** Extra row(s) below subtitle (e.g. hero CTA) */
  belowSubtitle?: ReactNode
  /** Replaces default title + subtitle block (loading skeletons, etc.) */
  children?: ReactNode
  /** Classes for the subtitle `<p>` when `subtitle` is a string-like node */
  subtitleClassName?: string
}

const DEFAULT_SUBTITLE_CLASS = 'text-white/85 text-sm sm:text-base mt-2 max-w-2xl'

export default function PageHeroBand({
  title,
  subtitle,
  belowSubtitle,
  children,
  subtitleClassName = DEFAULT_SUBTITLE_CLASS,
}: PageHeroBandProps) {
  return (
    <div className={PAGE_HERO_OUTER_CLASS}>
      <div className={INNER}>
        {children !== undefined ? (
          children
        ) : (
          <>
            {title != null && title !== '' && <h1 className={TITLE_CLASS}>{title}</h1>}
            {subtitle != null && subtitle !== '' && <p className={subtitleClassName}>{subtitle}</p>}
            {belowSubtitle}
          </>
        )}
      </div>
    </div>
  )
}
