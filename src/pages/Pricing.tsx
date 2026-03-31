import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'

type FeeRowProps = {
  icon: string
  label: string
  description: string
  value: string
  valueColor?: string
}

type Step = {
  title: string
  description: string
}

const faqItems = [
  {
    question: 'Why do students pay a platform fee?',
    answer:
      "The 3% platform fee covers secure payment processing, booking management, and student support. It's charged weekly only when you have an active tenancy.",
  },
  {
    question: 'Is there a minimum lease length?',
    answer:
      'No — Quni supports flexible, short-term and long-term stays. Lease length is agreed between you and your landlord.',
  },
  {
    question: 'What happens if my booking is declined?',
    answer:
      'If a landlord declines your request, your full deposit is automatically refunded within 5-7 business days. The $49 booking fee is non-refundable.',
  },
  {
    question: 'Can I cancel my listing as a landlord?',
    answer:
      'Yes — there are no lock-in contracts. You can deactivate or remove your listing at any time from your dashboard.',
  },
  {
    question: 'How is my bond protected?',
    answer:
      'Your bond is held securely and must be lodged with the relevant state bond authority by your landlord within 10 business days of move-in. Quni does not hold bond money.',
  },
  {
    question: 'What is the acceptance fee?',
    answer:
      'The $29 acceptance fee is charged to landlords when they confirm a booking. It covers admin and platform costs associated with activating a tenancy.',
  },
] as const

const studentSteps: Step[] = [
  {
    title: '1. Find your place',
    description: 'Browse verified listings near your university',
  },
  {
    title: '2. Request to book',
    description: 'Pay a $49 booking fee + refundable deposit',
  },
  {
    title: '3. Move in',
    description: 'Your deposit is released to your landlord 24 hours after move-in',
  },
]

const landlordSteps: Step[] = [
  {
    title: '1. List for free',
    description: 'Create your listing in minutes — no upfront cost',
  },
  {
    title: '2. Confirm bookings',
    description: 'Review student profiles and accept or decline',
  },
  {
    title: '3. Get paid',
    description: 'Rent paid weekly via Stripe direct to your bank',
  },
]

function FeeRow({ icon, label, description, value, valueColor = 'text-[#FF6F61]' }: FeeRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-1" aria-hidden>
          {icon}
        </span>
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 max-w-[30ch]">{description}</p>
        </div>
      </div>
      <p className={`font-display text-3xl sm:text-4xl font-bold tabular-nums tracking-tight ${valueColor}`}>
        {value}
      </p>
    </div>
  )
}

function HowItWorksCard({
  title,
  steps,
  bgClass,
  accentClass,
}: {
  title: string
  steps: Step[]
  bgClass: string
  accentClass: string
}) {
  return (
    <div className={`rounded-2xl shadow-md p-7 md:p-8 ${bgClass}`}>
      <h3 className={`font-display text-2xl font-bold ${accentClass}`}>{title}</h3>
      <div className="mt-6 space-y-5">
        {steps.map((step) => (
          <div key={step.title}>
            <p className="font-semibold text-gray-900">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Pricing() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0)

  return (
    <>
      <Seo
        title="Pricing — Quni Living"
        description="Simple, transparent pricing for students and landlords. Booking fee, platform fee, and landlord service fees — no hidden charges."
        canonicalPath="/pricing"
      />

      <div className="flex-1 flex flex-col min-h-0 w-full bg-[#FEF9E4]">
        <PageHeroBand
          title="Simple, transparent pricing."
          subtitle="No hidden fees. You only pay when Quni is working for you."
          belowSubtitle={
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 overflow-hidden rounded-xl border border-white/25 bg-white/10 backdrop-blur-[1px]">
              <div className="px-4 py-3 text-white text-sm font-medium flex items-center justify-center gap-2 text-center">
                <span aria-hidden>🏠</span>
                <span>Free to list</span>
              </div>
              <div className="px-4 py-3 text-white text-sm font-medium flex items-center justify-center gap-2 text-center border-t sm:border-t-0 sm:border-l border-white/25">
                <span aria-hidden>💳</span>
                <span>No lock-in contracts</span>
              </div>
              <div className="px-4 py-3 text-white text-sm font-medium flex items-center justify-center gap-2 text-center border-t sm:border-t-0 sm:border-l border-white/25">
                <span aria-hidden>🔒</span>
                <span>Secure payments via Stripe</span>
              </div>
            </div>
          }
        />

        <section className="max-w-site mx-auto w-full px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[#FFF5F4] shadow-md">
              <div className="h-1 w-full shrink-0 bg-[#FF6F61]" aria-hidden />
              <div className="flex flex-1 flex-col p-7 md:p-8 min-h-0">
                <h2 className="font-display text-3xl font-bold text-gray-900">For Students</h2>
                <div className="mt-5">
                  <FeeRow
                    icon="✨"
                    label="Free to join"
                    description="No sign-up fee for students"
                    value="Free"
                  />
                  <FeeRow
                    icon="🎫"
                    label="Booking fee"
                    description="One-off booking processing fee"
                    value="$49"
                  />
                  <FeeRow
                    icon="📊"
                    label="Platform fee"
                    description="Charged weekly, only when you have an active booking"
                    value="3%"
                  />
                  <FeeRow
                    icon="🔐"
                    label="Bond"
                    description="Held securely via Stripe — released when you move out"
                    value="Varies"
                  />
                </div>
                <div className="mt-auto pt-7">
                  <Link
                    to="/properties"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FF6F61] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
                  >
                    Find a property
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[#F0F7F4] shadow-md">
              <div className="h-1 w-full shrink-0 bg-[#8FB9AB]" aria-hidden />
              <div className="flex flex-1 flex-col p-7 md:p-8 min-h-0">
                <h2 className="font-display text-3xl font-bold text-gray-900">For Landlords</h2>
                <div className="mt-5">
                  <FeeRow
                    icon="🏠"
                    label="List your property"
                    description="No credit card required"
                    value="Free"
                  />
                  <FeeRow
                    icon="💰"
                    label="Service fee"
                    description="Only charged when you have an active tenant"
                    value="8%"
                  />
                  <FeeRow
                    icon="✅"
                    label="Acceptance fee"
                    description="One-off per confirmed booking"
                    value="$29"
                  />
                  <FeeRow
                    icon="🔓"
                    label="No lock-in"
                    description="Cancel your listing any time"
                    value="Ever"
                  />
                </div>
                <div className="mt-auto pt-7">
                  <Link
                    to="/landlord-signup"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#8FB9AB] bg-white px-6 py-3 text-sm font-semibold text-[#376256] shadow-sm hover:bg-[#EAF4EF] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FB9AB]"
                  >
                    List your property
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-site mx-auto w-full px-6 py-6 md:py-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#FF6F61] text-center">How it works</h2>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <HowItWorksCard
              title="For students"
              steps={studentSteps}
              bgClass="bg-[#FFF5F4]"
              accentClass="text-[#C8554A]"
            />
            <HowItWorksCard
              title="For landlords"
              steps={landlordSteps}
              bgClass="bg-[#F0F7F4]"
              accentClass="text-[#376256]"
            />
          </div>
        </section>

        <section className="max-w-site mx-auto w-full px-6 py-12 md:py-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 text-center">
            Common questions
          </h2>
          <div className="mt-8 rounded-2xl bg-white shadow-md divide-y divide-stone-100">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-stone-50/70 transition-colors"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
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
                  {isOpen ? <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">{item.answer}</p> : null}
                </div>
              )
            })}
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
