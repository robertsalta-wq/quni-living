import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LISTING_TIER_ACCEPTANCE_FEE_DISPLAY } from '../../lib/documents/licenceOccupy/utils'
import {
  DEMO_TOUR_STEP_COUNT,
  TOUR_ACCEPT_BUTTON,
  TOUR_ACCEPT_HEADING,
  TOUR_AGREEMENT_HEADING,
  TOUR_AGREEMENT_LINES,
  TOUR_AGREEMENT_TITLE,
  TOUR_APPLICANT_BODY,
  TOUR_APPLICANT_CARD,
  TOUR_APPLICANT_HEADING,
  TOUR_BAND,
  TOUR_DONE_BODY,
  TOUR_DONE_BODY_WAIVED,
  TOUR_DONE_HEADING,
  TOUR_FEE_BODY_WAIVED,
  TOUR_ID_BODY,
  TOUR_ID_HEADING,
  TOUR_ID_ROWS,
  TOUR_LISTING_BODY,
  TOUR_LISTING_CARD,
  TOUR_LISTING_HEADING,
  TOUR_RESTART_LABEL,
  TOUR_SIGNUP_LABEL,
  demoTourSignupPath,
  demoTourSourceFromParam,
  landlordTourFixture,
} from '../../lib/demo/landlordTourFixture'
import { trackVercelEvent } from '../../lib/vercelAnalytics'

const navButtonClass =
  'inline-flex min-h-12 flex-1 items-center justify-center rounded-[var(--radius-md)] px-4 text-base font-semibold'

function ExampleMark() {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--quni-coral-tint-15)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--quni-coral-active)]">
      Example
    </span>
  )
}

function SampleCard({ children }: { children: ReactNode }) {
  return (
    <div className="quni-card p-4">
      <ExampleMark />
      <div className="mt-3 min-w-0 text-base leading-relaxed text-[var(--quni-ink)]">{children}</div>
    </div>
  )
}

type StepCopy = {
  heading: string
  body: string
}

function stepCopy(step: number, feeWaived: boolean): StepCopy {
  if (step === 1) return { heading: TOUR_LISTING_HEADING, body: TOUR_LISTING_BODY }
  if (step === 2) return { heading: TOUR_APPLICANT_HEADING, body: TOUR_APPLICANT_BODY }
  if (step === 3) return { heading: TOUR_ID_HEADING, body: TOUR_ID_BODY }
  if (step === 4) {
    return {
      heading: TOUR_ACCEPT_HEADING,
      body: feeWaived
        ? TOUR_FEE_BODY_WAIVED
        : `${LISTING_TIER_ACCEPTANCE_FEE_DISPLAY} once, when you accept. Nothing is charged on this page.`,
    }
  }
  if (step === 5) return { heading: TOUR_AGREEMENT_HEADING, body: '' }
  return {
    heading: TOUR_DONE_HEADING,
    body: feeWaived ? TOUR_DONE_BODY_WAIVED : TOUR_DONE_BODY,
  }
}

function StepSample({ step, onAccept }: { step: number; onAccept: () => void }) {
  if (step === 1) {
    return (
      <SampleCard>
        <p>{TOUR_LISTING_CARD}</p>
      </SampleCard>
    )
  }

  if (step === 2) {
    return (
      <SampleCard>
        <p>{TOUR_APPLICANT_CARD}</p>
      </SampleCard>
    )
  }

  if (step === 3) {
    return (
      <SampleCard>
        <ul className="m-0 list-none space-y-2 p-0">
          {TOUR_ID_ROWS.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
      </SampleCard>
    )
  }

  if (step === 4) {
    return (
      <SampleCard>
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--quni-coral)] px-4 text-base font-semibold text-white hover:bg-[var(--quni-coral-hover)]"
        >
          {TOUR_ACCEPT_BUTTON}
        </button>
      </SampleCard>
    )
  }

  return (
    <SampleCard>
      <p className="font-semibold">{TOUR_AGREEMENT_TITLE}</p>
      <ul className="m-0 mt-3 list-none space-y-2 p-0">
        {TOUR_AGREEMENT_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </SampleCard>
  )
}

export default function LandlordDemoTour() {
  const [searchParams] = useSearchParams()
  const source = demoTourSourceFromParam(searchParams.get('utm_source'))
  const [step, setStep] = useState(1)
  const feeWaived = landlordTourFixture.feeWaived
  const copy = stepCopy(step, feeWaived)

  useEffect(() => {
    trackVercelEvent('demo_tour_step', { step, source })
  }, [step, source])

  function goNext() {
    setStep((current) => Math.min(DEMO_TOUR_STEP_COUNT, current + 1))
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1))
  }

  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-hidden bg-[var(--quni-surface-2)] font-inter text-[var(--quni-ink-3)]">
      <p className="sticky top-below-fixed-header z-10 border-b border-[var(--quni-line)] bg-[var(--quni-cream)] px-4 py-3 text-sm leading-snug text-[var(--quni-ink)] md:top-0">
        {TOUR_BAND}
      </p>

      <div className="mx-auto flex w-full min-w-0 max-w-site flex-1 flex-col px-4 pb-4 pt-4">
        <p className="text-sm font-semibold text-[var(--quni-ink-4)]">
          Step {step} of {DEMO_TOUR_STEP_COUNT}
        </p>
        <h1 className="m-0 mt-2 font-inter text-[length:var(--text-h1-size)] font-semibold leading-tight text-[var(--quni-ink)]">
          {copy.heading}
        </h1>
        {copy.body ? <p className="mt-3 text-base leading-relaxed text-[var(--quni-ink-2)]">{copy.body}</p> : null}

        {step < DEMO_TOUR_STEP_COUNT ? (
          <div className="mt-4 min-w-0">
            <StepSample step={step} onAccept={goNext} />
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-6 [padding-bottom:max(var(--space-4),env(safe-area-inset-bottom,0px))]">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className={`${navButtonClass} border border-[var(--quni-line)] bg-[var(--quni-surface-1)] text-[var(--quni-ink)] disabled:opacity-40`}
            >
              Back
            </button>
            {step < DEMO_TOUR_STEP_COUNT ? (
              <button
                type="button"
                onClick={goNext}
                className={`${navButtonClass} bg-[var(--quni-coral)] text-white hover:bg-[var(--quni-coral-hover)]`}
              >
                Next
              </button>
            ) : (
              <Link
                to={demoTourSignupPath(source)}
                onClick={() => trackVercelEvent('demo_tour_signup_click', { source })}
                className={`${navButtonClass} bg-[var(--quni-coral)] text-center text-white hover:bg-[var(--quni-coral-hover)]`}
              >
                {TOUR_SIGNUP_LABEL}
              </Link>
            )}
          </div>
          {step === DEMO_TOUR_STEP_COUNT ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-12 w-full items-center justify-center text-base font-semibold text-[var(--quni-ink-3)] underline underline-offset-2"
            >
              {TOUR_RESTART_LABEL}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
