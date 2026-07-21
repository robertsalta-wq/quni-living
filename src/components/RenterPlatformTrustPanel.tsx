import { Link } from 'react-router-dom'
import LegalFooter from './LegalFooter'
import {
  RENTER_PLATFORM_CONTACT_EMAIL,
  RENTER_PLATFORM_TRUST_LINKS,
  RENTER_PLATFORM_TRUST_POINTS,
} from '../lib/platformTrustCopy'

type Props = {
  /** Fewer bullets on signup where space is tight. */
  compact?: boolean
  className?: string
}

export default function RenterPlatformTrustPanel({ compact = false, className = '' }: Props) {
  const points = compact ? RENTER_PLATFORM_TRUST_POINTS.slice(0, 3) : RENTER_PLATFORM_TRUST_POINTS

  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-stone-50/80 p-5 sm:p-6 ${className}`.trim()}
      aria-labelledby="renter-platform-trust-heading"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">About Quni</p>
      <h2 id="renter-platform-trust-heading" className="mt-1 text-base font-semibold text-gray-900 leading-snug">
        A legitimate Australian rental platform
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        If you arrived from a landlord link or message, this is the official application site for that listing — not a
        third-party form. You can review the property and how verification works before sharing ID documents.
      </p>

      <ul className="mt-4 space-y-3">
        {points.map((point) => (
          <li key={point.id} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" aria-hidden />
            <span>
              <span className="font-medium text-gray-900">{point.title}. </span>
              {point.body}
            </span>
          </li>
        ))}
      </ul>

      <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-gray-600" aria-label="Learn more">
        {RENTER_PLATFORM_TRUST_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="text-[var(--quni-trust)] hover:text-[var(--quni-trust-hover)] hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>

      <p className="mt-3 text-xs text-gray-500">
        Questions?{' '}
        <a
          href={`mailto:${RENTER_PLATFORM_CONTACT_EMAIL}`}
          className="font-medium text-gray-700 hover:text-gray-900 hover:underline"
        >
          {RENTER_PLATFORM_CONTACT_EMAIL}
        </a>
      </p>

      <LegalFooter className="mt-4 text-stone-500" />
    </section>
  )
}
