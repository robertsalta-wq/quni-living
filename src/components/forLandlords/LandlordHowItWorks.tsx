import { useState, type CSSProperties } from 'react'
import DeskSectionKicker from './DeskSectionKicker'
import { HOW_IT_WORKS_STEPS, type HowItWorksActor } from '../../lib/forLandlordsSections'

const actorLabel: Record<HowItWorksActor, string> = {
  you: 'You',
  quni: 'Quni',
}

type LandlordHowItWorksProps = {
  className?: string
  style?: CSSProperties
}

/** Section 4 — six-step rail with honest effort meter. */
export default function LandlordHowItWorks({ className = '', style }: LandlordHowItWorksProps) {
  const [youOnly, setYouOnly] = useState(false)
  const youCount = HOW_IT_WORKS_STEPS.filter((s) => s.actor === 'you').length

  return (
    <section
      className={[
        'desk-settle flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--quni-cream-border)]',
        'bg-[var(--quni-surface-1)] p-[var(--space-4)] shadow-[var(--shadow-1)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-labelledby="landlord-how-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <DeskSectionKicker index="02" label="How it actually works" />
          <h2
            id="landlord-how-heading"
            className="mt-[var(--space-1)] m-0 font-display text-quni-h3 font-normal text-[var(--quni-ink-2)]"
          >
            Six steps — most of them are ours.
          </h2>
        </div>
        <button
          type="button"
          aria-pressed={youOnly}
          onClick={() => setYouOnly((v) => !v)}
          className={[
            'rounded-[var(--radius-pill)] border px-[var(--space-3)] py-[var(--space-1)] text-quni-micro font-extrabold',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
            youOnly
              ? 'border-[var(--quni-coral)] bg-[var(--quni-coral-tint)] text-[var(--quni-coral-active)]'
              : 'border-[var(--quni-cream-border)] bg-[var(--quni-surface-2)] text-[var(--quni-ink-4)]',
          ].join(' ')}
        >
          {youOnly ? 'Show all six steps' : 'Show only what you do'}
        </button>
      </div>

      {youOnly ? (
        <p className="m-0 text-quni-caption font-bold text-[var(--quni-coral-active)]">
          You touch {youCount} of the six steps — Quni does the rest.
        </p>
      ) : null}

      <ol className="m-0 grid list-none grid-cols-1 gap-[var(--space-2)] p-0 sm:grid-cols-2 lg:grid-cols-3">
        {HOW_IT_WORKS_STEPS.map((step) => {
          const dimmed = youOnly && step.actor !== 'you'
          const highlighted = youOnly && step.actor === 'you'
          return (
            <li
              key={step.n}
              className={[
                'relative rounded-[var(--radius-md)] border px-[var(--space-3)] py-[var(--space-2)] transition-opacity duration-[var(--dur-base)]',
                dimmed ? 'opacity-35' : 'opacity-100',
                highlighted
                  ? 'border-[var(--quni-coral)] bg-[var(--quni-coral-tint)]'
                  : 'border-[var(--quni-line-soft)] bg-[var(--quni-surface-2)]',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-[var(--space-2)]">
                <span className="font-display text-quni-caption font-bold text-[var(--quni-ink-2)]">
                  {step.n}. {step.title}
                </span>
                <span
                  className={[
                    'shrink-0 rounded-[var(--radius-pill)] px-[var(--space-2)] py-[var(--space-1)] text-quni-micro font-extrabold uppercase',
                    step.actor === 'you'
                      ? 'bg-[var(--quni-coral-tint)] text-[var(--quni-coral-active)]'
                      : 'bg-[var(--quni-navy-tint)] text-[var(--quni-navy)]',
                  ].join(' ')}
                >
                  {actorLabel[step.actor]}
                </span>
              </div>
              <p className="mt-[var(--space-1)] m-0 text-quni-caption text-[var(--quni-ink-4)]">
                {step.body}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
