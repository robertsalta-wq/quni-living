import Seo from '../components/Seo'
import Signup from './Signup'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import { formatAustralianAbn } from '../lib/platformIdentity'

/** Interim ABN for invite card until public_legal_entity always supplies it. */
const INVITE_ABN_FALLBACK = '65675990968'

/**
 * Compelling arguments drawn from `/services/landlord-partnerships`
 * (yield / vacancy / predictability + what Quni helps with).
 */
const ARGUMENT_CARDS = [
  {
    title: 'Yield',
    body: 'Choose whole-property stability or room-by-room optimisation. Pricing is structured for consistent cash flow.',
  },
  {
    title: 'Vacancy',
    body: 'Built around demand near universities — recurring student interest and longer stays improve occupancy stability.',
  },
  {
    title: 'Predictability',
    body: 'Clear weekly rent, documented house rules and standards, and one professional manager overseeing the process.',
  },
] as const

const HELP_CHECKLIST = [
  'Student screening & placement',
  'Rent and bond management',
  'Property condition oversight',
  'Tenant issues & escalation',
  'Ongoing reporting and visibility',
] as const

function TickBadge() {
  return (
    <span
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--quni-trust-bg)] text-[var(--quni-trust)]"
      aria-hidden
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

/**
 * A/B alternative to `/list-your-room`.
 * Same invite shell (minimal chrome + embed signup); copy from landlord-partnerships.
 * Preview-gated — does not replace the live invite page.
 */
export default function ListYourRoomB() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState}`

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your property"
        description="More income. Less vacancy. Predictable returns — partner with Quni Living for verified student accommodation and proper leases."
        canonicalPath="/list-your-room-b"
        noindex
      />

      <div className="mx-auto flex max-w-[1240px] flex-col justify-center gap-5 px-5 py-6 md:gap-6 md:px-7 md:py-8 lg:min-h-[calc(100vh-4rem)] lg:py-9">
        {/* Hero — partnerships positioning */}
        <header className="max-w-3xl">
          <span className="eyebrow inline-block rounded-md border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-2.5 py-1.5 !font-bold text-[var(--quni-coral-active)]">
            Landlord partnerships
          </span>
          <h1 className="font-display mt-3.5 text-[length:var(--text-display-sm-size)] font-extrabold leading-[var(--text-display-sm-lh)] tracking-[var(--text-display-sm-track)] text-[var(--quni-ink)] md:text-[length:var(--text-display-md-size)] md:leading-[var(--text-display-md-lh)] md:tracking-[var(--text-display-md-track)] !mt-3.5 !mb-0">
            More income. Less vacancy. Predictable returns.
          </h1>
          <p className="mt-3 max-w-[760px] text-base leading-[var(--text-body-lh)] text-[var(--quni-ink-3)] sm:text-lg sm:leading-[var(--text-body-lg-lh)]">
            Partner with Quni Living to reach serious verified renters near campuses. We help you run{' '}
            <strong className="font-semibold text-[var(--quni-ink)]">proper leases — not short-stay chaos</strong>
            — whether you list a whole home or individual rooms.
          </p>
        </header>

        {/*
          Band: arguments | checklist | signup
          mobile: signup first
        */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-5">
          {/* 1. The numbers that matter */}
          <div className="quni-card order-2 flex h-full min-h-0 flex-col p-5 sm:p-6 md:order-1 xl:order-1">
            <p className="eyebrow mb-1 !font-bold text-[var(--quni-coral-active)]">Why rent to students</p>
            <h2 className="font-display text-xl font-bold leading-[var(--text-h3-lh)] tracking-tight text-[var(--quni-ink)] !mt-0 !mb-4">
              The numbers that matter
            </h2>
            <ul className="flex flex-col gap-4">
              {ARGUMENT_CARDS.map((card) => (
                <li key={card.title}>
                  <h3 className="font-display text-base font-bold text-[var(--quni-coral)] !mt-0 !mb-1">{card.title}</h3>
                  <p className="text-sm leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-3)]">{card.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. What Quni helps with */}
          <div className="quni-card order-3 flex h-full min-h-0 flex-col justify-center p-5 sm:p-6 md:order-3 xl:order-2">
            <h2 className="font-display text-xl font-bold leading-[var(--text-h3-lh)] tracking-tight text-[var(--quni-ink)] !mt-0 !mb-4">
              What Quni helps with
            </h2>
            <ul className="flex flex-col gap-2.5">
              {HELP_CHECKLIST.map((line) => (
                <li
                  key={line}
                  className="flex gap-2.5 text-sm font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-2)]"
                >
                  <TickBadge />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm font-semibold text-[var(--quni-ink)]">One manager. One process. No chaos.</p>
            <p className="mt-2 text-[length:var(--text-caption-size)] italic leading-[var(--text-caption-lh)] text-[var(--quni-ink-4)]">
              Not short-stay. Not Airbnb. Proper leases. Professional management.
            </p>
          </div>

          {/* 3. Signup */}
          <aside className="quni-card order-1 flex h-full min-h-0 flex-col p-5 sm:p-6 md:order-2 xl:order-3">
            <Signup
              embedLandlordInvite
              collapsedEmail
              embedInviteTitle="List your property"
              embedInviteSub={
                <>
                  Join Quni Living and connect with verified renters. Takes less than{' '}
                  <strong className="font-semibold text-[var(--quni-ink)]">5 minutes</strong>.
                </>
              }
            />
            <p className="mt-3.5 text-center text-[length:var(--text-micro-size)] leading-[var(--text-micro-lh)] text-[var(--quni-ink-5)]">
              {legalLine}
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
