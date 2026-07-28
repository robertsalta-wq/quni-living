/**
 * CSS-collapse answer region for desk FAQ answers (Gate 6).
 * Content stays in the DOM when collapsed — never conditional unmount, never <details>.
 */

type DeskAnswerPanelProps = {
  open: boolean
  answer: string
  source: string
  /** Dark landlord desk uses light-on-dark stamp. `navy` kept as alias for dark. */
  tone?: 'cream' | 'navy' | 'ink' | 'trust'
  className?: string
}

export default function DeskAnswerPanel({
  open,
  answer,
  source,
  tone = 'cream',
  className = '',
}: DeskAnswerPanelProps) {
  const dark = tone === 'navy' || tone === 'ink'
  const textClass = dark ? 'text-white/85' : 'text-[var(--quni-ink-2)]'
  const stampClass = dark
    ? 'border-[var(--quni-verified-border)] text-[var(--quni-verified)] bg-white/[0.06]'
    : 'border-[var(--quni-verified-border)] text-[var(--quni-verified)] bg-[var(--quni-verified-surface)]'

  return (
    <div
      className={[
        'grid transition-[grid-template-rows] duration-[320ms] ease-[var(--ease-standard)]',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-desk-answer={open ? 'open' : 'closed'}
    >
      <div className="min-h-0 overflow-hidden">
        {/* Structured twin: answer text always present for extractors (Gate 6). */}
        <div
          className={[
            'mt-2.5 border-t border-dotted border-[var(--quni-line)] pt-2.5',
            dark ? 'border-white/20' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden={!open}
        >
          <p className={['m-0 text-sm leading-relaxed', textClass].join(' ')}>{answer}</p>
          <span
            className={[
              'mt-2 inline-flex rotate-[-2deg] items-center gap-1 rounded border px-1.5 py-0.5',
              'text-xs font-extrabold tracking-[0.09em]',
              stampClass,
            ].join(' ')}
          >
            ✓ SOURCE · {source}
          </span>
        </div>
      </div>
    </div>
  )
}
