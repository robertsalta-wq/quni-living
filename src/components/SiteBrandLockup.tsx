import { Link } from 'react-router-dom'
import AiSparkleIcon from './AiSparkleIcon'

const LOGO = {
  default: { src: '/quni-logo.png', srcSet: '/quni-logo.png 1x, /quni-logo@2x.png 2x' },
  ai: { src: '/quni-logo-ai-purple.png', srcSet: '/quni-logo-ai-purple.png 1x, /quni-logo-ai-purple@2x.png 2x' },
} as const

type LogoVariant = keyof typeof LOGO

/** Same focus ring as marketing header — no coral dashboard-only outline. */
export const quniLogoHomeLinkClassName =
  'flex min-w-0 shrink-0 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900'

/**
 * "Dashboard" next to the logo — optically matched to the Quni letterforms
 * (not the 36/40px logo image box). Pair with `items-center` on the parent
 * (baseline alignment with an <img> sits the word too high).
 */
export const quniDashboardLabelClassName =
  'font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-[var(--quni-ink)] sm:text-2xl'

export function QuniLogoImg({ variant = 'default' }: { variant?: LogoVariant }) {
  const { src, srcSet } = LOGO[variant]
  return (
    <img
      src={src}
      srcSet={srcSet}
      alt="Quni"
      width={120}
      height={40}
      className="h-9 w-auto max-w-full object-contain object-left sm:h-10"
    />
  )
}

/**
 * Brand logo → marketing home `/`.
 * Established rule: logo is the Home control; no separate Home nav item.
 */
export function QuniLogoHomeLink({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={[quniLogoHomeLinkClassName, className].filter(Boolean).join(' ')}
      aria-label="Quni home"
    >
      <QuniLogoImg />
    </Link>
  )
}

/**
 * Marketing mobile left-cell logo wrapper (SiteBrandLockup without the AI control).
 * Keep this class string identical so dashboard and marketing share the same mark box.
 */
export const QUNI_LOGO_MARK_WRAP_CLASS = 'flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2'

/**
 * Dashboard brand: same logo mark box as marketing, plus "Dashboard".
 * Height is locked to the logo (`h-9` / `sm:h-10`) so the label’s font metrics
 * cannot grow the flex cluster and shift the logo within the chrome row.
 */
export function DashboardBrandLockup() {
  return (
    <div className="min-w-0 shrink-0" data-chrome-brand="dashboard">
      <div className="flex h-9 items-center gap-2 sm:h-10">
        <div className={QUNI_LOGO_MARK_WRAP_CLASS}>
          <QuniLogoHomeLink />
        </div>
        <span className={quniDashboardLabelClassName}>Dashboard</span>
      </div>
    </div>
  )
}

/** Same logo + AI entry as the main site header (size, spacing, home link). */
export default function SiteBrandLockup({ variant = 'default' }: { variant?: LogoVariant }) {
  const isAi = variant === 'ai'
  return (
    <div className={QUNI_LOGO_MARK_WRAP_CLASS} data-chrome-brand="marketing">
      {isAi ? (
        <Link
          to="/"
          className={`${quniLogoHomeLinkClassName} focus-visible:outline-stone-200`}
          aria-label="Quni home"
        >
          <QuniLogoImg variant="ai" />
        </Link>
      ) : (
        <QuniLogoHomeLink />
      )}
      <Link
        to="/landlords/ai"
        className={`items-center justify-center rounded-xl border border-[#FF6F61]/25 bg-[#FF6F61]/[0.08] p-2 text-[#FF6F61] hover:bg-[#FF6F61]/15 hover:border-[#FF6F61]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61] transition-colors ${
          isAi ? 'inline-flex' : 'hidden md:inline-flex'
        }`}
        aria-label="Landlord AI features"
        title="Landlord AI features"
      >
        <AiSparkleIcon className="h-6 w-6 sm:h-7 sm:w-7" />
      </Link>
    </div>
  )
}
