import { useState } from 'react'
import type { ProfileReadinessDriverProps, ReadinessDriverStep } from './types'

/** Serif display line — Playfair via app `font-display` token. */
const DRIVER_TITLE_CLASS =
  'font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em] text-balance text-admin-ink'

const CARD_CLASS =
  'sticky z-[5] mb-4 rounded-admin-lg border border-admin-line bg-white shadow-admin-card'

const COMPLETE_CARD_CLASS =
  'sticky z-[5] mb-4 rounded-admin-lg border border-admin-success/35 bg-white shadow-admin-card'

const COMPLETE_CARD_COLLAPSED_CLASS =
  'sticky z-[5] mb-4 rounded-admin-lg border border-admin-success/35 bg-admin-success-bg shadow-admin-card'

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

function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
      />
    </svg>
  )
}

function ChevronGlyph({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-[18px] w-[18px] shrink-0 stroke-admin-success-fg transition-transform duration-200 ${
        expanded ? 'rotate-180' : ''
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
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
  const allComplete = steps.length > 0 && steps.every((step) => step.state === 'done')
  const [expanded, setExpanded] = useState(false)

  const lineClass =
    tone === 'positive'
      ? 'text-sm font-semibold text-admin-success-fg'
      : 'text-sm font-semibold text-admin-warning'

  const stepsBlock =
    steps.length > 0 ? (
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
    ) : null

  const progressBlock = (
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
  )

  if (allComplete) {
    return (
      <div
        className={expanded ? COMPLETE_CARD_CLASS : COMPLETE_CARD_COLLAPSED_CLASS}
        style={{ top: stickyTop }}
      >
        <button
          type="button"
          className={[
            'flex w-full cursor-pointer items-center gap-3 border-0 text-left',
            expanded
              ? 'bg-admin-success-bg px-[22px] py-3.5'
              : 'bg-transparent px-[22px] py-3.5',
          ].join(' ')}
          aria-expanded={expanded}
          aria-controls="profile-readiness-complete-panel"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-admin-success text-white">
            <CheckGlyph />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-admin-success-fg">{title}</span>
            <span className="mt-0.5 block text-[12.5px] text-admin-ink-4">Listing & bookings enabled</span>
          </span>
          <ChevronGlyph expanded={expanded} />
        </button>

        {expanded ? (
          <div
            id="profile-readiness-complete-panel"
            className="border-t border-admin-success/25 px-[22px] pb-5 pt-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
                  {eyebrow}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="m-0 text-[19px] font-bold tabular-nums text-admin-ink">{fraction}</p>
                <p className="mt-0.5 max-w-[120px] text-[11px] text-admin-ink-5">{fractionLabel}</p>
              </div>
            </div>

            {stepsBlock}
            {progressBlock}
            <div className={lineClass}>{line}</div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`${CARD_CLASS} px-[22px] py-5`} style={{ top: stickyTop }}>
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

      {stepsBlock}
      {progressBlock}
      <div className={lineClass}>{line}</div>
    </div>
  )
}
