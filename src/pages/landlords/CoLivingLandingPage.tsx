import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../../components/Seo'
import { SIGNUP_LISTING } from '../../components/marketing/coliving/tokens'
import PortfolioDashboardScene from '../../components/marketing/coliving/PortfolioDashboardScene'
import OperatorMoment from '../../components/marketing/coliving/OperatorMoment'

const ShortlistScene = lazy(() => import('../../components/marketing/coliving/ShortlistScene'))
const PaperworkScene = lazy(() => import('../../components/marketing/coliving/PaperworkScene'))
const BondRoutingScene = lazy(() => import('../../components/marketing/coliving/BondRoutingScene'))
const FeeMathSection = lazy(() => import('../../components/marketing/coliving/FeeMathSection'))
const ColivingFaq = lazy(() => import('../../components/marketing/coliving/ColivingFaq'))

function SceneFallback() {
  return (
    <div
      className="h-full min-h-[280px] w-full animate-pulse rounded-2xl bg-gray-100 sm:min-h-[320px]"
      aria-hidden
    />
  )
}

export default function CoLivingLandingPage() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <Seo
        title="Rent-by-the-room lifecycle for portfolio landlords"
        description="Quni runs the room lifecycle for rent-by-the-room landlords near Australian universities - verified applicants, correct agreements, correct bond routing, signed and filled. $99 Listing or 7% Managed."
        canonicalPath="/landlords/co-living"
      />

      {/* HERO */}
      <section className="border-b border-black/10 bg-[#FF6F61]">
        <div className="mx-auto max-w-site px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8 lg:pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0">
              <p className="mb-4 max-w-xl text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/70 sm:text-xs sm:tracking-[0.16em]">
                For rent-by-the-room portfolio operators
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Rent-by-the-room is a high-yield business. The admin shouldn&apos;t kill it.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                Flatmates finds you a stranger and leaves. Agents won&apos;t touch per-room lets. Quni
                runs the whole room lifecycle - verified applicant, correct agreement, correct bond
                handling, signed, filled.
              </p>
              <div className="mt-8">
                <Link
                  to={SIGNUP_LISTING}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/90 bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] shadow-md transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#FF6F61] sm:w-auto"
                >
                  Fill your next vacant room
                </Link>
              </div>
            </div>
            <div className="relative min-h-[300px] w-full sm:min-h-[360px]">
              <PortfolioDashboardScene />
            </div>
          </div>
        </div>
      </section>

      {/* FOUR OPERATOR MOMENTS */}
      <OperatorMoment
        eyebrow="Moment 01"
        title="A shortlist, not an inbox."
        body="ID verification, enrolment checks, and an AI fit assessment land as a shortlist - not forty Flatmates replies from people who ghost."
        tone="white"
        visual={
          <Suspense fallback={<SceneFallback />}>
            <ShortlistScene />
          </Suspense>
        }
      />

      <OperatorMoment
        eyebrow="Moment 02"
        title="Accept - the paperwork signs itself."
        body="The platform determines the legally correct document per arrangement, generates it, and e-signs it with every party."
        reverse
        tone="cream"
        visual={
          <Suspense fallback={<SceneFallback />}>
            <PaperworkScene />
          </Suspense>
        }
      />

      <OperatorMoment
        eyebrow="Moment 03"
        title="Bond handled correctly, every room."
        body="Each bond routed and receipted exactly as the law requires - lodged with the authority or held by the landlord, never by Quni."
        tone="soft"
        visual={
          <Suspense fallback={<SceneFallback />}>
            <BondRoutingScene />
          </Suspense>
        }
      />

      <OperatorMoment
        eyebrow="Moment 04"
        title="Every house, one screen."
        body="Duplicate a room across a house in one click; run every property from one dashboard; double-booking mechanically impossible."
        reverse
        tone="white"
        visual={<PortfolioDashboardScene expanded />}
      />

      <Suspense
        fallback={
          <div className="min-h-[480px] animate-pulse bg-white" aria-hidden />
        }
      >
        <FeeMathSection />
      </Suspense>

      <Suspense fallback={<div className="min-h-[320px] animate-pulse bg-[#FDF8F5]" aria-hidden />}>
        <ColivingFaq />
      </Suspense>
    </div>
  )
}
