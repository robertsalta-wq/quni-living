import { Link, Navigate } from 'react-router-dom'
import Seo from '../components/Seo'
import { Card } from '../components/admin/primitives/Card'
import { usePlatformFeatures } from '../context/PlatformFeaturesContext'

type SampleAgreement = {
  name: string
  when: string
  href: string
  fileName: string
}

type SampleState = {
  state: string
  agreements: SampleAgreement[]
}

const STATES: SampleState[] = [
  {
    state: 'NSW',
    agreements: [
      {
        name: 'Room on its own lease',
        when: 'NSW Fair Trading FT6600 plus the Quni addendum. A room, a shared room, or the whole place, when you do not live there.',
        href: '/sample-lease/nsw-room-on-its-own-lease.pdf',
        fileName: 'nsw-room-on-its-own-lease.pdf',
      },
      {
        name: 'Room in your home',
        when: 'Occupancy agreement. A room in the home you live in.',
        href: '/sample-lease/nsw-room-in-your-home.pdf',
        fileName: 'nsw-room-in-your-home.pdf',
      },
      {
        name: 'Boarding house',
        when: "Quni's occupancy agreement for a registered boarding house.",
        href: '/sample-lease/nsw-boarding-house.pdf',
        fileName: 'nsw-boarding-house.pdf',
      },
    ],
  },
  {
    state: 'QLD',
    agreements: [
      {
        name: 'Room on its own lease',
        when: 'RTA Form 18a plus the Quni addendum. A general tenancy for a room or the whole place.',
        href: '/sample-lease/qld-room-on-its-own-lease.pdf',
        fileName: 'qld-room-on-its-own-lease.pdf',
      },
      {
        name: 'Room in your home',
        when: 'Occupancy agreement. A room in the home you live in, where the rooming house rules do not apply.',
        href: '/sample-lease/qld-room-in-your-home.pdf',
        fileName: 'qld-room-in-your-home.pdf',
      },
      {
        name: 'Rooming house',
        when: 'RTA Form R18, for rooming accommodation.',
        href: '/sample-lease/qld-rooming-house.pdf',
        fileName: 'qld-rooming-house.pdf',
      },
    ],
  },
  {
    state: 'VIC',
    agreements: [
      {
        name: 'Room on its own lease',
        when: "Consumer Affairs Victoria Form 1 wording, set in Quni's PDF, plus the Quni addendum. A room, a shared room, or the whole place, when you do not live there.",
        href: '/sample-lease/vic-room-on-its-own-lease.pdf',
        fileName: 'vic-room-on-its-own-lease.pdf',
      },
      {
        name: 'Room in your home',
        when: 'Licence to occupy. A room in the home you live in.',
        href: '/sample-lease/vic-room-in-your-home.pdf',
        fileName: 'vic-room-in-your-home.pdf',
      },
    ],
  },
]

const openClass =
  'inline-flex items-center justify-center rounded-xl border border-[var(--quni-ink)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--quni-ink)]'
const primaryClass =
  'inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral-active)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--quni-coral-active)] focus:outline-none focus:ring-2 focus:ring-admin-coral/40 focus:ring-offset-2'

export default function SampleLeasePage() {
  const { pricingV2Enabled, loaded } = usePlatformFeatures()

  if (!pricingV2Enabled && !loaded) {
    return (
      <main className="mx-auto max-w-site px-4 py-8 font-inter text-[length:var(--text-body-size)] text-[var(--quni-ink-3)]">
        Loading
      </main>
    )
  }

  if (!pricingV2Enabled) return <Navigate to="/pricing" replace />

  return (
    <div className="lining-nums bg-white font-inter text-[var(--quni-ink)]">
      <Seo
        title="Sample lease"
        description="Sample agreements Quni prepares for NSW, QLD and VIC, filled in with made-up details."
      />
      <main className="mx-auto max-w-site px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="!mb-0 font-display text-3xl font-bold tracking-tight text-[var(--quni-ink)] sm:text-4xl">
          See exactly what you and your renter sign
        </h1>
        <p className="mt-2 max-w-3xl text-[length:var(--text-body-lg-size)] leading-[var(--text-body-lg-lh)] text-[var(--quni-ink-2)]">
          These are the agreements Quni prepares, filled in with sample details. Yours is filled in from your listing
          and your renter&apos;s profile, then signed online by everyone.
        </p>

        <div className="mt-6 space-y-6">
          {STATES.map((group) => (
            <section key={group.state} aria-labelledby={`sample-lease-${group.state}`}>
              <h2
                id={`sample-lease-${group.state}`}
                className="!mb-3 font-display text-2xl font-bold tracking-tight text-[var(--quni-ink)] sm:text-3xl"
              >
                {group.state}
              </h2>
              <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
                {group.agreements.map((item) => (
                  <Card key={item.href} padding={16} className="flex h-full min-w-0 flex-col">
                    <p className="text-[length:var(--text-micro-size)] font-semibold uppercase leading-[var(--text-micro-lh)] tracking-[var(--text-micro-track)] text-[var(--quni-ink-2)]">
                      {group.state}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--quni-ink)]">{item.name}</h3>
                    <p className="mt-2 text-[length:var(--text-body-sm-size)] leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-2)]">
                      {item.when}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                      <a href={item.href} target="_blank" rel="noopener" className={openClass}>
                        Open sample (PDF)
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      <a
                        href={item.href}
                        download={item.fileName}
                        className="text-sm font-semibold text-[var(--quni-coral-active)]"
                      >
                        Download
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
          Every sample uses made-up details. No real person or property is shown.
        </p>
        <Link to="/list-your-room" className={`${primaryClass} mt-4`}>
          List your room free
        </Link>
      </main>
    </div>
  )
}
