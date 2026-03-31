import { Link } from 'react-router-dom'

type Props = { universityName: string }

export default function LandlordCtaBand({ universityName }: Props) {
  return (
    <section
      className="rounded-2xl px-6 py-10 sm:px-10 sm:py-12 text-center text-stone-900 shadow-sm"
      style={{ backgroundColor: '#8FB9AB' }}
      aria-labelledby="landlord-cta-heading"
    >
      <h2 id="landlord-cta-heading" className="font-display text-xl sm:text-2xl font-bold text-stone-900">
        Are you a landlord near {universityName}?
      </h2>
      <p className="mt-2 text-sm sm:text-base text-stone-800/90 max-w-xl mx-auto">
        List your property and connect with verified students
      </p>
      <Link
        to="/landlord-signup"
        className="inline-flex items-center justify-center mt-6 rounded-xl bg-[#FF6F61] text-white font-semibold text-sm px-6 py-3 shadow-sm hover:bg-[#e85a4f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#8FB9AB]"
      >
        List your property →
      </Link>
    </section>
  )
}
