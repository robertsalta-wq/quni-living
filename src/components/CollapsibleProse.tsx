import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const DEFAULT_COLLAPSED_LINES = 4
/** Matches leading-[1.6] on prose blocks */
const PROSE_LINE_HEIGHT = 1.6

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export type CollapsibleProseProps = {
  /** Stable id for aria-controls (required when multiple instances on one page) */
  id: string
  className?: string
  collapsedLines?: number
  /** When set, renders line-based pre-wrap content (blank lines hidden while collapsed). */
  text?: string
  preWrap?: boolean
  children?: ReactNode
}

function PreWrapLines({ text, collapsed }: { text: string; collapsed: boolean }) {
  const lines = text.split(/\r?\n/)
  return (
    <>
      {lines.map((line, i) => {
        const isBlank = line.trim() === ''
        if (collapsed && isBlank) {
          return (
            <span key={i} className="hidden" aria-hidden>
              {line}
            </span>
          )
        }
        return (
          <span key={i} className="block">
            {isBlank ? '\u00A0' : line}
          </span>
        )
      })}
    </>
  )
}

export function CollapsibleProse({
  id,
  className,
  collapsedLines = DEFAULT_COLLAPSED_LINES,
  text,
  preWrap = false,
  children,
}: CollapsibleProseProps) {
  const [expanded, setExpanded] = useState(false)
  const [canCollapse, setCanCollapse] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const collapsedMaxHeightEm = collapsedLines * PROSE_LINE_HEIGHT

  const measureOverflow = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const style = getComputedStyle(el)
    const fontSize = parseFloat(style.fontSize)
    if (!Number.isFinite(fontSize) || fontSize <= 0) return
    let lineHeightPx: number
    if (style.lineHeight === 'normal') {
      lineHeightPx = fontSize * PROSE_LINE_HEIGHT
    } else if (style.lineHeight.endsWith('px')) {
      lineHeightPx = parseFloat(style.lineHeight)
    } else {
      lineHeightPx = parseFloat(style.lineHeight) * fontSize
    }
    const threshold = lineHeightPx * collapsedLines
    setCanCollapse(el.scrollHeight > threshold + 1)
  }, [collapsedLines])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    measureOverflow()
    const ro = new ResizeObserver(() => measureOverflow())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measureOverflow, text, children, expanded])

  const toggleLabel = expanded ? 'Read less' : 'Read more'

  return (
    <div className={cn('space-y-2', className)}>
      <div
        id={id}
        ref={contentRef}
        className={cn(!expanded && 'overflow-hidden')}
        style={!expanded ? { maxHeight: `${collapsedMaxHeightEm}em` } : undefined}
      >
        {preWrap && text != null ? (
          <PreWrapLines text={text} collapsed={!expanded} />
        ) : (
          children
        )}
      </div>
      {canCollapse ? (
        <button
          type="button"
          className="text-sm font-medium text-[#FF6F61] hover:text-[#e85d52] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40 focus-visible:ring-offset-2 rounded"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
        >
          {toggleLabel}
        </button>
      ) : null}
    </div>
  )
}
