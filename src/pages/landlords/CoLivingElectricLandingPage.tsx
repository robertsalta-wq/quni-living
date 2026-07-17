import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../../components/Seo'
import SiteBrandLockup from '../../components/SiteBrandLockup'
import MeshBackground from '../../components/marketing/coliving-electric/MeshBackground'
import GlowCta from '../../components/marketing/coliving-electric/GlowCta'
import PortfolioDashboardScene from '../../components/marketing/coliving-electric/PortfolioDashboardScene'
import OperatorMoment from '../../components/marketing/coliving-electric/OperatorMoment'

const ShortlistScene = lazy(
  () => import('../../components/marketing/coliving-electric/ShortlistScene'),
)
const PaperworkScene = lazy(
  () => import('../../components/marketing/coliving-electric/PaperworkScene'),
)
const BondRoutingScene = lazy(
  () => import('../../components/marketing/coliving-electric/BondRoutingScene'),
)
const FeeMathSection = lazy(
  () => import('../../components/marketing/coliving-electric/FeeMathSection'),
)
const ColivingFaq = lazy(() => import('../../components/marketing/coliving-electric/ColivingFaq'))

function SceneFallback() {
  return (
    <div
      className="h-full min-h-[280px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/5 sm:min-h-[320px]"
      aria-hidden
    />
  )
}

export default function CoLivingElectricLandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <Seo
        title="Co-living landlord platform"
        description="The full room lifecycle for co-living investors: verified applicants, correct agreements, correct bond handling. $99 flat or 7% Managed."
        canonicalPath="/landlords/co-living-electric"
        noindex
      />

      <MeshBackground />

      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-site items-center justify-between gap-3 px-3 py-4 sm:px-6">
          <SiteBrandLockup variant="ai" />
          <GlowCta className="!w-auto !px-4 !py-2 !text-xs sm:!text-sm" />
        </div>
      </header>

      <div className="relative z-10">
        {/* HERO */}
        <section className="border-b border-white/10">
          <div className="mx-auto max-w-site px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8 lg:pb-24">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="min-w-0">
                <p className="mb-4 max-w-xl bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300 bg-clip-text text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] text-transparent sm:text-xs sm:tracking-[0.18em]">
                  For co-living landlords
                </p>
                <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                  Rent-by-the-room is a high-yield business. The{' '}
                  <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                    admin
                  </span>{' '}
                  shouldn&apos;t{' '}
                  <span className="bg-gradient-to-r from-orange-400 via-fuchsia-500 to-violet-500 bg-clip-text italic text-transparent">
                    kill it
                  </span>
                  .
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  Flatmates finds you a stranger and leaves. Agents won&apos;t touch co-living
                  room-by-room. Quni runs the whole room lifecycle - verified applicant, correct
                  agreement, correct bond handling, signed, filled.
                </p>
                <div className="mt-8">
                  <GlowCta />
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Prefer the brand version?{' '}
                  <Link to="/landlords/co-living" className="text-cyan-300 underline-offset-2 hover:underline">
                    View coral landing
                  </Link>
                </p>
              </div>
              <div className="relative min-h-[300px] w-full sm:min-h-[360px]">
                <PortfolioDashboardScene />
              </div>
            </div>
          </div>
        </section>

        <OperatorMoment
          eyebrow="Moment 01"
          title="A shortlist, not an inbox."
          body="ID verification, enrolment checks, and an AI fit assessment land as a shortlist - not forty Flatmates replies from people who ghost."
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
          visual={<PortfolioDashboardScene expanded />}
        />

        <Suspense fallback={<div className="min-h-[480px] animate-pulse bg-slate-950" aria-hidden />}>
          <FeeMathSection />
        </Suspense>

        <Suspense fallback={<div className="min-h-[320px] animate-pulse bg-slate-950" aria-hidden />}>
          <ColivingFaq />
        </Suspense>

        <footer className="relative z-10 border-t border-white/10 px-4 py-8 text-center text-xs text-slate-500">
          Visual exploration · same copy as{' '}
          <Link to="/landlords/co-living" className="text-slate-400 underline-offset-2 hover:underline">
            /landlords/co-living
          </Link>
        </footer>
      </div>
    </div>
  )
}
