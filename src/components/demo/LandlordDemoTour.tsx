import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LISTING_TIER_ACCEPTANCE_FEE_DISPLAY } from '../../lib/pricing/listingTierAcceptanceFeeDisplay'
import DemoPhone from './DemoPhone'
import {
  AcceptScreen,
  AgreementScreen,
  ApplicantScreen,
  ChecksScreen,
  ConfirmedScreen,
  ListingScreen,
} from './DemoTourScreens'
import {
  DEMO_TOUR_STEP_COUNT,
  TOUR_ACCEPT_HEADING,
  TOUR_AGREEMENT_HEADING,
  TOUR_AGREEMENT_LINES,
  TOUR_APPLICANT_BODY,
  TOUR_APPLICANT_HEADING,
  TOUR_BAND,
  TOUR_BOND_CAPTION,
  TOUR_DONE_BODY,
  TOUR_DONE_BODY_WAIVED,
  TOUR_DONE_HEADING,
  TOUR_FEE_BODY_WAIVED,
  TOUR_ID_BODY,
  TOUR_ID_HEADING,
  TOUR_LISTING_BODY,
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

function stepHeading(step: number): string {
  if (step === 1) return TOUR_LISTING_HEADING
  if (step === 2) return TOUR_APPLICANT_HEADING
  if (step === 3) return TOUR_ID_HEADING
  if (step === 4) return TOUR_ACCEPT_HEADING
  if (step === 5) return TOUR_AGREEMENT_HEADING
  return TOUR_DONE_HEADING
}

function stepCaptions(step: number, feeWaived: boolean): readonly string[] {
  if (step === 1) return [TOUR_LISTING_BODY]
  if (step === 2) return [TOUR_APPLICANT_BODY]
  if (step === 3) return [TOUR_ID_BODY]
  if (step === 4) {
    return [
      feeWaived
        ? TOUR_FEE_BODY_WAIVED
        : `${LISTING_TIER_ACCEPTANCE_FEE_DISPLAY} once, when you accept. Nothing is charged on this page.`,
    ]
  }
  if (step === 5) return TOUR_AGREEMENT_LINES
  return [TOUR_BOND_CAPTION, feeWaived ? TOUR_DONE_BODY_WAIVED : TOUR_DONE_BODY]
}

/** Put the step line just under the real header. No-op when it is already fully on screen. */
function scrollStepUnderHeader(anchor: HTMLElement): void {
  const header = document.querySelector('[data-chrome-header="marketing"]')
  const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0
  const rect = anchor.getBoundingClientRect()
  const alreadyVisible = rect.top >= headerBottom - 1 && rect.bottom <= window.innerHeight + 1
  if (alreadyVisible) return

  const top = Math.max(0, window.scrollY + rect.top - headerBottom)
  const root = document.scrollingElement ?? document.documentElement
  const html = document.documentElement
  const prevHtml = html.style.scrollBehavior
  const prevBody = document.body.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  document.body.style.scrollBehavior = 'auto'
  try {
    root.scrollTop = top
    if (document.body !== root) document.body.scrollTop = top
    window.scrollTo({ top, left: 0, behavior: 'instant' })
  } finally {
    html.style.scrollBehavior = prevHtml
    document.body.style.scrollBehavior = prevBody
  }
}

function TourScreen({ step, onAccept }: { step: number; onAccept: () => void }) {
  if (step === 1) return <ListingScreen />
  if (step === 2) return <ApplicantScreen />
  if (step === 3) return <ChecksScreen />
  if (step === 4) return <AcceptScreen onAccept={onAccept} />
  if (step === 5) return <AgreementScreen />
  return <ConfirmedScreen />
}

export default function LandlordDemoTour() {
  const [searchParams] = useSearchParams()
  const source = demoTourSourceFromParam(searchParams.get('utm_source'))
  const [step, setStep] = useState(1)
  const feeWaived = landlordTourFixture.feeWaived
  const captions = stepCaptions(step, feeWaived)
  const stepAnchorRef = useRef<HTMLParagraphElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const seenStepRef = useRef(step)

  useEffect(() => {
    trackVercelEvent('demo_tour_step', { step, source })
  }, [step, source])

  useEffect(() => {
    if (seenStepRef.current === step) return
    seenStepRef.current = step
    const anchor = stepAnchorRef.current
    const heading = headingRef.current
    if (!anchor) return

    const align = (moveFocus: boolean) => {
      scrollStepUnderHeader(anchor)
      if (moveFocus && heading && document.activeElement !== heading) {
        heading.focus({ preventScroll: true })
      }
    }

    align(true)
    const frame = requestAnimationFrame(() => align(false))
    const soon = window.setTimeout(() => align(false), 120)
    const later = window.setTimeout(() => align(true), 320)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(soon)
      window.clearTimeout(later)
    }
  }, [step])

  function goNext() {
    setStep((current) => Math.min(DEMO_TOUR_STEP_COUNT, current + 1))
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1))
  }

  return (
    <div className="flex w-full min-w-0 flex-col bg-[var(--quni-surface-2)] font-inter text-[var(--quni-ink-3)] min-h-[calc(100dvh-var(--quni-fixed-header-offset)+1.5rem)]">
      <p className="w-full min-w-0 border-b border-[var(--quni-line)] bg-[var(--quni-cream)] px-4 py-3 text-sm leading-snug break-words text-[var(--quni-ink)]">
        {TOUR_BAND}
      </p>

      <div className="mx-auto grid w-full min-w-0 max-w-site flex-1 grid-cols-1 content-start gap-4 px-4 py-5 md:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] md:items-center md:gap-x-12 md:px-6 md:py-8">
        <p ref={stepAnchorRef} className="m-0 text-sm font-semibold text-[var(--quni-ink-4)] md:col-start-2">
          Step {step} of {DEMO_TOUR_STEP_COUNT}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="m-0 font-inter text-[length:var(--text-h1-size)] font-semibold leading-tight text-[var(--quni-ink)] outline-none md:col-start-2"
        >
          {stepHeading(step)}
        </h1>

        <div className="min-w-0 md:col-start-1 md:row-span-4 md:row-start-1">
          <DemoPhone>
            <TourScreen step={step} onAccept={goNext} />
          </DemoPhone>
        </div>

        <div className="min-w-0 space-y-2 md:col-start-2">
          {captions.map((line) => (
            <p key={line} className="m-0 text-base leading-relaxed text-[var(--quni-ink-2)]">
              {line}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:col-start-2 [padding-bottom:max(var(--space-4),env(safe-area-inset-bottom,0px))]">
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
