import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { BOND_MANAGED_CONDUIT_SHORT, BOND_NEUTRAL_MARKETING } from '../lib/bondPublicCopy'
import { usePlatformFeatures } from '../context/PlatformFeaturesContext'
import {
  MANAGED_COMING_SOON_HEADLINE,
  MANAGED_COMING_SOON_SUBLINE,
  MANAGED_LISTING_DUAL_INTRO,
} from '../lib/managedComingSoonCopy'
import WhyQuniTrustBlock from '../components/WhyQuniTrustBlock'

type Step = { title: string; description: string }

function FlowColumn({ heading, steps, bgClass, accentClass }: { heading: string; steps: Step[]; bgClass: string; accentClass: string }) {
  return (
    <div className={`rounded-2xl p-7 shadow-md md:p-8 ${bgClass}`}>
      <h3 className={`font-display text-xl font-bold ${accentClass}`}>{heading}</h3>
      <ol className="mt-5 space-y-5">
        {steps.map((s, i) => (
          <li key={`${heading}-${i}-${s.title}`}>
            <p className="font-semibold text-gray-900">{s.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{s.description}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

const LISTING_STUDENT: Step[] = [
  {
    title: '1. Find your place',
    description: 'Browse Quni Listing homes and message landlords on-platform.',
  },
  {
    title: '2. Apply',
    description:
      'Authorise a refundable deposit hold only. You pay no booking fee, platform fee, service fee, or surcharge to Quni - ever.',
  },
  {
    title: '3. Complete tenancy directly',
    description: `Complete your lease and pay bond and rent directly with your landlord. ${BOND_NEUTRAL_MARKETING}`,
  },
]

const LISTING_LANDLORD: Step[] = [
  {
    title: '1. List for free',
    description:
      'Create your listing with AI-assisted tools - no upfront charge. Quni Listing is self-managed: you run bond, rent, and day-to-day tenancy.',
  },
  {
    title: '2. Accept a booking',
    description:
      'Complete Stripe identity verification, then review the renter and confirm. The flat Listing acceptance fee is charged to your saved card when you accept (see Pricing). A Verified host badge appears once Stripe approves your account.',
  },
  {
    title: '3. Run the tenancy',
    description: 'Collect bond and rent directly with your renter. Quni does not custody tenancy funds on Listing.',
  },
]

const MANAGED_STUDENT: Step[] = [
  {
    title: '1. Find your place',
    description: 'Browse Quni Managed listings where Quni supports the full tenancy journey.',
  },
  {
    title: '2. Apply',
    description:
      'Authorise a deposit hold only. You still pay no Quni booking, platform, service, or surcharge fees.',
  },
  {
    title: '3. Move in and pay rent',
    description: `${BOND_MANAGED_CONDUIT_SHORT} Weekly rent follows your tenancy terms and managed payment flows.`,
  },
]

const MANAGED_LANDLORD: Step[] = [
  {
    title: '1. List as Managed',
    description:
      'Choose Managed on the property when your state and property type support it. Other properties in your portfolio can stay on Listing.',
  },
  {
    title: '2. Confirm the booking',
    description:
      'Complete Stripe identity verification, then accept. The deposit is captured and weekly rent is set up on Connect (timing aligns with move-in where Stripe requires it).',
  },
  {
    title: '3. Receive rent weekly',
    description:
      'Quni retains the Managed service fee (percentage of weekly rent) via Connect; you receive the balance to your linked account.',
  },
]

export default function HowItWorks() {
  const { managedTierEnabled } = usePlatformFeatures()

  return (
    <>
      <Seo
        title="How it works - Quni Living"
        description={
          managedTierEnabled
            ? 'Quni Listing vs Quni Managed: parallel flows for renters and landlords.'
            : 'Quni Listing is live now. Quni Managed - full tenancy operations - coming within the next month.'
        }
        canonicalPath="/how-it-works"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-[#FFF7E6] font-inter text-[#1A1A1A] antialiased">
        <PageHeroBand
          title="How it works"
          subtitle={
            managedTierEnabled
              ? 'The same three-step shape - Listing and Managed, side by side.'
              : 'Quni Listing is live today. See how Managed will work when it launches within the next month.'
          }
        />

        <div className="max-w-site mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm leading-relaxed text-[#6B6B6B] sm:text-base">
              Renters pay <strong className="font-semibold text-gray-800">no</strong> booking, platform, service, or
              surcharge fees to Quni.{' '}
              {managedTierEnabled ? (
                <>
                  Landlords pick Listing (flat fee per accepted booking) or Managed (percentage of weekly rent){' '}
                  <strong className="font-semibold text-gray-800">per property</strong>, so a landlord can run a mix.
                </>
              ) : (
                <>{MANAGED_LISTING_DUAL_INTRO}</>
              )}
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <WhyQuniTrustBlock />
          </div>

          <section className="mx-auto mt-14 max-w-[1180px]">
            <h2 className="font-display text-center text-2xl font-bold text-[#376256] sm:text-3xl">Quni Listing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6B6B6B]">
              You run the tenancy. Bond and rent stay between landlord and renter.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
              <FlowColumn
                heading="Renters"
                steps={LISTING_STUDENT}
                bgClass="bg-[#FFF5F4]"
                accentClass="text-[#C8554A]"
              />
              <FlowColumn
                heading="Landlords"
                steps={LISTING_LANDLORD}
                bgClass="bg-[#FFF5F4]"
                accentClass="text-[#C8554A]"
              />
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-[1180px]">
            <h2 className="font-display text-center text-2xl font-bold text-[#376256] sm:text-3xl">Quni Managed</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6B6B6B]">
              {managedTierEnabled
                ? 'Quni supports escrow-style rent flows and lease execution where available. Availability varies by state.'
                : 'Preview the Managed flow - rent collection, bond coordination, and weekly payouts. Launching within the next month.'}
            </p>
            {!managedTierEnabled ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center px-4"
                aria-hidden
              >
                <div className="rounded-lg border border-[rgba(108,142,89,0.35)] bg-white px-5 py-3 text-center shadow-md">
                  <p className="font-lora text-base font-semibold text-[#376256]">{MANAGED_COMING_SOON_HEADLINE}</p>
                  <p className="mt-1 max-w-sm text-xs text-[#6B6B6B]">{MANAGED_COMING_SOON_SUBLINE}</p>
                </div>
              </div>
            ) : null}
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
              <FlowColumn
                heading="Renters"
                steps={MANAGED_STUDENT}
                bgClass="bg-[#F0F7F4]"
                accentClass="text-[#376256]"
              />
              <FlowColumn
                heading="Landlords"
                steps={MANAGED_LANDLORD}
                bgClass="bg-[#F0F7F4]"
                accentClass="text-[#376256]"
              />
            </div>
          </section>

          <div className="mx-auto mt-14 flex max-w-xl flex-col gap-3 text-center sm:flex-row sm:justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-[#D85A30] bg-transparent px-6 py-3 text-sm font-semibold text-[#D85A30] hover:bg-[rgba(216,90,48,0.06)]"
            >
              View pricing
            </Link>
            <Link
              to="/listings"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
