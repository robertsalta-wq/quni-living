import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  FilePenLine,
  MessageSquareText,
  SpellCheck,
  UserCheck,
} from 'lucide-react'
import Seo from '../components/Seo'
import Signup from './Signup'

/** TODO: replace with final approved Quinnie photo (same asset as `/list-your-room`). */
const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'

type SmartTool = {
  title: string
  body: string
  Icon: LucideIcon
}

const SMART_TOOLS: SmartTool[] = [
  {
    Icon: FilePenLine,
    title: 'Instant listing builder',
    body: 'Get a clear, high-converting room description drafted in seconds.',
  },
  {
    Icon: SpellCheck,
    title: 'Polished copy',
    body: 'Proofreads and refines your text so your listing looks professional.',
  },
  {
    Icon: Banknote,
    title: 'Smart rent pricing',
    body: 'Recommends competitive weekly rates based on live Sydney student demand.',
  },
  {
    Icon: MessageSquareText,
    title: '1-click quick replies',
    body: 'Answer common student questions instantly without repetitive typing.',
  },
  {
    Icon: UserCheck,
    title: 'Applicant summaries',
    body: 'See enrolment status, lifestyle habits, and fit at a glance before replying.',
  },
]

/** Same line-item pattern as `/pricing` landlord Listing column. */
function OfferLineItem({
  icon,
  name,
  value,
  description,
  valueKind,
}: {
  icon: ReactNode
  name: string
  value: string
  description: string
  valueKind: 'coralLg' | 'coralSm'
}) {
  const valueCls =
    valueKind === 'coralLg'
      ? 'font-lora text-lg font-semibold text-[var(--quni-rust)]'
      : 'font-lora text-sm font-semibold text-[var(--quni-rust)]'

  return (
    <div className="mb-[18px] grid grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 last:mb-0">
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--quni-rust)] [&_svg]:h-4 [&_svg]:w-4"
        aria-hidden
      >
        {icon}
      </div>
      <div className="text-sm font-medium text-[var(--quni-ink)]">{name}</div>
      <div className={`whitespace-nowrap leading-none ${valueCls}`}>{value}</div>
      <p className="col-span-2 col-start-2 text-[13px] leading-snug text-[var(--quni-ink-4)]">{description}</p>
    </div>
  )
}

const HOUSE_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M2 6l6-4 6 4v8H2z" />
    <path d="M6 14V9h4v5" />
  </svg>
)

const CHECK_ICON = (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3,8 7,12 13,4" />
  </svg>
)

/**
 * Editorial invite variant — landlord-benefit copy. Preview-gated.
 * Compare with `/list-your-room-b` (do not mirror C changes onto B).
 */
export default function ListYourRoomC() {
  const signupRef = useRef<HTMLElement | null>(null)
  const [signupInView, setSignupInView] = useState(true)

  useEffect(() => {
    const node = signupRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSignupInView(entry.isIntersecting)
      },
      {
        // Treat as “in view” when a meaningful portion of the card is visible
        root: null,
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.35,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function scrollToSignup() {
    signupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your property"
        description="The safest way to rent your spare room to university students. Set your terms, vet pre-screened applicants, and get paid weekly — free to list until you accept."
        canonicalPath="/list-your-room-c"
        noindex
      />

      <div className="mx-auto flex max-w-site flex-col gap-5 px-5 py-6 md:gap-6 md:px-6 md:py-8 lg:py-9">
        <header className="max-w-3xl">
          {/* Visual headline lives in the chrome on C; keep an sr-only h1 for document outline. */}
          <h1 className="sr-only">The safest way to rent your spare room to university students.</h1>

          <div className="flex items-start gap-3.5">
            <div className="relative h-20 w-20 shrink-0">
              {/* TODO: replace with final approved Quinnie photo */}
              <img
                src={QUINNIE_IMG}
                alt="Quinnie Lee, co-founder of Quni"
                width={88}
                height={88}
                loading="lazy"
                className="h-20 w-20 rounded-full object-cover object-[center_16%]"
              />
              <span
                className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--quni-surface-1)] bg-[var(--quni-trust)]"
                title="Online"
                aria-label="Online"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-navy)] sm:text-base sm:leading-[var(--text-body-lh)]">
                &ldquo;<strong className="font-semibold text-[var(--quni-ink)]">Hi, I&apos;m Quinnie.</strong> I built
                Quni with my partner so a spare room is easy money, not a headache. It takes a few minutes to set up, and
                you can message me anytime — you&apos;ll get me, not a bot.&rdquo;
              </p>
              <p className="mt-2 text-[length:var(--text-caption-size)] font-semibold leading-[var(--text-caption-lh)] text-[var(--quni-navy)]">
                Quinnie Lee, co-founder.
              </p>
            </div>
          </div>
        </header>

        {/*
          mobile: signup → tools → pricing
          md+: tools | signup | pricing
          xl: tools | pricing | signup
        */}
        <div className="grid grid-cols-1 items-stretch gap-4 max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:grid-cols-2 md:gap-5 md:pb-0 xl:grid-cols-3 xl:gap-6">
          {/* Smart tools — functional icons only (no AI sparkles) */}
          <div className="quni-card order-2 flex h-full min-h-0 flex-col p-6 md:order-1">
            <h2 className="font-display text-xl font-bold leading-[var(--text-h3-lh)] tracking-tight text-[var(--quni-ink)] !mt-0 !mb-4">
              Smart tools that save you hours
            </h2>
            <ul className="flex flex-col gap-3.5">
              {SMART_TOOLS.map(({ title, body, Icon }) => (
                <li key={title} className="flex gap-3">
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--quni-coral-soft)] text-[var(--quni-coral-active)]"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-[var(--text-body-sm-lh)] text-[var(--quni-ink)]">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Offer lines — Pricing Listing pattern + paperwork */}
          <div className="quni-card order-3 flex h-full min-h-0 flex-col p-6 md:order-3 xl:order-2">
            <h2 className="font-display text-xl font-bold leading-[var(--text-h3-lh)] tracking-tight text-[var(--quni-ink)] !mt-0 !mb-5">
              Safe and Simple
            </h2>
            <div>
              <OfferLineItem
                icon={CHECK_ICON}
                name="Verified renters"
                value="Included"
                description="Students with checked identity (and enrolment where required)."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="See them before you pay"
                value="Included"
                description="Full request review before the $99 — accept or decline with no fee."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="Your details stay private"
                value="Included"
                description="Email and phone stay masked until you accept."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="The paperwork signs itself."
                value="Included"
                description="NSW and QLD tenancy agreements generated and e-signed in-platform."
                valueKind="coralSm"
              />
              <OfferLineItem
                icon={CHECK_ICON}
                name="No subscription"
                value="Included"
                description="One fee when a tenant is accepted — nothing to list or browse."
                valueKind="coralSm"
              />
            </div>
          </div>

          {/* Signup — first on mobile (after Quinnie), third column on xl */}
          <aside
            ref={signupRef}
            id="list-your-room-c-signup"
            className="quni-card order-1 flex h-full min-h-0 flex-col scroll-mt-24 p-6 md:order-2 xl:order-3"
          >
            <Signup
              embedLandlordInvite
              collapsedEmail
              embedInviteTitle="List your property"
              embedInviteSub={
                <OfferLineItem
                  icon={HOUSE_ICON}
                  name="Listing fee"
                  value="$99.00"
                  description="One-off, only when you accept a tenant. No subscription."
                  valueKind="coralLg"
                />
              }
            />
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA — hidden while signup card is on screen */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--quni-line)] bg-[var(--quni-surface-1)]/95 shadow-[0_-8px_24px_-12px_rgba(8,6,13,0.18)] backdrop-blur-md transition-transform duration-200 md:hidden ${
          signupInView ? 'pointer-events-none translate-y-full' : 'translate-y-0'
        }`}
        aria-hidden={signupInView}
      >
        <div className="mx-auto flex max-w-site items-center justify-between gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="min-w-0 text-[length:var(--text-caption-size)] font-medium leading-[var(--text-caption-lh)] text-[var(--quni-ink-3)]">
            Free to list · $99 on accept
          </p>
          <button
            type="button"
            onClick={scrollToSignup}
            className="shrink-0 rounded-lg bg-[var(--quni-coral)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
          >
            List Your Property
          </button>
        </div>
      </div>
    </div>
  )
}
