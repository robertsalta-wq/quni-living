import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import {
  VerificationLandlordSection,
  VerificationStudentSection,
  VerificationWorkingTenantSection,
} from '../components/verification/verificationChecklistShared'

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
    a: "Yes. You can sign up and browse straight away. You'll need student verification before you can request to book on student-only listings, so it's worth getting your documents ready early.",
  },
  {
    q: 'Is my information safe?',
    a: 'Your documents are handled securely and used only to verify your account. Payment and identity checks run through trusted, encrypted providers.',
  },
  {
    q: 'Can I send a booking request before I\u2019m fully verified?',
    a: 'You can sign up and browse first. Student-only listings require full student verification before a request can go through. On listings open to non-students, a complete profile is required to request to book; photo ID and a supporting document complete identity verification shown to landlords.',
  },
] as const

export default function Verification() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
      <Seo
        title="What you'll verify on Quni"
        description="What renters and landlords verify before booking on Quni Listing. Free for renters; landlords pay $99 only when they accept."
        canonicalPath="/verification"
      />
      <PageHeroBand
        title="What you'll verify on Quni"
        subtitle="You can browse listings before you finish verification. Sign up and explore straight away. Renting is free for renters; landlords on Quni Listing pay a flat $99 only when they accept a booking."
      />

      <div className="max-w-site mx-auto w-full px-6 py-10 md:py-14">
        <div className="max-w-3xl">
          <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
            Quni verifies both sides of every booking so renters and landlords always know they&apos;re dealing with a
            real, accountable person. Here is exactly what you&apos;ll be asked for.
          </p>
        </div>

        <div className="sticky top-below-fixed-header z-40 -mx-6 mt-8 mb-10 border-b border-gray-200 bg-gray-50 px-6 py-4 shadow-sm md:top-24">
          <nav className="max-w-3xl flex flex-wrap gap-2" aria-label="Verification sections">
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
        </div>

        <div className="max-w-3xl space-y-14">
          <section aria-labelledby="renters-heading">
            <h2 id="renters-heading" className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
              For renters
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">
              What you complete depends on whether you&apos;re a student or a working tenant.
            </p>

            <div id="students" className="scroll-mt-32 md:scroll-mt-36 mt-10 space-y-4">
              <h3 className="font-display text-lg font-bold text-gray-900">If you&apos;re a student</h3>
              <VerificationStudentSection />
            </div>

            <div id="working-tenants" className="scroll-mt-32 md:scroll-mt-36 mt-10 space-y-4">
              <h3 className="font-display text-lg font-bold text-gray-900">
                If you&apos;re a working tenant or graduate
              </h3>
              <VerificationWorkingTenantSection />
            </div>

            <p className="mt-8 text-sm leading-relaxed text-gray-700">
              <strong className="font-semibold text-gray-900">Why we ask.</strong> A landlord is about to let you into
              their home. When they can see you&apos;re verified, they say yes faster and with more confidence. The work
              you do once carries across every listing you apply to.
            </p>
          </section>

          <section id="landlords" className="scroll-mt-32 md:scroll-mt-36" aria-labelledby="landlords-heading">
            <h2 id="landlords-heading" className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
              For landlords
            </h2>
            <VerificationLandlordSection />
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
