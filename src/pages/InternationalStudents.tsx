import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import WhyQuniTrustBlock from '../components/WhyQuniTrustBlock'
import { INTERNATIONAL_STUDENTS } from '../lib/dataResidencyCopy'

export default function InternationalStudents() {
  return (
    <>
      <Seo
        title="International students — Quni Living"
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

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/student-accommodation"
                className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e85d52] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2"
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
