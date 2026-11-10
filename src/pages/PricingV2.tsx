import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { Card } from '../components/admin/primitives/Card'
import { formatLeaseTotal, quoteForLeaseLength, quoteForMonths } from '../lib/pricing/leaseCharge'

const monthIncl = formatLeaseTotal(quoteForMonths(1, 'fixed').inclGstCents)

function leaseTotal(leaseLength: string): string {
  const quote = quoteForLeaseLength(leaseLength)
  return quote ? formatLeaseTotal(quote.inclGstCents) : ''
}

const sixMonthTotal = leaseTotal('6 months')
const flexibleTotal = leaseTotal('Flexible')

const priceTiles = [
  { leaseLength: '3 months', label: '3 months', highlight: false },
  { leaseLength: '6 months', label: '6 months', highlight: true },
  { leaseLength: '12 months', label: '12 months', highlight: false },
  { leaseLength: '2 years', label: '2 years', highlight: false },
] as const

const leaseIncludes = [
  {
    title: 'The right agreement',
    body: 'A room in your home, a room or whole place on its own lease, a NSW boarding house or QLD rooming house.',
  },
  {
    title: 'The official forms',
    body: 'NSW Fair Trading FT6600, QLD RTA Form 18a and R18. VIC uses the Consumer Affairs Victoria Form 1 wording.',
  },
  {
    title: 'Filled in for you',
    body: "Names, rent, bond, dates and your bank details, from the listing and the renter's profile.",
  },
  {
    title: 'Signed by everyone',
    body: 'You, your renter and any co-tenant sign online, dated, with the same final copy for all.',
  },
  {
    title: 'Bond done right',
    body: 'To the bond authority where the law requires it, or to you, with a receipt when you receive it.',
  },
] as const

const priceClass =
  'font-display text-[length:var(--text-display-sm-size)] font-bold leading-[var(--text-display-sm-lh)] tracking-[var(--text-display-sm-track)]'
const labelClass =
  'text-[length:var(--text-micro-size)] font-semibold uppercase leading-[var(--text-micro-lh)] tracking-[var(--text-micro-track)]'
const lineClass =
  'text-[length:var(--text-body-sm-size)] leading-[var(--text-body-sm-lh)]'
const buttonBase =
  'mt-auto inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2'

function Tick({ className }: { className: string }) {
  return (
    <svg className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 8.2 6.3 11.2 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Lines({ items, iconClass, ruleClass }: { items: readonly string[]; iconClass: string; ruleClass: string }) {
  return (
    <ul className="mt-3">
      {items.map((item) => (
        <li
          key={item}
          className={`flex gap-2 border-b py-1.5 last:border-b-0 ${lineClass} ${ruleClass}`}
        >
          <Tick className={iconClass} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function StepBadge({ n, className }: { n: string; className: string }) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${className}`}
    >
      {n}
    </span>
  )
}

export default function PricingV2() {
  return (
    <div className="lining-nums bg-white font-inter text-[var(--quni-ink)]">
      <Seo
        title="Pricing"
        description={`Students pay nothing. Landlords pay ${monthIncl} for each month of the lease, paid once when everyone signs. A 6-month lease is ${sixMonthTotal}.`}
      />
      <main className="mx-auto max-w-site px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="!mb-0 font-display text-3xl font-bold tracking-tight text-[var(--quni-ink)] sm:text-4xl">
          Students pay nothing.
          <br />
          Landlords pay <span className="text-[var(--quni-coral-active)]">{monthIncl}</span> for each month of the
          lease.
        </h1>
        <p className="mt-2 max-w-3xl text-[length:var(--text-body-lg-size)] leading-[var(--text-body-lg-lh)] text-[var(--quni-ink-2)]">
          <strong className="font-semibold text-[var(--quni-ink)]">Paid once, when everyone signs.</strong> A 6-month
          lease is {sixMonthTotal}. Listing is free, and the rent is all yours.
        </p>

        <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <Card
            padding={16}
            className="flex h-full min-w-0 flex-col"
            style={{ background: 'var(--quni-trust-bg)', borderColor: 'var(--quni-trust)' }}
          >
            <p className={`${labelClass} text-[var(--quni-trust)]`}>Students and renters</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <p className={`${priceClass} text-[var(--quni-trust)]`}>$0</p>
              <p className={`${lineClass} font-semibold text-[var(--quni-trust)]`}>Free. Always.</p>
            </div>
            <Lines
              iconClass="text-[var(--quni-trust)]"
              ruleClass="border-[var(--quni-line)]"
              items={[
                'Search rooms near your uni',
                'Add your details once, use them for every application',
                'Message landlords in the app',
                'No fee to apply, sign or pay rent',
                'Rent and bond never go to Quni',
              ]}
            />
            <Link
              to="/listings"
              className={`${buttonBase} border border-[var(--quni-trust)] bg-transparent text-[var(--quni-trust)] hover:bg-white focus:ring-[var(--quni-trust)]`}
            >
              Find a room
            </Link>
          </Card>

          <Card
            padding={16}
            className="flex h-full min-w-0 flex-col"
            style={{ borderColor: 'var(--quni-cream-border)' }}
          >
            <div className="flex items-center gap-2">
              <StepBadge n="1" className="bg-[var(--quni-coral-active)] text-white" />
              <p className={`${labelClass} text-[var(--quni-coral-active)]`}>Landlords: find your renter</p>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <p className={`${priceClass} text-[var(--quni-ink)]`}>$0</p>
              <p className={`${lineClass} font-semibold text-[var(--quni-ink-2)]`}>Free until someone signs.</p>
            </div>
            <Lines
              iconClass="text-[var(--quni-coral-active)]"
              ruleClass="border-[var(--quni-line)]"
              items={[
                'List every room free, as many as you like',
                'AI writes your listing, suggests a rent, helps you reply',
                'Students give uni email, photo ID and enrolment to apply',
                'Your phone and email stay hidden until you accept',
                'You choose who moves in. Empty rooms cost nothing.',
              ]}
            />
            <Link
              to="/list-your-room"
              className={`${buttonBase} bg-[var(--quni-coral-active)] text-white hover:bg-[var(--quni-coral-active)] focus:ring-admin-coral/40`}
            >
              List your room free
            </Link>
          </Card>

          <Card
            padding={16}
            className="flex h-full min-w-0 flex-col text-white"
            style={{ background: 'var(--quni-navy)', borderColor: 'var(--quni-navy)' }}
          >
            <div className="flex items-center gap-2">
              <StepBadge n="2" className="bg-white text-[var(--quni-navy)]" />
              <p className={`${labelClass} text-[var(--quni-coral-on-navy)]`}>Landlords: lease signed</p>
            </div>
            <p className={`${priceClass} mt-2 text-white`}>{monthIncl}</p>
            <p className={`${lineClass} font-semibold text-white`}>
              for each month of the lease, paid once at signing
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {priceTiles.map((tile) => (
                <li
                  key={tile.leaseLength}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm tabular-nums text-white ${
                    tile.highlight
                      ? 'border-2 border-[var(--quni-coral-on-navy)]'
                      : 'border-[var(--quni-line)]'
                  }`}
                  style={{ background: 'var(--quni-navy-hover)' }}
                >
                  <span>{tile.label}</span>
                  <span className="font-semibold">{leaseTotal(tile.leaseLength)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-white">
              One charge for the whole lease, incl. GST, with a tax invoice. No end date? {flexibleTotal} every 3
              months while it lasts. Renter leaves early? Record the end date and unused months stay on that room.
            </p>
            <Link
              to="/sample-lease"
              className={`${buttonBase} border border-white/90 bg-white text-[var(--quni-navy)] shadow-md hover:bg-[var(--quni-surface-2)] focus:ring-white`}
            >
              See a sample lease
            </Link>
          </Card>
        </div>

        <section
          id="whats-in-the-lease"
          className="mt-4 rounded-2xl px-4 py-4 text-white sm:px-5"
          style={{ background: 'var(--quni-navy)' }}
        >
          <h2 className="!mb-0 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            What you get: a lease done properly
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {leaseIncludes.map((item) => (
              <div key={item.title} className="min-w-0 border-t-2 border-[var(--quni-coral-on-navy)] pt-2">
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-white">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <Link
            to="/sample-lease"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--quni-coral-on-navy)]"
          >
            See a sample lease
          </Link>
        </section>

        <p className="mt-3 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
          <strong className="font-semibold text-[var(--quni-ink)]">No cut of the rent.</strong> Quni is the software,
          not your agent. <strong className="font-semibold text-[var(--quni-ink)]">Two renters, one lease?</strong>{' '}
          Still one price. <strong className="font-semibold text-[var(--quni-ink)]">Where?</strong> Leases for NSW, QLD
          and VIC.
        </p>
      </main>
    </div>
  )
}
