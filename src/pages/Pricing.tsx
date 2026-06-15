import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { PAGE_HERO_OUTER_CLASS } from '../components/PageHeroBand'
import { BOND_NEUTRAL_PRICING_SHORT, BOND_FAQ_HOW_HANDLED } from '../lib/bondPublicCopy'
import { pricingTierAvailabilitySummary } from '../lib/pricingAvailabilityFootnote'
import { fetchPricingForPropertyTier, formatFeeForDisplay } from '../lib/pricing'
import { usePlatformFeatures, useServiceTierResolverOptions } from '../context/PlatformFeaturesContext'
import {
  MANAGED_COMING_SOON_HEADLINE,
  MANAGED_COMING_SOON_SUBLINE,
} from '../lib/managedComingSoonCopy'

type LineTone = 'default' | 'muted'
type ValueKind = 'coralLg' | 'coralSm' | 'mutedSm'

function LineItem({
  icon,
  name,
  value,
  description,
  tone = 'default',
  valueKind,
}: {
  icon: ReactNode
  name: string
  value: string
  description: string
  tone?: LineTone
  valueKind: ValueKind
}) {
  const muted = tone === 'muted'
  const iconWrap = muted ? 'text-[#B5B5B5]' : 'text-[#D85A30]'
  const nameCls = muted ? 'text-[#9A9A9A]' : 'text-[#1A1A1A]'
  const descCls = muted ? 'text-[#9A9A9A]' : 'text-[#6B6B6B]'
  const valueCls =
    valueKind === 'coralLg'
      ? 'font-lora text-lg font-semibold text-[#D85A30]'
      : valueKind === 'coralSm'
        ? 'font-lora text-sm font-semibold text-[#D85A30]'
        : 'font-lora text-sm font-semibold text-[#B5B5B5]'

  return (
    <div className="mb-[18px] grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4 ${iconWrap}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className={`text-sm font-medium ${nameCls}`}>{name}</div>
      <div className={`whitespace-nowrap leading-none ${valueCls}`}>{value}</div>
      <p className={`col-span-2 col-start-2 text-[13px] leading-snug ${descCls}`}>{description}</p>
    </div>
  )
}

type FaqItem = { id: string; question: string; answer: ReactNode }
type FaqBucket = { id: string; label: string; items: FaqItem[] }

const faqBuckets: FaqBucket[] = [
  {
    id: 'money-fees',
    label: 'Money & fees',
    items: [
      {
        id: 'money-fees-0',
        question: 'Do renters pay any fees to Quni?',
        answer:
          'No. Renters pay no booking fee, platform fee, service fee, or surcharge to Quni - ever. Bond and weekly rent are tenancy money, not Quni fees.',
      },
      {
        id: 'money-fees-1',
        question: 'What does a landlord pay on Quni Listing?',
        answer:
          'A flat acceptance fee per accepted booking (amount shown above; fees may change with notice). Renters do not pay this fee.',
      },
      {
        id: 'money-fees-2',
        question: 'What does a landlord pay on Quni Managed?',
        answer:
          'A percentage of weekly rent while the tenancy is active, collected via Stripe Connect as part of rent payouts - shown above as the Managed service fee.',
      },
      {
        id: 'money-fees-3',
        question: 'Is there a card surcharge?',
        answer:
          'Optional card surcharge may apply when paying by card where Stripe applies it. Free bank transfer is offered where available.',
      },
    ],
  },
  {
    id: 'bond-compliance',
    label: 'Bond & compliance',
    items: [
      {
        id: 'bond-compliance-0',
        question: 'How is bond handled?',
        answer: BOND_FAQ_HOW_HANDLED,
      },
      {
        id: 'bond-compliance-1',
        question: 'Who sets bond refund rules?',
        answer:
          'Cash bond refunds and disputes follow state or territory residential laws and bond authorities - not Quni’s refund policy for platform fees.',
      },
    ],
  },
  {
    id: 'bookings-cancellations',
    label: 'Bookings & cancellations',
    items: [
      {
        id: 'bookings-cancellations-0',
        question: 'Is there a minimum lease length?',
        answer:
          'No - Quni supports flexible, short-term and long-term stays where landlords offer them. Lease length is agreed between you and your landlord.',
      },
      {
        id: 'bookings-cancellations-1',
        question: 'What if my booking is declined?',
        answer:
          'If a landlord declines your request, any authorised deposit hold is released or refunded per automated flows - typically 5–7 business days to your card or bank.',
      },
      {
        id: 'bookings-cancellations-2',
        question: 'Can I cancel my listing as a landlord?',
        answer:
          'Yes - there are no lock-in contracts. You can deactivate or remove your listing from your dashboard.',
      },
    ],
  },
  {
    id: 'listing-managed',
    label: 'Listing vs Managed',
    items: [
      {
        id: 'listing-managed-0',
        question: 'What is the difference between Quni Listing and Quni Managed?',
        answer:
          'Listing: landlord pays a flat fee per accepted booking and runs bond and rent directly with the renter. Managed: landlord pays a percentage of weekly rent while active; tenancy money may pass briefly through Quni before Stripe Connect payout; availability varies by state.',
      },
      {
        id: 'listing-managed-1',
        question: 'Where is each tier available?',
        answer:
          'See the availability lines under each landlord column on this page - they reflect Queensland, New South Wales, and Victoria for typical private-room listings.',
      },
      {
        id: 'listing-managed-2',
        question: 'Do I have to pick the same tier for every property?',
        answer:
          'No. Each property you list carries its own Quni service model. You can run one property as Quni Listing and another as Quni Managed in the same account. Listing properties can be upgraded to Managed later (for example, when accepting a booking), but Managed properties cannot move back to Listing.',
      },
    ],
  },
  {
    id: 'support-disputes',
    label: 'Support & disputes',
    items: [
      {
        id: 'support-disputes-0',
        question: 'Something went wrong with my tenancy - can Quni decide bond disputes?',
        answer: (
          <>
            Bond and tenancy disputes are between the parties or resolved through the relevant state tribunal. Quni may
            help with platform or payment administration where it custodies funds; see our{' '}
            <Link to="/refunds" className="font-medium text-[#FF6F61] underline hover:opacity-90">
              Refund Policy
            </Link>{' '}
            for money Quni actually receives.
          </>
        ),
      },
      {
        id: 'support-disputes-1',
        question: 'Who do I contact?',
        answer: 'Email hello@quni.com.au - we respond as soon as we can.',
      },
    ],
  },
]

export default function Pricing() {
  const { managedTierEnabled } = usePlatformFeatures()
  const serviceTierOptions = useServiceTierResolverOptions()
  const [openFaqId, setOpenFaqId] = useState<string | null>('money-fees-0')
  const [listingFeeText, setListingFeeText] = useState('$99')
  const [managedFeeText, setManagedFeeText] = useState('7%')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const listingCell = await fetchPricingForPropertyTier('t2', 'listing')
        const managedCell = await fetchPricingForPropertyTier('t2', 'managed')
        const listing = formatFeeForDisplay(listingCell)
        const managed = formatFeeForDisplay(managedCell)
        if (!cancelled) {
          setListingFeeText(listing.landlordFeeDisplay)
          setManagedFeeText(managed.landlordFeeDisplay)
        }
      } catch {
        // Keep defaults when pricing endpoint is unavailable.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ctaPrimary =
    'mt-4 flex w-full items-center justify-center rounded-[10px] bg-[#D85A30] px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-[#993C1D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D85A30]'
  const ctaSecondary =
    'mt-4 flex w-full items-center justify-center rounded-[10px] border border-[#D85A30] bg-transparent px-3 py-3 text-sm font-medium text-[#D85A30] transition-colors hover:bg-[rgba(216,90,48,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D85A30]'

  return (
    <>
      <Seo
        title="Pricing - Quni Living"
        description="Free for renters. Free to list for landlords. Choose Listing or Managed pricing."
        canonicalPath="/pricing"
      />

      <div className="flex min-h-0 w-full flex-1 flex-col bg-[#FFF7E6] font-inter text-[#1A1A1A] antialiased">
        <div className={PAGE_HERO_OUTER_CLASS}>
          <div className="max-w-site mx-auto w-full px-4 py-7 text-center sm:px-6 lg:px-8">
            <p className="m-0 text-[15px] text-white opacity-[0.96]">
              No hidden fees. You only pay when Quni is working for you.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3.5">
              <div className="rounded-[10px] border border-white/[0.32] bg-white/[0.15] px-5 py-2.5 text-[13px] font-medium text-white">
                Free for renters
              </div>
              <div className="rounded-[10px] border border-white/[0.32] bg-white/[0.15] px-5 py-2.5 text-[13px] font-medium text-white">
                Free to list
              </div>
              <div className="rounded-[10px] border border-white/[0.32] bg-white/[0.15] px-5 py-2.5 text-[13px] font-medium text-white">
                No lock-in contracts
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1180px] px-8 pb-12 pt-14 md:pb-16">
          <h1 className="m-0 mb-2.5 text-center font-lora text-[38px] font-semibold tracking-[-0.01em] text-[#1A1A1A]">
            Pricing
          </h1>
          <p className="m-0 mb-12 text-center text-base text-[#6B6B6B]">
            Free for renters. Free to list for landlords. Choose how much you want Quni to do.
          </p>

          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_2fr]">
            {/* Renters */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(216,90,48,0.2)] bg-[#FFF1EB]">
              <div className="border-b border-[rgba(216,90,48,0.18)] bg-[rgba(216,90,48,0.06)] px-8 py-5 font-lora text-[22px] font-semibold text-[#1A1A1A]">
                For renters
              </div>
              <div className="flex flex-1 flex-col px-7 pb-6 pt-7">
                <div className="font-lora text-[22px] font-semibold text-[#1A1A1A]">Free</div>
                <p className="mt-1.5 text-[13px] text-[#6B6B6B]">
                  Always. Whether you&apos;re a student or a professional near campus.
                </p>

                <div className="mt-[22px]">
                  <LineItem
                    icon={
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <circle cx="7" cy="7" r="4" />
                        <path d="m10 10 4 4" />
                      </svg>
                    }
                    name="Browse listings"
                    value="Free"
                    description="Search every verified room near your university or workplace."
                    valueKind="coralLg"
                  />
                  <LineItem
                    icon={
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path d="M3 4h10v8H3z" />
                        <path d="M3 4l5 4 5-4" />
                      </svg>
                    }
                    name="Book a room"
                    value="Free"
                    description="No booking fees, platform fees, or surcharges. Ever."
                    valueKind="coralLg"
                  />
                  <LineItem
                    icon={
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path d="M2 4h12v8H6l-3 3v-3H2z" />
                      </svg>
                    }
                    name="Message landlords"
                    value="Free"
                    description="Talk to landlords directly from any listing."
                    valueKind="coralLg"
                  />
                  <LineItem
                    icon={
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <rect x="3" y="7" width="10" height="7" rx="1" />
                        <path d="M5 7V4a3 3 0 0 1 6 0v3" />
                      </svg>
                    }
                    name="Bond"
                    value="Varies"
                    description={BOND_NEUTRAL_PRICING_SHORT}
                    valueKind="coralSm"
                  />
                </div>

                <p className="mt-auto pt-2 text-xs italic leading-normal text-[#6B6B6B]">
                  Optional card surcharge if you pay rent by card. Free bank transfer always offered.
                </p>

                <Link to="/properties" className={ctaSecondary}>
                  Find a room →
                </Link>
              </div>
            </div>

            {/* Landlords */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(108,142,89,0.22)] bg-[#E8EFE3]">
              <div className="border-b border-[rgba(108,142,89,0.22)] bg-[rgba(108,142,89,0.10)] px-8 py-5 font-lora text-[22px] font-semibold text-[#1A1A1A]">
                For landlords
              </div>

              <div className="grid flex-1 grid-cols-1 divide-y divide-[rgba(108,142,89,0.2)] md:grid-cols-2 md:divide-x md:divide-y-0 md:divide-[rgba(108,142,89,0.2)]">
                {/* Quni Listing */}
                <div className="flex flex-col px-7 pb-6 pt-7">
                  <div className="font-lora text-[22px] font-semibold text-[#1A1A1A]">Quni Listing</div>
                  <p className="mt-1.5 text-[13px] text-[#6B6B6B]">
                    List your room and find a tenant. You run the tenancy.
                  </p>

                  <div className="mt-[22px]">
                    <LineItem
                      icon={
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M2 6l6-4 6 4v8H2z" />
                          <path d="M6 14V9h4v5" />
                        </svg>
                      }
                      name="Listing fee"
                      value={listingFeeText}
                      description="One-off, only when you accept a tenant. No subscription."
                      valueKind="coralLg"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Verified renters"
                      value="Included"
                      description="Students and professionals with verified identity."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="AI listing tools"
                      value="Included"
                      description="Description, pricing, and enquiry-reply helpers."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Tenancy documents"
                      value="Included"
                      description="FT6600 + Quni Addendum, signed in-platform."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                        >
                          <line x1="4" y1="4" x2="12" y2="12" />
                          <line x1="12" y1="4" x2="4" y2="12" />
                        </svg>
                      }
                      name="Rent collection"
                      value="Self-managed"
                      description="Tenant pays you directly. Quni never touches the money."
                      tone="muted"
                      valueKind="mutedSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                        >
                          <line x1="4" y1="4" x2="12" y2="12" />
                          <line x1="12" y1="4" x2="4" y2="12" />
                        </svg>
                      }
                      name="Bond lodgement"
                      value="Self-managed"
                      description="You lodge bond under state rules with your renter. Quni does not hold bond money."
                      tone="muted"
                      valueKind="mutedSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                        >
                          <line x1="4" y1="4" x2="12" y2="12" />
                          <line x1="12" y1="4" x2="4" y2="12" />
                        </svg>
                      }
                      name="Disputes & maintenance"
                      value="Self-managed"
                      description="You handle directly with your tenant."
                      tone="muted"
                      valueKind="mutedSm"
                    />
                  </div>

                  <p className="mt-auto pt-2 text-xs italic leading-snug text-[#6B6B6B]">
                    {pricingTierAvailabilitySummary('listing', serviceTierOptions)}
                  </p>

                  <Link to="/landlord-signup?tier=listing" className={ctaSecondary}>
                    Choose Listing
                  </Link>
                </div>

                {/* Quni Managed */}
                <div className="flex flex-col px-7 pb-6 pt-7">
                  <div className="font-lora text-[22px] font-semibold text-[#1A1A1A]">Quni Managed</div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#6B6B6B]">
                    We run the whole tenancy. From listing to move-out.
                  </p>
                  {!managedTierEnabled ? (
                    <div
                      className="mt-3 rounded-lg border border-[rgba(108,142,89,0.35)] bg-white px-3.5 py-2.5"
                      role="status"
                    >
                      <p className="font-lora text-sm font-semibold text-[#376256]">{MANAGED_COMING_SOON_HEADLINE}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-[#6B6B6B]">{MANAGED_COMING_SOON_SUBLINE}</p>
                    </div>
                  ) : null}

                  <div className={managedTierEnabled ? 'mt-[22px]' : 'mt-4'}>
                    <LineItem
                      icon={
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M3 7l5-4 5 4v6H3z" />
                          <path d="M6 13V9h4v4" />
                        </svg>
                      }
                      name="Service fee"
                      value={managedFeeText}
                      description="Of weekly rent. All-inclusive - no letting fees or extras. Only charged when you have an active tenant."
                      valueKind="coralLg"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Everything in Listing"
                      value="Included"
                      description="Verified renters, AI tools, tenancy documents, e-signing."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Rent collection"
                      value="Included"
                      description="Tenant pays Quni. We pay you weekly via Stripe."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Bond lodgement"
                      value="Included"
                      description="We coordinate lodgement with the bond authority where your tenancy requires it. Bond remains tenancy money - not a Quni fee."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Dispute support"
                      value="Included"
                      description="We mediate between you and your tenant."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Move-in protection"
                      value="Included"
                      description="Funds held until tenant moves in safely."
                      valueKind="coralSm"
                    />
                    <LineItem
                      icon={
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      }
                      name="Maintenance routing"
                      value="Included"
                      description="Tenant requests routed to you, tracked in-platform."
                      valueKind="coralSm"
                    />
                  </div>

                  <p className="mt-auto pt-2 text-xs italic leading-snug text-[#6B6B6B]">
                    {pricingTierAvailabilitySummary('managed', serviceTierOptions)}
                  </p>

                  {managedTierEnabled ? (
                    <Link to="/landlord-signup?tier=managed" className={ctaPrimary}>
                      Choose Managed
                    </Link>
                  ) : (
                    <span
                      className={`${ctaPrimary} pointer-events-none cursor-not-allowed bg-[#9A9A9A] hover:bg-[#9A9A9A]`}
                      aria-disabled="true"
                    >
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="max-w-site mx-auto w-full px-6 py-10 md:py-12">
          <h2 className="font-display text-center text-3xl font-bold text-[#FF6F61] sm:text-4xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6B6B6B]">
            {managedTierEnabled
              ? 'Parallel flows for Quni Listing and Quni Managed - three steps each for renters and landlords.'
              : 'Quni Listing is live now. Compare both tiers - Quni Managed launches within the next month.'}
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
            >
              See Listing vs Managed flows →
            </Link>
          </div>
        </section>

        <section className="max-w-site mx-auto w-full px-6 py-12 md:py-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 text-center">
            Common questions
          </h2>
          <div className="mt-8 space-y-10 rounded-2xl bg-white p-4 shadow-md sm:p-6 md:p-8">
            {faqBuckets.map((bucket) => (
              <div key={bucket.id}>
                <h3 className="border-b border-stone-100 pb-2 font-display text-lg font-bold text-[#376256]">
                  {bucket.label}
                </h3>
                <div className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-100">
                  {bucket.items.map((item) => {
                    const isOpen = openFaqId === item.id
                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50/70 sm:px-5"
                          onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                          aria-expanded={isOpen}
                        >
                          <span className="font-semibold text-gray-900">{item.question}</span>
                          <svg
                            className={`h-5 w-5 shrink-0 text-[#FF6F61] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {isOpen ? (
                          <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600 sm:px-5">{item.answer}</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full bg-[#FF6F61]">
          <div className="max-w-site mx-auto px-6 py-12 md:py-14 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Ready to find your place?</h2>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/properties"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] border border-white hover:bg-white/95 transition-colors"
              >
                Find a property
                <span aria-hidden>→</span>
              </Link>
              <Link
                to="/landlord-signup"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                List your property
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
