import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { BOND_NEUTRAL_MARKETING } from '../lib/bondPublicCopy'
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
    description: 'Browse homes and message the landlord.',
  },
  {
    title: '2. Apply',
    description: 'Send a request. You pay Quni nothing. There is no deposit, bond, or rent payment to Quni.',
  },
  {
    title: '3. Sign and pay the landlord',
    description: `Sign the agreement. Pay bond and rent to the landlord at the account named in the agreement. ${BOND_NEUTRAL_MARKETING}`,
  },
]

const LISTING_LANDLORD: Step[] = [
  {
    title: '1. List for free',
    description:
      'Create your listing with AI-assisted tools. No upfront charge. You run bond, rent, and the day-to-day tenancy.',
  },
  {
    title: '2. Accept a booking',
    description:
      'Complete Stripe identity verification, then review the renter and confirm. The Listing acceptance fee is charged to your saved card when you accept (see Pricing). A Verified host badge appears once Stripe approves your account.',
  },
  {
    title: '3. Run the tenancy',
    description: 'Collect bond and rent directly from your renter. Quni does not hold tenancy funds.',
  },
]

export default function HowItWorks() {
  return (
    <>
      <Seo
        title="How it works - Quni Living"
        description="Find a place, sign the agreement, and pay the landlord directly. Renters pay Quni nothing."
        canonicalPath="/how-it-works"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-[#FFF7E6] font-inter text-[var(--quni-ink)] antialiased">
        <PageHeroBand
          title="How it works"
          subtitle="You find a place, sign the agreement, and pay the landlord directly."
        />

        <div className="max-w-site mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm leading-relaxed text-[var(--quni-ink-4)] sm:text-base">
              Renters pay <strong className="font-semibold text-gray-800">no</strong> booking, platform, service, or
              surcharge fees to Quni. Landlords pay the Listing acceptance fee when they accept a booking. Quni does
              not collect rent or bond.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <WhyQuniTrustBlock />
          </div>

          <section className="mx-auto mt-14 max-w-[1180px]">
            <h2 className="font-display text-center text-2xl font-bold text-[var(--quni-trust)] sm:text-3xl">Quni Listing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--quni-ink-4)]">
              You run the tenancy. Bond and rent stay between landlord and renter.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
              <FlowColumn
                heading="Renters"
                steps={LISTING_STUDENT}
                bgClass="bg-[var(--quni-coral-soft)]"
                accentClass="text-[#C8554A]"
              />
              <FlowColumn
                heading="Landlords"
                steps={LISTING_LANDLORD}
                bgClass="bg-[var(--quni-coral-soft)]"
                accentClass="text-[#C8554A]"
              />
            </div>
          </section>

          <div className="mx-auto mt-14 flex max-w-xl flex-col gap-3 text-center sm:flex-row sm:justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--quni-rust)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--quni-rust)] hover:bg-[rgba(216,90,48,0.06)]"
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
