import { Link } from 'react-router-dom'
import ServicePageLayout from '../../components/ServicePageLayout'

const CHECKLIST = [
  'Student screening & placement',
  'Rent and bond management',
  'Property condition oversight',
  'Tenant issues & escalation',
  'Ongoing reporting and visibility',
] as const

export default function LandlordPartnerships() {
  return (
    <ServicePageLayout
      title="Landlord Partnerships"
      subtitle="More income. Less vacancy. Predictable returns — student accommodation with a structured, numbers-driven approach."
      relatedMode="newest"
      extraCta={{ label: 'List your property', to: '/landlord-signup' }}
    >
      <p className="text-lg text-gray-800 font-medium">
        Partner with Quni Living to reach serious student tenants across Sydney. We help you keep occupancy steadier near
        campuses and run proper leases — not short-stay chaos — whether you list a whole home or individual rooms.
      </p>

      <aside className="rounded-2xl border border-[#FF6F61]/25 bg-[#FF6F61]/5 p-6 md:p-8 not-prose">
        <h2 className="font-display text-xl font-bold text-gray-900">Why explore renting to students?</h2>
        <p className="mt-3 text-gray-700 leading-relaxed">
          Student demand near universities is recurring; tenancies are often medium-to-longer stays, which can mean fewer
          gaps between renters and rent that reflects real market demand. If you want clear weekly numbers, professional
          oversight, and leases (not Airbnb-style turnover), the sections below spell out how that works — and you can
          talk to us anytime with no obligation.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white px-4 py-2 text-sm font-medium hover:opacity-95 transition-opacity"
          >
            Speak with Quni
          </Link>
          <Link
            to="/landlord-signup"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Become a partner
          </Link>
        </div>
      </aside>

      <p>
        We focus on the property, the tenants, and protecting your asset — with one clear process instead of juggling
        multiple informal arrangements.
      </p>

      <h2 className="font-display text-2xl font-bold text-gray-900 pt-2">How would you like to rent your property?</h2>
      <p className="text-gray-600">
        Two common models — we assess layout, location, and demand before recommending the best fit.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 not-prose">
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5">
          <h3 className="font-display font-semibold text-gray-900">Whole property</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Familiar single-lease structure with strong student demand and typically lower vacancy than ad-hoc letting.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5">
          <h3 className="font-display font-semibold text-gray-900">By the room</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Flexible leasing so total weekly income can align with your goals and the property layout.
          </p>
        </div>
      </div>

      <h3 className="font-display text-lg font-bold text-gray-900">Whole-property student leasing</h3>
      <p>Ideal if you want traditional leasing with stronger demand and fewer empty weeks.</p>
      <ul className="list-disc pl-5 space-y-2 text-gray-700">
        <li>Competitive market rent supported by student demand</li>
        <li>Medium–longer stays reduce re-letting gaps</li>
        <li>One lease, one manager, predictable income</li>
      </ul>

      <h2 className="font-display text-2xl font-bold text-gray-900 pt-4">The numbers that matter</h2>
      <div className="grid md:grid-cols-3 gap-4 not-prose">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display font-semibold text-[#c45c52]">Yield</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Choose whole-property stability or room-by-room optimisation. Pricing is structured for consistent cash flow.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display font-semibold text-[#c45c52]">Vacancy</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Built around demand near universities — recurring student interest and longer stays improve occupancy
            stability.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display font-semibold text-[#c45c52]">Predictability</h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Clear weekly rent, documented house rules and standards, and one professional manager overseeing the process.
          </p>
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold text-gray-900 pt-2">Quick example</h2>
      <p className="font-medium text-gray-900">Example: three-bedroom apartment</p>
      <ul className="list-disc pl-5 space-y-2 text-gray-700">
        <li>
          <span className="font-medium text-gray-800">Traditional lease:</span> one rent, one tenant, vacancy between
          leases.
        </li>
        <li>
          <span className="font-medium text-gray-800">With Quni:</span> whole-property student lease for stable demand, or
          room-by-room leasing for higher total weekly income potential — we recommend based on your property.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-bold text-gray-900 pt-2">What Quni helps with</h2>
      <ul className="space-y-2 not-prose">
        {CHECKLIST.map((item) => (
          <li key={item} className="flex gap-2 text-gray-700">
            <span className="text-[#FF6F61] font-bold shrink-0" aria-hidden>
              ✔
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-gray-800 font-medium">One manager. One process. No chaos.</p>

      <h2 className="font-display text-2xl font-bold text-gray-900 pt-2">Curious what your property could earn?</h2>
      <p>We can outline expected weekly income, likely vacancy profile, and the best leasing structure — clear assumptions, no hype.</p>
      <p className="text-sm text-gray-600 italic border-l-4 border-gray-200 pl-4">
        Not short-stay. Not Airbnb. Proper leases. Professional management.
      </p>
    </ServicePageLayout>
  )
}
