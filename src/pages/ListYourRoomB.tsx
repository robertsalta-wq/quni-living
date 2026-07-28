import Seo from '../components/Seo'
import Signup from './Signup'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import { formatAustralianAbn } from '../lib/platformIdentity'

/** Interim ABN for invite card until public_legal_entity always supplies it. */
const INVITE_ABN_FALLBACK = '65675990968'

/** TODO: replace with final approved Quinnie photo (same asset as `/list-your-room`). */
const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'

const PITCH_POINTS = [
  {
    title: 'A shortlist, not an inbox.',
    body: 'ID verification, enrolment checks, and an AI fit assessment land as a shortlist — not forty Flatmates replies from people who ghost.',
  },
  {
    title: 'Fewer empty weeks.',
    body: 'Campus demand that comes back every semester. Longer stays, fewer gaps between tenants.',
  },
  {
    title: 'The paperwork signs itself.',
    body: 'Quni determines the legally correct document per rental, generates it, and e-signs it with every party.',
  },
] as const

/** Condensed from landlord AI feature set — fits one panel. */
const AI_FEATURES = [
  'Write or regenerate your listing description',
  'Proofread and polish listing copy',
  'Suggest weekly rent from your listing',
  'Draft replies to student enquiries',
  'Assess applicant fit before you accept or decline',
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
 * Quinnie trust in the hero; AI features + pitch + signup. Preview-gated.
 */
export default function ListYourRoomB() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState}`

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your property"
        description="More income from your spare room. Zero hassle — partner with Quni Living for verified student renters and proper leases."
        canonicalPath="/list-your-room-b"
        noindex
      />

      <div className="mx-auto flex max-w-site flex-col gap-5 px-5 py-6 md:gap-6 md:px-6 md:py-8 lg:min-h-[calc(100vh-4rem)] lg:justify-center lg:py-9">
        <header className="max-w-3xl">
          <span className="eyebrow inline-block rounded-md border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-2.5 py-1.5 !font-bold text-[var(--quni-coral-active)]">
            Landlord partnerships
          </span>
          <h1 className="font-display mt-3 text-[length:var(--text-display-sm-size)] font-extrabold leading-[var(--text-display-sm-lh)] tracking-[var(--text-display-sm-track)] text-[var(--quni-ink)] md:text-[length:var(--text-display-md-size)] md:leading-[var(--text-display-md-lh)] md:tracking-[var(--text-display-md-track)] !mt-3 !mb-0">
            More income from your spare room.{' '}
            <span className="text-[var(--quni-coral)]">Zero hassle.</span>
          </h1>

          {/* Quinnie — top line under the headline */}
          <div className="mt-4 flex items-start gap-3.5">
            {/* TODO: replace with final approved Quinnie photo */}
            <img
              src={QUINNIE_IMG}
              alt="Quinnie Le, co-founder of Quni"
              width={88}
              height={88}
              loading="lazy"
              className="h-20 w-20 shrink-0 rounded-full object-cover object-[center_16%]"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-navy)] sm:text-base sm:leading-[var(--text-body-lh)]">
                <strong className="font-semibold text-[var(--quni-ink)]">Hi, I&apos;m Quinnie.</strong> I built Quni with
                my partner so a spare room is easy money, not a headache. It takes a few minutes to set up, and you can
                message me anytime — you&apos;ll get me, not a bot.
              </p>
              <p className="mt-2 text-[length:var(--text-caption-size)] font-semibold leading-[var(--text-caption-lh)] text-[var(--quni-navy)]">
                Quinnie Le, co-founder.
              </p>
            </div>
          </div>
        </header>

        {/*
          mobile: signup → AI → pitch
          md+: AI | pitch | signup
        */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6">
          {/* AI features */}
          <div className="quni-card order-2 flex h-full min-h-0 flex-col p-6 md:order-1">
            <p className="eyebrow mb-3 !font-bold text-[var(--quni-coral-active)]">Powered by AI</p>
            <h2 className="font-display text-xl font-bold leading-[var(--text-h3-lh)] tracking-tight text-[var(--quni-ink)] !mt-0 !mb-4">
              Tools built for landlords
            </h2>
            <ul className="flex flex-col gap-2.5">
              {AI_FEATURES.map((line) => (
                <li
                  key={line}
                  className="flex gap-2.5 text-sm font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-2)]"
                >
                  <TickBadge />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pitch points — flat list, no nested cards */}
          <div className="quni-card order-3 flex h-full min-h-0 flex-col p-6 md:order-3 xl:order-2">
            <ul className="flex flex-col">
              {PITCH_POINTS.map((point, i) => (
                <li
                  key={point.title}
                  className={`py-3.5 ${i === 0 ? 'pt-0' : 'border-t border-[var(--quni-line-soft)]'}`}
                >
                  <h2 className="font-display text-lg font-bold text-[var(--quni-ink)] !mt-0 !mb-1.5">{point.title}</h2>
                  <p className="text-sm leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-3)]">{point.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Signup */}
          <aside className="quni-card order-1 flex h-full min-h-0 flex-col p-6 md:order-2 xl:order-3">
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
            <p className="mt-3 text-center text-[length:var(--text-micro-size)] leading-[var(--text-micro-lh)] text-[var(--quni-ink-5)]">
              {legalLine}
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
