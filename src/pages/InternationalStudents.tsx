import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import WhyQuniTrustBlock from '../components/WhyQuniTrustBlock'
import { INTERNATIONAL_STUDENTS } from '../lib/dataResidencyCopy'

export default function InternationalStudents() {
  return (
    <>
      <Seo
        title="International students - Quni Living"
        description="Quni Living is an Australian verified accommodation marketplace. Your account, verification documents, and tenancy data are stored in Australia."
        canonicalPath="/international"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-gray-50">
        <PageHeroBand
          title={INTERNATIONAL_STUDENTS.title}
          subtitle="Australian platform, Australian storage, Australian law"
        />

        <div className="max-w-site mx-auto w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <article className="mx-auto max-w-3xl space-y-10">
            <p className="text-base leading-relaxed text-gray-700 sm:text-lg">{INTERNATIONAL_STUDENTS.body}</p>

            <WhyQuniTrustBlock />

            <section className="rounded-2xl border border-[var(--quni-trust-bg)] bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
                Your rights when renting in Australia
              </h2>
              <p className="mt-3 text-base leading-relaxed text-gray-700">
                Wondering whether a landlord can turn you away because you are an international student? Australian
                anti-discrimination law generally says no. Read our guide on what is lawful, what is not, and how Quni
                enforces fair housing on the platform.
              </p>
              <Link
                to="/guides/can-a-landlord-refuse-international-students-australia"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--quni-coral-hover)] focus:outline-none focus:ring-2 focus:ring-admin-coral/40 focus:ring-offset-2"
              >
                Can a landlord refuse international students?
              </Link>
            </section>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/student-accommodation"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--quni-coral-hover)] focus:outline-none focus:ring-2 focus:ring-admin-coral/40 focus:ring-offset-2"
              >
                Browse by university
              </Link>
              <Link
                to="/listings"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Search listings
              </Link>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
