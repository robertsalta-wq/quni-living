import Seo from '../components/Seo'
import Signup from './Signup'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import { formatAustralianAbn } from '../lib/platformIdentity'

/** Interim ABN for invite card until public_legal_entity always supplies it. */
const INVITE_ABN_FALLBACK = '65675990968'

/** TODO: replace with final approved Quinnie photo (same asset as `/list-your-room`). */
const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'

/**
 * Compelling pillars from `/services/landlord-partnerships` — short punch lines for the invite.
 */
const PILLARS = [
  {
    title: 'Yield',
    line: 'Whole-home stability or room-by-room upside — priced for consistent cash flow.',
  },
  {
    title: 'Vacancy',
    line: 'Campus demand that comes back every semester. Longer stays, fewer empty weeks.',
  },
  {
    title: 'Predictability',
    line: 'Clear weekly rent, proper leases, one manager. Not short-stay chaos.',
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
 * Partnerships arguments + Quinnie trust + embed signup. Preview-gated.
 */
export default function ListYourRoomB() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState}`

  return (
    <div className="relative overflow-hidden bg-[var(--quni-cream)]">
      {/* Soft atmosphere — coral wash, not a flat white slab */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_12%_-10%,color-mix(in_srgb,var(--quni-coral)_22%,transparent),transparent_55%),radial-gradient(ellipse_70%_50%_at_95%_10%,color-mix(in_srgb,var(--quni-navy)_10%,transparent),transparent_50%)]"
        aria-hidden
      />

      <Seo
        title="List your property"
        description="More income. Less vacancy. Predictable returns — partner with Quni Living for verified student accommodation and proper leases."
        canonicalPath="/list-your-room-b"
        noindex
      />

      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-6 md:gap-6 md:px-6 md:py-8 lg:min-h-[calc(100vh-4rem)] lg:justify-center lg:py-9">
        <header className="max-w-3xl">
          <span className="eyebrow inline-block rounded-md border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-2.5 py-1.5 !font-bold text-[var(--quni-coral-active)]">
            Landlord partnerships
          </span>
          <h1 className="font-display mt-3 text-[length:var(--text-display-sm-size)] font-extrabold leading-[var(--text-display-sm-lh)] tracking-[var(--text-display-sm-track)] text-[var(--quni-ink)] md:text-[length:var(--text-display-md-size)] md:leading-[var(--text-display-md-lh)] md:tracking-[var(--text-display-md-track)] !mt-3 !mb-0">
            More income. Less vacancy.{' '}
            <span className="text-[var(--quni-coral)]">Predictable returns.</span>
          </h1>
          <p className="mt-3 max-w-[42rem] text-base leading-[var(--text-body-lh)] text-[var(--quni-ink-3)] sm:text-lg sm:leading-[var(--text-body-lg-lh)]">
            Reach serious verified renters near campuses. Proper leases —{' '}
            <strong className="font-semibold text-[var(--quni-ink)]">not Airbnb-style turnover</strong> — whether you
            list a whole home or by the room.
          </p>
        </header>

        {/*
          mobile: signup → Quinnie → pillars
          md: 2×2; xl: Quinnie | pillars | signup
        */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)_minmax(0,1.2fr)] xl:gap-5">
          {/* Quinnie — trust */}
          <div className="quni-card order-2 flex h-full min-h-0 flex-col overflow-hidden border-[var(--quni-cream-border)] bg-[var(--quni-surface-1)] p-0 md:order-1 xl:order-1">
            <div className="relative h-[168px] shrink-0 overflow-hidden sm:h-[190px]">
              {/* TODO: replace with final approved Quinnie photo */}
              <img
                src={QUINNIE_IMG}
                alt="Quinnie Le, co-founder of Quni"
                width={480}
                height={190}
                loading="lazy"
                className="h-full w-full object-cover object-[center_18%]"
              />
              <div
                className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--quni-surface-1)] to-transparent"
                aria-hidden
              />
            </div>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
              <p className="text-sm font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-navy)] sm:text-base sm:leading-[var(--text-body-lh)]">
                <strong className="font-semibold text-[var(--quni-ink)]">Hi, I&apos;m Quinnie.</strong> I built Quni with
                my partner so a spare room is easy money, not a headache. It takes a few minutes to set up, and you can
                message me anytime — you&apos;ll get me, not a bot.
              </p>
              <p className="font-display mt-3 text-base font-bold text-[var(--quni-ink)] !mt-3 !mb-0">Quinnie Le</p>
              <p className="mt-0.5 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-4)]">
                Co-founder, Quni
              </p>
            </div>
          </div>

          {/* Partnerships pillars + help */}
          <div className="quni-card order-3 flex h-full min-h-0 flex-col border-[var(--quni-cream-border)] bg-[var(--quni-surface-1)] p-5 sm:p-6 md:order-3 xl:order-2">
            <p className="eyebrow mb-3 !font-bold text-[var(--quni-coral-active)]">Why rent to students</p>
            <ul className="flex flex-col gap-3.5">
              {PILLARS.map((pillar) => (
                <li
                  key={pillar.title}
                  className="rounded-xl border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-3.5 py-3"
                >
                  <h2 className="font-display text-lg font-bold text-[var(--quni-coral)] !mt-0 !mb-1">{pillar.title}</h2>
                  <p className="text-sm leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-2)]">{pillar.line}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-[var(--quni-navy-tint)] pt-4">
              <p className="mb-2.5 text-sm font-semibold text-[var(--quni-ink)]">What Quni helps with</p>
              <ul className="flex flex-col gap-2">
                {HELP_CHECKLIST.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2.5 text-[length:var(--text-caption-size)] font-medium leading-[var(--text-caption-lh)] text-[var(--quni-ink-2)]"
                  >
                    <TickBadge />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[length:var(--text-caption-size)] italic leading-[var(--text-caption-lh)] text-[var(--quni-ink-4)]">
                Not short-stay. Not Airbnb. Proper leases.
              </p>
            </div>
          </div>

          {/* Signup */}
          <aside className="quni-card order-1 flex h-full min-h-0 flex-col border-[var(--quni-cream-border)] bg-[var(--quni-surface-1)] p-5 sm:p-6 md:order-2 xl:order-3">
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
