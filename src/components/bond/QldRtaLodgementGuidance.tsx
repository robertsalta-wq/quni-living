import { QLD_RTA_BOARDERS_LODGERS_URL, QLD_RTA_HOME_URL, QLD_RTA_LODGEMENT_STEPS } from '../../lib/tenancy/qldRtaBondCopy'

type Props = {
  className?: string
  compact?: boolean
  /** Strip bordered card chrome when nested inside another tinted panel. */
  embedded?: boolean
}

/** QLD scheme: receipt → RTA Web Services / Form 2 → Acknowledgement of Rental Bond. */
export default function QldRtaLodgementGuidance({ className, compact = false, embedded = false }: Props) {
  return (
    <div
      className={`${
        embedded
          ? 'text-xs leading-relaxed text-sky-950'
          : 'rounded-lg border border-sky-200/90 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-950'
      } ${className ?? ''}`.trim()}
      role="note"
    >
      <p className="font-semibold text-sky-900">{compact ? 'QLD RTA lodgement' : 'After bond is received or paid (Queensland)'}</p>
      <ol className="list-decimal list-inside mt-1.5 space-y-1">
        {QLD_RTA_LODGEMENT_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-sky-900/90">
        <a
          href={QLD_RTA_HOME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#FF6F61] underline underline-offset-2"
        >
          RTA Queensland
        </a>
        {' · '}
        <a
          href={QLD_RTA_BOARDERS_LODGERS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#FF6F61] underline underline-offset-2"
        >
          Boarders and lodgers
        </a>
      </p>
      {!compact ? (
        <p className="mt-2 text-sky-900/85 border-t border-sky-200/70 pt-2">
          Not lodging within 10 days, or keeping bond in a personal account, is an offence under Queensland law. A bond
          is not compulsory — rent in advance is a lawful alternative.
        </p>
      ) : null}
    </div>
  )
}
