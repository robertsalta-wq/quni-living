import { WHY_QUNI_TRUST } from '../lib/dataResidencyCopy'

type Props = {
  className?: string
}

/** Logged-out trust signal: Australian data residency (homepage, How it works, etc.). */
export default function WhyQuniTrustBlock({ className = '' }: Props) {
  return (
    <div
      className={`mx-auto max-w-3xl rounded-2xl border border-[var(--quni-trust-bg)] bg-[var(--quni-trust-bg)] p-8 sm:p-10 shadow-sm ${className}`.trim()}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quni-trust)]">
        {WHY_QUNI_TRUST.eyebrow}
      </p>
      <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl !mt-0 !mb-4">
        {WHY_QUNI_TRUST.title}
      </h2>
      <p className="text-sm leading-relaxed text-gray-600 sm:text-base">{WHY_QUNI_TRUST.body}</p>
    </div>
  )
}
