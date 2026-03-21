import { Link } from 'react-router-dom'

function IconHouse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
    </svg>
  )
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6" />
    </svg>
  )
}

function IconHandshake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 12h2a2 2 0 012 2v1l2 2M11 12H9a2 2 0 00-2 2v1l-2 2M11 12l-2-2m4 2l2-2m-6 8l2-2m2 2l2-2"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 8l2-2m-6 6L8 8m8 8l-2-2M8 8L6 6" />
    </svg>
  )
}

function IconSofa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11V9a2 2 0 012-2h2M4 11v4a1 1 0 001 1h1M4 11H3a1 1 0 000 2h1m0-2v0m16 0V9a2 2 0 00-2-2h-2m4 4v4a1 1 0 01-1 1h-1m2-6h1a1 1 0 010 2h-1m0-2v0M8 21h8M8 21v-2a2 2 0 012-2h4a2 2 0 012 2v2M8 21H6a1 1 0 01-1-1v-1" />
    </svg>
  )
}

function IconTrending({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 7-7M14 8h6v6" />
    </svg>
  )
}

const cards = [
  {
    to: '/services/landlord-partnerships',
    title: 'Why rent to students',
    Icon: IconTrending,
    description:
      'Strong demand near campuses, predictable leases, and professional management — see how student rentals can improve yield and vacancy.',
  },
  {
    to: '/services/student-accommodation',
    title: 'Student Accommodation',
    Icon: IconHouse,
    description:
      'Browse verified listings near your university. Studios, shared rooms, apartments and fully furnished options.',
  },
  {
    to: '/services/property-management',
    title: 'Property Management',
    Icon: IconClipboard,
    description: 'We help landlords manage their listings, enquiries and bookings all in one place.',
  },
  {
    to: '/services/landlord-partnerships',
    title: 'Landlord Partnerships',
    Icon: IconHandshake,
    description: 'Partner with Quni Living to reach thousands of students looking for quality accommodation.',
  },
  {
    to: '/services/fully-furnished',
    title: 'Fully Furnished Units',
    Icon: IconSofa,
    description: 'Move-in ready properties with everything included — furniture, linen, bills and more.',
  },
] as const

export default function Services() {
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <section className="bg-[#FF6F61] text-white">
        <div className="max-w-site mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Our Services</h1>
          <p className="mt-4 text-base sm:text-lg text-white max-w-3xl mx-auto leading-relaxed">
            Everything you need — whether you&apos;re looking for a home or managing a property.
          </p>
        </div>
      </section>

      <section className="max-w-site mx-auto px-6 py-12 md:py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map(({ to, title, Icon, description }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6F61]/10 text-[#FF6F61] mb-4">
                <Icon className="w-6 h-6" />
              </span>
              <h2 className="font-display text-xl font-bold text-gray-900 group-hover:text-[#c45c52] transition-colors">
                {title}
              </h2>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed flex-1">{description}</p>
              <span className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-800 inline-flex items-center gap-1">
                Learn more
                <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#FF6F61] text-white mt-auto">
        <div className="max-w-site mx-auto px-6 py-14 md:py-16 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">Not sure where to start?</h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/listings"
              className="inline-flex items-center justify-center rounded-lg bg-white text-gray-900 px-6 py-3 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Browse listings
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white text-white px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
