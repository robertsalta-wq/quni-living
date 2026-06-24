import type { ProfileReadinessDriverProps, ReadinessDriverStep } from './types'

/** Serif display line — Playfair via app `font-display` token. */
const DRIVER_TITLE_CLASS =
  'font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em] text-balance text-admin-ink'

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(1, Math.max(0, progress))
}

function StepDot({ step, index }: { step: ReadinessDriverStep; index: number }) {
  if (step.state === 'done') {
    return (
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-admin-success text-white">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
          />
        </svg>
      </span>
    )
  }

  const active = step.state === 'active'
  return (
    <span
      className={[
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold',
        active
          ? 'bg-admin-warning-bg text-admin-warning-fg'
          : 'bg-admin-surface-3 text-admin-ink-3',
      ].join(' ')}
    >
      {index + 1}
    </span>
  )
}

function stepChipClass(state: ReadinessDriverStep['state']): string {
  if (state === 'done') {
    return 'border border-admin-success/35 bg-admin-success-bg text-admin-success-fg'
  }
  if (state === 'active') {
    return 'border border-admin-warning/40 bg-admin-warning-bg text-admin-warning-fg'
  }
  return 'border border-admin-line bg-admin-surface-2 text-admin-ink-4'
}

export default function ProfileReadinessDriver({
  eyebrow,
  title,
  fraction,
  fractionLabel,
  steps,
  progress,
  line,
  tone = 'default',
  stickyTop = 0,
}: ProfileReadinessDriverProps) {
  const barWidth = Math.round(clampProgress(progress) * 100)

  const lineClass =
    tone === 'positive'
      ? 'text-sm font-semibold text-admin-success-fg'
      : 'text-sm font-semibold text-admin-warning'

  return (
    <div
      className="sticky z-[5] mb-4 rounded-admin-lg border border-admin-line bg-white px-[22px] py-5 shadow-admin-card"
      style={{ top: stickyTop }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
            {eyebrow}
          </p>
          <p className={`${DRIVER_TITLE_CLASS} mt-[5px] mb-0`}>{title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="m-0 text-[19px] font-bold tabular-nums text-admin-ink">{fraction}</p>
          <p className="mt-0.5 max-w-[120px] text-[11px] text-admin-ink-5">{fractionLabel}</p>
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="mb-1 mt-4 flex items-center gap-2.5">
          {steps.map((step, index) => (
            <span key={`${step.label}-${index}`} className="contents">
              <span
                className={[
                  'inline-flex shrink-0 items-center gap-2 rounded-admin-pill px-3 py-1.5 text-xs font-semibold',
                  stepChipClass(step.state),
                ].join(' ')}
              >
                <StepDot step={step} index={index} />
                <span>{step.label}</span>
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={[
                    'h-0.5 min-w-[18px] flex-1 rounded-sm',
                    step.state === 'done' ? 'bg-admin-coral' : 'bg-admin-line',
                  ].join(' ')}
                  aria-hidden
                />
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div
        className="my-3.5 h-2 overflow-hidden rounded-full bg-admin-surface-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barWidth}
      >
        <div
          className="h-full rounded-full bg-admin-coral transition-[width] duration-300"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className={lineClass}>{line}</div>
    </div>
  )
}
