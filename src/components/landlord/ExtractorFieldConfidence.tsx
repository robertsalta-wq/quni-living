/** Subtle confidence marker for extractor-prefilled fields. */
import type { ExtractConfidence } from '../../lib/listingExtractor/types'

type Props = {
  confidence: ExtractConfidence | null | undefined
  className?: string
}

export default function ExtractorFieldConfidence({ confidence, className = '' }: Props) {
  if (!confidence) return null
  if (confidence === 'high') {
    return (
      <span
        data-extractor-confidence="high"
        className={`ml-2 inline-flex items-center rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ${className}`}
      >
        From your listing
      </span>
    )
  }
  return (
    <span
      data-extractor-confidence="low"
      className={`ml-2 inline-flex items-center rounded-full bg-[rgba(234,179,8,0.18)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ${className}`}
    >
      Review this
    </span>
  )
}
