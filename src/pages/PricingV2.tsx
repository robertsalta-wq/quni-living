import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import {
  LEASE_MONTH_EX_GST_CENTS,
  formatLeaseTotal,
  quoteForLeaseLength,
  quoteForMonths,
} from '../lib/pricing/leaseCharge'

const monthIncl = formatLeaseTotal(quoteForMonths(1, 'fixed').inclGstCents)
const monthEx = formatLeaseTotal(LEASE_MONTH_EX_GST_CENTS)

const leaseRows = [
  { label: '3 months', leaseLength: '3 months' },
  { label: '6 months', leaseLength: '6 months' },
  { label: '12 months', leaseLength: '12 months' },
  { label: '2 years', leaseLength: '2 years' },
  { label: 'Flexible, no end date', leaseLength: 'Flexible' },
] as const

function leasePrice(leaseLength: string): string {
  const quote = quoteForLeaseLength(leaseLength)
  if (!quote) return ''
  const total = formatLeaseTotal(quote.inclGstCents)
  return quote.cadence === 'every_3_months' ? `${total} / 3 months` : total
}

function Tick() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" aria-hidden="true">
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

function CheckList({
  items,
  tone,
}: {
  items: { lead: string; rest: string }[]
  tone: 'light' | 'dark'
}) {
  const rule = tone === 'dark' ? 'border-white/20' : 'border-[var(--quni-line-soft)]'
  const text = tone === 'dark' ? 'text-white' : 'text-[var(--quni-ink)]'
  return (
    <ul className={`text-[14.5px] leading-snug ${text}`}>
      {items.map((item) => (
        <li key={item.lead} className={`flex gap-1.5 border-b py-[3px] last:border-b-0 ${rule}`}>
          <Tick />
          <span>
            <strong className="font-semibold">{item.lead}</strong> {item.rest}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Card({
  headerClass,
  labelClass,
  priceClass,
  lineClass,
  label,
  price,
  line,
  children,
  action,
}: {
  headerClass: string
  labelClass: string
  priceClass: string
  lineClass: string
  label: string
  price: string
  line: string
  children: ReactNode
  action: ReactNode
}) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm">
      <header className={`px-3.5 pb-2 pt-3 ${headerClass}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${labelClass}`}>{label}</p>
        <p className={`mt-1 font-display text-[34px] leading-none xl:text-[40px] ${priceClass}`}>{price}</p>
        <p className={`mt-1 text-[14.5px] leading-snug ${lineClass}`}>{line}</p>
      </header>
      <div className="flex min-w-0 flex-1 flex-col px-3.5 pb-3 pt-1.5">
        {children}
        <div className="mt-auto pt-2">{action}</div>
      </div>
    </article>
  )
}

const buttonClass =
  'inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2 text-[14.5px] font-semibold'

export default function PricingV2() {
  return (
    <div className="font-inter text-[var(--quni-ink)]" style={{ backgroundColor: '#F7F2E8' }}>
      <Seo
        title="Pricing"
        description={`Students pay nothing. Landlords pay ${monthIncl} a rented month, once, when the lease is signed.`}
      />
      <main className="mx-auto max-w-[1200px] px-4 py-3 sm:px-6">
        <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(220px,0.8fr)] lg:gap-8">
          <h1 className="font-display text-[32px] leading-[1.05] sm:text-[38px] xl:text-[42px]">
            Students pay nothing.
            <br />
            Landlords pay only when a room is rented.
          </h1>
          <p className="text-[14.5px] leading-relaxed text-[var(--quni-ink-3)]">
            No subscriptions, no booking fees, no cut of the rent. Rent and bond go straight to the landlord. Quni is
            the software, not an agent.
          </p>
        </div>

        <div className="mt-2.5 grid items-stretch gap-3 lg:grid-cols-3">
          <Card
            headerClass="bg-[var(--quni-trust-bg)]"
            labelClass="text-[var(--quni-trust)]"
            priceClass="text-[var(--quni-trust)]"
            lineClass="text-[var(--quni-trust)]"
            label="Students and renters"
            price="$0"
            line="Free. Always."
            action={
              <Link
                to="/listings"
                className={`${buttonClass} border border-[var(--quni-trust)] text-[var(--quni-trust)]`}
              >
                Find a room
              </Link>
            }
          >
            <CheckList
              tone="light"
              items={[
                { lead: 'Search', rest: 'rooms near your uni' },
                { lead: 'Get verified', rest: 'once, use it for every application' },
                { lead: 'Message', rest: 'landlords in the app' },
                { lead: 'Apply', rest: 'with no application or booking fee' },
                { lead: 'A proper lease', rest: 'for your state, signed online' },
                { lead: 'Pay rent', rest: 'straight to your landlord. No fees to pay rent.' },
              ]}
            />
          </Card>

          <Card
            headerClass="bg-[var(--quni-cream)]"
            labelClass="text-[var(--quni-ink-4)]"
            priceClass="text-[var(--quni-ink)]"
            lineClass="text-[var(--quni-ink-3)]"
            label="Landlords: list and find"
            price="$0"
            line="Free until a lease is signed."
            action={
              <Link to="/list-your-room" className={`${buttonClass} bg-[var(--quni-coral-active)] text-white`}>
                List your room free
              </Link>
            }
          >
            <CheckList
              tone="light"
              items={[
                { lead: 'List every room,', rest: 'as many as you like' },
                { lead: 'AI writes', rest: 'your listing and suggests a fair rent' },
                { lead: 'Seen by students', rest: 'searching near their uni' },
                { lead: 'Every applicant', rest: 'verified as a real person and student' },
                { lead: 'Your phone and email', rest: 'hidden until you accept' },
                { lead: 'AI helps you reply,', rest: 'and you choose who moves in' },
              ]}
            />
          </Card>

          <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--quni-ink)] text-white shadow-sm">
            <header className="border-b border-white/15 px-3.5 pb-2 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Landlords: lease signed</p>
              <p className="mt-1 font-display text-[40px] leading-none text-white">
                {monthIncl}{' '}
                <span className="text-[20px] leading-tight">per month of lease</span>
              </p>
              <p className="mt-1 text-[14.5px] leading-snug text-white">
                {monthEx} + GST. Paid once, when everyone signs.
              </p>
            </header>
            <div className="flex min-w-0 flex-1 flex-col px-3.5 pb-3 pt-1.5">
              <table className="w-full text-[13.5px] leading-tight text-white">
                <caption className="mb-0.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                  What one lease costs, incl. GST
                </caption>
                <tbody>
                  {leaseRows.map((row) => (
                    <tr key={row.leaseLength} className="border-b border-white/20 last:border-b-0">
                      <th scope="row" className="py-0.5 pr-3 text-left font-semibold">
                        {row.label}
                      </th>
                      <td className="py-0.5 text-right font-semibold whitespace-nowrap">{leasePrice(row.leaseLength)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mb-0.5 mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">Included</p>
              <CheckList
                tone="dark"
                items={[
                  { lead: 'The right lease', rest: 'for NSW, QLD or VIC, filled in for you' },
                  { lead: 'Everyone signs', rest: 'online, copies in your dashboard' },
                  { lead: 'Rent and bond', rest: 'straight to you' },
                  { lead: 'Bond receipt', rest: 'and tax invoice' },
                ]}
              />
              <div className="mt-auto pt-2">
                <Link to="/list-your-room" className={`${buttonClass} bg-[var(--quni-coral-active)] text-white`}>
                  List your room free
                </Link>
              </div>
            </div>
          </article>
        </div>

        <ul className="mt-2.5 grid gap-x-4 gap-y-1 border-t border-[var(--quni-line)] pt-2 text-[13.5px] leading-snug text-[var(--quni-ink-2)] sm:grid-cols-2 lg:grid-cols-4">
          <li>Empty room? Costs nothing, for as long as it&apos;s empty.</li>
          <li>Renter leaves early? Unused months carry to the room&apos;s next lease.</li>
          <li>Two renters, one lease? One lease, one price.</li>
          <li>Where? Leases for NSW, QLD and VIC.</li>
        </ul>
      </main>
    </div>
  )
}
