import { Link } from 'react-router-dom'
import ServicePageLayout from '../../components/ServicePageLayout'

const CHECKLIST = [
  'Student screening & placement',
  'Rent and bond management',
  'Property condition oversight',
  'Tenant issues & escalation',
  'Ongoing reporting and visibility',
] as const

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function LandlordPartnerships() {
  return (
    <ServicePageLayout
      title="Landlord Partnerships"
      subtitle="More income. Less vacancy. Predictable returns — student accommodation with a structured, numbers-driven approach."
      relatedMode="newest"
      contentVariant="fullBleed"
    >
      {/* Opening statement */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-10 md:py-12 text-center">
          <p className="text-xl sm:text-2xl text-gray-800 font-medium leading-relaxed">
            Partner with Quni Living to reach serious student tenants across Sydney. We help you keep occupancy steadier near
            campuses and run proper leases — not short-stay chaos — whether you list a whole home or individual rooms.
          </p>
        </div>
        <div className="max-w-site mx-auto px-6 pb-10 md:pb-12">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200"
            alt=""
            className="rounded-2xl object-cover h-64 w-full mt-8"
          />
        </div>
      </section>

      {/* The numbers that matter — stat cards */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-site mx-auto px-6 py-10 md:py-12">
          <p className="text-center text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#FF6F61] mb-2">
            Why rent to students
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 text-center tracking-tight mb-6">
            The numbers that matter
          </h2>
          <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-display text-lg font-bold text-[#FF6F61]">Yield</h3>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Choose whole-property stability or room-by-room optimisation. Pricing is structured for consistent cash flow.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-display text-lg font-bold text-[#FF6F61]">Vacancy</h3>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Built around demand near universities — recurring student interest and longer stays improve occupancy
                stability.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-display text-lg font-bold text-[#FF6F61]">Predictability</h3>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Clear weekly rent, documented house rules and standards, and one professional manager overseeing the process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why explore — callout */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-site mx-auto px-6 pt-10 md:pt-12 pb-0">
          <div className="max-w-3xl mx-auto rounded-2xl border border-[#FF6F61]/20 bg-gradient-to-br from-[#FF6F61]/[0.06] to-white px-6 py-8 sm:px-10 sm:py-10 shadow-sm">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left">
              Why explore renting to students?
            </h2>
            <p className="mt-4 text-gray-700 leading-relaxed text-center sm:text-left">
              Student demand near universities is recurring; tenancies are often medium-to-longer stays, which can mean fewer
              gaps between renters and rent that reflects real market demand. If you want clear weekly numbers, professional
              oversight, and leases (not Airbnb-style turnover), the sections below spell out how that works — and you can
              talk to us anytime with no obligation.
            </p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:opacity-95 transition-opacity"
              >
                Speak with Quni
              </Link>
              <Link
                to="/landlord-signup"
                className="inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-900 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Become a partner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process line */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 pb-8 pt-0 text-center">
          <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
            We focus on the property, the tenants, and protecting your asset — with one clear process instead of juggling
            multiple informal arrangements.
          </p>
        </div>
      </section>

      {/* Leasing models + whole-property detail */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-site mx-auto px-6 py-10 md:py-12">
          <div className="grid lg:grid-cols-2 lg:gap-8 lg:items-stretch">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center lg:text-left mb-2">
                How would you like to rent your property?
              </h2>
              <p className="text-center lg:text-left text-gray-600 max-w-2xl lg:max-w-none mx-auto lg:mx-0 mb-6">
                Two common models — we assess layout, location, and demand before recommending the best fit.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 mb-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                  <h3 className="font-display text-lg font-semibold text-gray-900">Whole property</h3>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    Familiar single-lease structure with strong student demand and typically lower vacancy than ad-hoc letting.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                  <h3 className="font-display text-lg font-semibold text-gray-900">By the room</h3>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    Flexible leasing so total weekly income can align with your goals and the property layout.
                  </p>
                </div>
              </div>
              <div className="max-w-2xl lg:max-w-none">
                <h3 className="font-display text-lg font-bold text-gray-900">Whole-property student leasing</h3>
                <p className="mt-2 text-gray-700">Ideal if you want traditional leasing with stronger demand and fewer empty weeks.</p>
                <ul className="mt-3 space-y-2 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-[#FF6F61] font-bold shrink-0" aria-hidden>
                      •
                    </span>
                    <span>Competitive market rent supported by student demand</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#FF6F61] font-bold shrink-0" aria-hidden>
                      •
                    </span>
                    <span>Medium–longer stays reduce re-letting gaps</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#FF6F61] font-bold shrink-0" aria-hidden>
                      •
                    </span>
                    <span>One lease, one manager, predictable income</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-6 lg:mt-0 min-h-0 flex">
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600"
                alt=""
                className="rounded-2xl object-cover w-full h-full min-h-[300px] lg:min-h-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Checklist + Quick example */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-site mx-auto px-6 py-10 md:py-12">
          <img
            src="https://images.unsplash.com/photo-1582407947304-fd86f28f8b9f?w=800"
            alt="Property management"
            className="block rounded-2xl object-cover h-48 w-full mb-8"
          />
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight mb-4">What Quni helps with</h2>
              <ul className="space-y-3">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex gap-3 text-gray-700">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]/10 text-[#FF6F61]"
                      aria-hidden
                    >
                      <IconCheck className="h-4 w-4" />
                    </span>
                    <span className="text-sm sm:text-base leading-relaxed pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-gray-900 font-semibold">One manager. One process. No chaos.</p>
            </div>
            <div>
              <div className="rounded-2xl border-2 border-[#FF6F61]/35 bg-white p-6 sm:p-8 shadow-md">
                <h2 className="font-display text-xl font-bold text-gray-900">Quick example</h2>
                <p className="mt-2 font-medium text-gray-900">Example: three-bedroom apartment</p>
                <ul className="mt-4 space-y-3 text-gray-700 text-sm sm:text-base leading-relaxed">
                  <li>
                    <span className="font-medium text-gray-900">Traditional lease:</span> one rent, one tenant, vacancy between
                    leases.
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">With Quni:</span> whole-property student lease for stable demand, or
                    room-by-room leasing for higher total weekly income potential — we recommend based on your property.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Income estimate CTA */}
      <section className="bg-[#FF6F61] text-white">
        <div className="max-w-site mx-auto px-6 py-10 md:py-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Curious what your property could earn?
          </h2>
          <p className="mt-3 text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            We can outline expected weekly income, likely vacancy profile, and the best leasing structure — clear assumptions, no hype.
          </p>
          <p className="mt-4 text-sm text-white/80 italic max-w-xl mx-auto">
            Not short-stay. Not Airbnb. Proper leases. Professional management.
          </p>
          <div className="mt-5">
            <Link
              to="/landlord-signup"
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white px-6 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              List your property
            </Link>
          </div>
        </div>
      </section>
    </ServicePageLayout>
  )
}
