import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { PAGE_HERO_OUTER_CLASS } from '../components/PageHeroBand'
import { fetchPricingForPropertyTier, formatFeeForDisplay } from '../lib/pricing'

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
      <p className={`col-span-2 col-start-2 text-xs leading-normal ${descCls}`}>{description}</p>
    </div>
  )
}

export default function Pricing() {
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
        title="Pricing — Quni Living"
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

        <div className="mx-auto w-full max-w-[1180px] px-8 pb-20 pt-14">
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
                    description="Lodged with NSW Fair Trading or landlord. Quni never holds it."
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
                      description="You lodge with NSW Fair Trading yourself."
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

                  {/* TODO: Wire to resolveServiceTierAvailability so this stays correct as more states activate */}
                  <p className="mt-auto pt-2 text-xs italic text-[#6B6B6B]">Available everywhere</p>

                  <Link to="/landlord-signup" className={ctaSecondary}>
                    Choose Listing
                  </Link>
                </div>

                {/* Quni Managed */}
                <div className="flex flex-col px-7 pb-6 pt-7">
                  <div className="font-lora text-[22px] font-semibold text-[#1A1A1A]">Quni Managed</div>
                  <p className="mt-1.5 text-[13px] text-[#6B6B6B]">
                    We run the whole tenancy. From listing to move-out.
                  </p>

                  <div className="mt-[22px]">
                    <LineItem
                      icon={
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M3 7l5-4 5 4v6H3z" />
                          <path d="M6 13V9h4v4" />
                        </svg>
                      }
                      name="Service fee"
                      value={managedFeeText}
                      description="Of weekly rent. All-inclusive — no letting fees or extras. Only charged when you have an active tenant."
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
                      description="Lodged with NSW Fair Trading on your behalf."
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

                  {/* TODO: Wire to resolveServiceTierAvailability so this stays correct as more states activate */}
                  <p className="mt-auto pt-2 text-xs italic text-[#6B6B6B]">
                    Currently available in Queensland
                  </p>

                  <Link to="/landlord-signup" className={ctaPrimary}>
                    Choose Managed
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
