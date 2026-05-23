import { Link } from 'react-router-dom'
import AiSparkleIcon from './AiSparkleIcon'

const LOGO = {
  default: { src: '/quni-logo.png', srcSet: '/quni-logo.png 1x, /quni-logo@2x.png 2x' },
  ai: { src: '/quni-logo-ai-purple.png', srcSet: '/quni-logo-ai-purple.png 1x, /quni-logo-ai-purple@2x.png 2x' },
} as const

type LogoVariant = keyof typeof LOGO

function QuniLogoImg({ variant }: { variant: LogoVariant }) {
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

/** Same logo + AI entry as the main site header (size, spacing, home link). */
export default function SiteBrandLockup({ variant = 'default' }: { variant?: LogoVariant }) {
  const isAi = variant === 'ai'
  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 shrink-0">
      <Link
        to="/"
        className={`flex min-w-0 items-center shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          isAi ? 'focus-visible:outline-stone-200' : 'focus-visible:outline-gray-900'
        }`}
      >
        <QuniLogoImg variant={variant} />
      </Link>
      <Link
        to="/landlords/ai"
        className="inline-flex items-center justify-center rounded-xl border border-[#FF6F61]/25 bg-[#FF6F61]/[0.08] p-2 text-[#FF6F61] hover:bg-[#FF6F61]/15 hover:border-[#FF6F61]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61] transition-colors"
        aria-label="Landlord AI features"
        title="Landlord AI features"
      >
        <AiSparkleIcon className="h-6 w-6 sm:h-7 sm:w-7" />
      </Link>
    </div>
  )
}
