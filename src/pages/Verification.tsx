import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'

/**
 * v2 link surfaces (deferred): onboarding contextual "what this is for" links; pricing and
 * how-it-works links; guides hub card; homepage FAQ teaser; off-site email copy.
 */

const NAV_ITEMS = [
  { href: '#students', label: 'Students' },
  { href: '#working-tenants', label: 'Working tenants' },
  { href: '#landlords', label: 'Landlords' },
  { href: '#quick-answers', label: 'Quick answers' },
] as const

const TABLE_WRAP = 'overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm'
const TH =
  'border border-gray-100 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 sm:text-sm'
const TD = 'border border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700 align-top'

type VerificationStep = { step: string; what: ReactNode }

function VerificationTable({ rows }: { rows: VerificationStep[] }) {
  return (
    <div className={TABLE_WRAP}>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={TH} scope="col">
              Step
            </th>
            <th className={TH} scope="col">
              What it is
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.step}>
              <td className={`${TD} font-medium text-gray-900 whitespace-nowrap`}>{row.step}</td>
              <td className={TD}>{row.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const STUDENT_STEPS: VerificationStep[] = [
  { step: 'Confirm your email', what: 'Verify the address you signed up with.' },
  { step: 'Verify your university email', what: 'We send a one-time code to your university address.' },
  { step: 'Photo ID', what: 'A current government-issued ID.' },
  { step: 'Proof of enrolment', what: 'A recent enrolment document from your university.' },
]

const WORKING_TENANT_STEPS: VerificationStep[] = [
  { step: 'Confirm your email', what: 'Verify the address you signed up with.' },
  { step: 'Verify your work email', what: 'We send a one-time code to your work address.' },
  { step: 'Photo ID', what: 'A current government-issued ID.' },
  {
    step: 'An identity document',
    what: 'One supporting document that confirms who you are.',
  },
]

const LANDLORD_STEPS: VerificationStep[] = [
  { step: 'Confirm your email', what: 'Verify the address you signed up with.' },
  {
    step: 'Complete your profile',
    what: 'Your name, whether you\u2019re an individual, company or trust, your ABN, and contact details.',
  },
  {
    step: 'Agree to the terms',
    what: (
      <>
        <Link to="/terms" className="font-medium text-[#FF6F61] hover:underline">
          Terms of Use
        </Link>
        ,{' '}
        <Link to="/privacy" className="font-medium text-[#FF6F61] hover:underline">
          Privacy Policy
        </Link>
        , and the{' '}
        <Link to="/landlord-service-agreement" className="font-medium text-[#FF6F61] hover:underline">
          Landlord Service Agreement
        </Link>
        .
      </>
    ),
  },
  { step: 'Confirm your insurance', what: 'Confirm you hold appropriate cover for the property.' },
  {
    step: 'Add a payment card',
    what: 'For the $99-per-accepted-booking fee. You are not charged until you accept a tenant.',
  },
  {
    step: 'Verify your identity',
    what: 'Confirmed securely through payment setup before your first acceptance.',
  },
]

const QUICK_ANSWERS = [
  {
    q: 'Do renters pay anything?',
    a: 'No. Renting through Quni is always free, with no platform fee at any stage.',
  },
  {
    q: 'When does a landlord pay?',
    a: "Only when you accept a booking. It's a flat $99. Listing your property is free.",
  },
  {
    q: 'Why do you need my ID?',
    a: 'Because a tenancy agreement is a binding contract. Confirming identity on both sides means the person renting and the person letting are who they say they are.',
  },
  {
    q: "I don't have my enrolment document yet. Can I still start?",
    a: "Yes. You can sign up and browse straight away. You'll just need to finish verification before you send a booking request, so it's worth getting your documents ready early.",
  },
  {
    q: 'Is my information safe?',
    a: 'Your documents are handled securely and used only to verify your account. Payment and identity checks run through trusted, encrypted providers.',
  },
  {
    q: 'Can I send a booking request before I\u2019m fully verified?',
    a: 'You can sign up and browse, but verification needs to be complete before a request can go through. This keeps every booking between verified people.',
  },
] as const

export default function Verification() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
      <Seo
        title="What you'll verify on Quni"
        description="Exactly what renters and landlords verify before booking on Quni Listing — free for renters, $99 for landlords only when you accept."
        canonicalPath="/verification"
      />
      <PageHeroBand
        title="What you'll verify on Quni"
        subtitle="You can browse listings before you finish verification — sign up and explore straight away. Renting is free for renters; landlords on Quni Listing pay a flat $99 only when they accept a booking."
      />

      <div className="max-w-site mx-auto w-full px-6 py-10 md:py-14">
        <p className="mx-auto max-w-3xl text-sm leading-relaxed text-gray-700 sm:text-base">
          Quni verifies both sides of every booking so renters and landlords always know they&apos;re dealing with a
          real, accountable person. Here is exactly what you&apos;ll be asked for, and why it matters.
        </p>

        <nav
          className="sticky top-below-fixed-header z-30 -mx-6 mt-8 mb-10 flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 px-6 py-4 shadow-sm md:top-24"
          aria-label="Verification sections"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:border-[#FF6F61]/40 hover:text-[#FF6F61] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mx-auto max-w-3xl space-y-14">
          <section aria-labelledby="renters-heading">
            <h2 id="renters-heading" className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
              For renters
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">
              Renting through Quni is free. You will never pay a platform fee. Verification exists to protect you and
              to get you a faster yes from landlords, not to charge you.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">
              What you complete depends on whether you&apos;re a student or a working tenant.
            </p>

            <div id="students" className="scroll-mt-32 md:scroll-mt-36 mt-10 space-y-4">
              <h3 className="font-display text-lg font-bold text-gray-900">If you&apos;re a student</h3>
              <VerificationTable rows={STUDENT_STEPS} />
              <p className="text-sm leading-relaxed text-gray-700">
                This unlocks full access to every student listing and the ability to send a booking request.
              </p>
            </div>

            <div id="working-tenants" className="scroll-mt-32 md:scroll-mt-36 mt-10 space-y-4">
              <h3 className="font-display text-lg font-bold text-gray-900">
                If you&apos;re a working tenant or graduate
              </h3>
              <VerificationTable rows={WORKING_TENANT_STEPS} />
              <p className="text-sm leading-relaxed text-gray-700">
                This unlocks access to listings open to non-students and the ability to send a booking request.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[#FF6F61]/20 bg-[#FF6F61]/5 px-5 py-4 sm:px-6">
              <p className="text-sm leading-relaxed text-gray-800">
                Before you send your first booking request, you&apos;ll also fill in a short profile: your name, phone,
                budget, and move-in date. It takes a couple of minutes.
              </p>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-gray-700">
              <strong className="font-semibold text-gray-900">Why we ask.</strong> A landlord is about to let you into
              their home. When they can see you&apos;re verified, they say yes faster and with more confidence. The work
              you do once carries across every listing you apply to.
            </p>
          </section>

          <section id="landlords" className="scroll-mt-32 md:scroll-mt-36" aria-labelledby="landlords-heading">
            <h2 id="landlords-heading" className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
              For landlords
            </h2>
            <p className="mt-3 text-sm font-semibold text-gray-900 sm:text-base">
              List for free. Get verified renters. Accept in a tap.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">
              Quni Listing is free to list. You pay a flat $99 only when you accept a booking. Nothing is charged
              before that. Here is what you set up once.
            </p>
            <div className="mt-6">
              <VerificationTable rows={LANDLORD_STEPS} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              Once that&apos;s done you can publish listings, receive booking requests from verified renters, and accept
              with the tenancy agreement and e-signing handled inside Quni.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-gray-700">
              <strong className="font-semibold text-gray-900">Why we ask.</strong> Verifying you protects renters and
              keeps every agreement on the platform legally sound. It is also what lets the booking, the agreement, and
              signing all happen in one place instead of chasing paperwork.
            </p>
          </section>

          <section id="quick-answers" className="scroll-mt-32 md:scroll-mt-36" aria-labelledby="quick-answers-heading">
            <h2 id="quick-answers-heading" className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
              Quick answers
            </h2>
            <dl className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
              {QUICK_ANSWERS.map((item) => (
                <div key={item.q} className="px-5 py-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-900 sm:text-base">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
