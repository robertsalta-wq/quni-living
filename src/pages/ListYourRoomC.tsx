import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Banknote,
  FileSignature,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  SpellCheck,
  UserCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import Signup from './Signup'
import { LEGAL_ENTITY_NAME, getFallbackLegalEntity } from '../lib/legalEntity'
import { formatAustralianAbn } from '../lib/platformIdentity'

/** Interim ABN for invite card until public_legal_entity always supplies it. */
const INVITE_ABN_FALLBACK = '65675990968'

/** TODO: replace with final approved Quinnie photo (same asset as `/list-your-room`). */
const QUINNIE_IMG = '/landlord-invite/quinnie.jpg'

const pillClass =
  'inline-flex items-center rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-2.5 py-0.5 text-[length:var(--text-micro-size)] font-semibold leading-[var(--text-micro-lh)] text-[var(--quni-ink-3)]'

const pillTrustClass =
  'inline-flex items-center rounded-full border border-[var(--quni-trust)]/25 bg-[var(--quni-trust-bg)] px-2.5 py-0.5 text-[length:var(--text-micro-size)] font-semibold leading-[var(--text-micro-lh)] text-[var(--quni-trust)]'

const pillCoralClass =
  'inline-flex items-center rounded-full border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-2.5 py-0.5 text-[length:var(--text-micro-size)] font-semibold leading-[var(--text-micro-lh)] text-[var(--quni-coral-active)]'

type AiFeature = {
  label: string
  Icon: LucideIcon
  badge?: string
}

const AI_FEATURES: AiFeature[] = [
  { label: 'Write or regenerate your listing description', Icon: Sparkles, badge: 'AI Draft' },
  { label: 'Proofread and polish listing copy', Icon: SpellCheck },
  { label: 'Suggest weekly rent from your listing', Icon: Banknote, badge: '$320/wk estimate' },
  { label: 'Draft replies to student enquiries', Icon: MessageSquareText },
  { label: 'Assess applicant fit before you accept or decline', Icon: UserCheck, badge: 'AI Fit' },
]

const REVIEW_BADGES = ['ID Verified', 'Contact Info Masked', 'AI Fit Score'] as const

const FEE_STEPS = [
  { label: '$0 to List' },
  { label: '$0 to Review' },
  { label: '$99 on Acceptance' },
] as const

/**
 * Visual-scannable A/B/C variant of `/list-your-room-b`.
 * Same copy bones; icons, pills, and a fee flow instead of dense paragraphs. Preview-gated.
 */
export default function ListYourRoomC() {
  const entity = getFallbackLegalEntity()
  const abn = entity.abn.trim() || INVITE_ABN_FALLBACK
  const legalLine = `${entity.legalName.trim() || LEGAL_ENTITY_NAME} t/a Quni Living · ABN ${formatAustralianAbn(abn)} · ${entity.registeredState}`

  return (
    <div className="bg-[var(--quni-surface-1)]">
      <Seo
        title="List your property"
        description="More income from your spare room. Zero hassle — free to list until you accept. One-off $99 when you place a tenant."
        canonicalPath="/list-your-room-c"
        noindex
      />

      <div className="mx-auto flex max-w-site flex-col gap-5 px-5 py-6 md:gap-6 md:px-6 md:py-8 lg:py-9">
        <header className="max-w-3xl">
          <h1 className="sr-only">More income from your spare room. Zero hassle.</h1>

          <div className="flex items-start gap-3.5">
            <div className="relative h-20 w-20 shrink-0">
              {/* TODO: replace with final approved Quinnie photo */}
              <img
                src={QUINNIE_IMG}
                alt="Quinnie Le, co-founder of Quni"
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
                Quinnie Le, co-founder.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6">
          {/* AI features */}
          <div className="quni-card order-2 flex h-full min-h-0 flex-col p-6 md:order-1">
            <p className="eyebrow mb-3 !font-bold text-[var(--quni-coral-active)]">Included free</p>
            <h2 className="font-display text-xl font-bold leading-[var(--text-h3-lh)] tracking-tight text-[var(--quni-ink)] !mt-0 !mb-4">
              AI tools while you list
            </h2>
            <ul className="flex flex-col gap-3">
              {AI_FEATURES.map(({ label, Icon, badge }) => (
                <li key={label} className="flex gap-3">
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--quni-coral-soft)] text-[var(--quni-coral-active)]"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-[var(--text-body-sm-lh)] text-[var(--quni-ink-2)]">
                      {label}
                    </p>
                    {badge ? (
                      <span className={`${pillCoralClass} mt-1.5`}>{badge}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing & process — visual */}
          <div className="quni-card order-3 flex h-full min-h-0 flex-col p-6 md:order-3 xl:order-2">
            <div className="pb-3.5">
              <h2 className="font-display text-lg font-bold text-[var(--quni-ink)] !mt-0 !mb-2.5">
                Free until you accept.
              </h2>
              <div className="flex flex-wrap gap-2">
                {REVIEW_BADGES.map((badge) => (
                  <span key={badge} className={pillTrustClass}>
                    <ShieldCheck className="mr-1 h-3 w-3" aria-hidden strokeWidth={2.5} />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--quni-line-soft)] py-3.5">
              <h2 className="font-display text-lg font-bold text-[var(--quni-ink)] !mt-0 !mb-2.5">
                $99 once — when you say yes.
              </h2>
              <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {FEE_STEPS.map((step, i) => (
                  <li key={step.label} className="flex items-center gap-1.5 sm:gap-2">
                    <span className={i === FEE_STEPS.length - 1 ? pillCoralClass : pillClass}>{step.label}</span>
                    {i < FEE_STEPS.length - 1 ? (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--quni-ink-5)]" aria-hidden />
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-2.5 text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--quni-ink-4)]">
                Not charged to list, browse, or decline. See{' '}
                <Link to="/pricing" className="font-semibold text-[var(--quni-coral)] hover:underline">
                  Pricing
                </Link>
                .
              </p>
            </div>

            <div className="border-t border-[var(--quni-line-soft)] pt-3.5">
              <h2 className="font-display text-lg font-bold text-[var(--quni-ink)] !mt-0 !mb-2.5">
                The paperwork signs itself.
              </h2>
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--quni-navy-tint)] text-[var(--quni-navy)]"
                  aria-hidden
                >
                  <FileSignature className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <span className={pillClass}>Legally Binding NSW Agreement</span>
                  <span className={pillTrustClass}>Auto E-Signed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signup */}
          <aside className="quni-card order-1 flex h-full min-h-0 flex-col p-6 md:order-2 xl:order-3">
            <Signup
              embedLandlordInvite
              collapsedEmail
              embedInviteTitle="List your property"
              embedInviteSub={
                <>
                  Free to list. Pay{' '}
                  <strong className="font-semibold text-[var(--quni-ink)]">$99 only when you accept</strong> — takes a
                  few minutes.
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
