import { Link } from 'react-router-dom'

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

export function AiSparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
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
