import { Link } from 'react-router-dom'
import AiSparkleIcon from './AiSparkleIcon'

const LOGO_SRC = '/quni-logo.png'

/**
 * PNG wordmark recolor via CSS mask only works if the asset has real alpha around the artwork.
 * Many raster logos are exported on an opaque rectangle, which reads as a solid color block when masked.
 * For the AI landing header we use the vector favicon + purple wordmark text instead.
 */
function QuniLogoImg({ wordmarkColor }: { wordmarkColor?: string }) {
  const sizeClass = 'h-9 w-auto max-w-full object-contain object-left sm:h-10'

  if (!wordmarkColor) {
    return <img src={LOGO_SRC} alt="Quni" className={sizeClass} />
  }

  return (
    <span className="inline-flex items-center shrink-0 h-9 sm:h-10">
      <span
        className="font-display font-bold leading-none tracking-tight text-[2rem] sm:text-[2.15rem]"
        style={{ color: wordmarkColor }}
      >
        Quni
      </span>
    </span>
  )
}

/** Same logo + AI entry as the main site header (size, spacing, home link). */
export default function SiteBrandLockup({ logoWordmarkColor }: { logoWordmarkColor?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 shrink-0">
      <Link
        to="/"
        className="flex min-w-0 items-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 rounded-sm"
        aria-label={logoWordmarkColor ? 'Quni' : undefined}
      >
        <QuniLogoImg wordmarkColor={logoWordmarkColor} />
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
