/**
 * CSS-collapse answer region for desk FAQ answers (Gate 6).
 * Content stays in the DOM when collapsed — never conditional unmount, never <details>.
 */

type DeskAnswerPanelProps = {
  open: boolean
  answer: string
  source: string
  /** Navy landlord desk uses light-on-dark stamp. */
  tone?: 'cream' | 'navy' | 'trust'
  className?: string
}

export default function DeskAnswerPanel({
  open,
  answer,
  source,
  tone = 'cream',
  className = '',
}: DeskAnswerPanelProps) {
  const textClass =
    tone === 'navy' ? 'text-white/85' : tone === 'trust' ? 'text-[var(--quni-ink-2)]' : 'text-[var(--quni-ink-2)]'
  const stampClass =
    tone === 'navy'
      ? 'border-[rgba(143,214,166,0.55)] text-[#8FD6A6] bg-white/[0.06]'
      : 'border-[rgba(29,158,117,0.5)] text-[var(--quni-success-strong)] bg-white/75'

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
            tone === 'navy' ? 'border-white/20' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden={!open}
        >
          <p className={['m-0 text-[12.5px] leading-relaxed', textClass].join(' ')}>{answer}</p>
          <span
            className={[
              'mt-2 inline-flex rotate-[-2deg] items-center gap-1 rounded border px-1.5 py-0.5',
              'text-[8px] font-extrabold tracking-[0.09em]',
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
