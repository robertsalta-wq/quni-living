import { buildLegalFooterText } from '../lib/legalEntity'

type LegalFooterProps = {
  className?: string
}

/** Registered office line — distinct from marketing contact; low visual weight. */
export default function LegalFooter({ className = '' }: LegalFooterProps) {
  return (
    <p className={`text-[10px] sm:text-xs leading-relaxed opacity-80 ${className}`.trim()}>
      {buildLegalFooterText()}
    </p>
  )
}
