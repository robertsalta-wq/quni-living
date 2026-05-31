import {
  tenancyAgreementExplainerCopy,
  type TenancyAgreementExplainerCopy,
} from '../lib/tenancy/jurisdictionCopy'

type Props = {
  state: string
  propertyType: string
  isRegisteredRoomingHouse?: boolean
  className?: string
}

/** Trust copy for the in-platform DocuSeal signing flow — keyed to the listing's jurisdiction. */
export default function TenancyAgreementExplainer({
  state,
  propertyType,
  isRegisteredRoomingHouse = false,
  className = '',
}: Props) {
  const copy: TenancyAgreementExplainerCopy | null = tenancyAgreementExplainerCopy({
    state,
    property_type: propertyType,
    is_registered_rooming_house: isRegisteredRoomingHouse,
  })

  if (!copy) return null

  return (
    <div
      className={`rounded-xl border border-sky-200/90 bg-sky-50/90 px-3 py-2.5 text-left ${className}`.trim()}
      role="note"
    >
      <div className="flex gap-2.5">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-sky-950 leading-snug">{copy.headline}</p>
          <p className="text-[11px] leading-relaxed text-sky-900/90">{copy.body}</p>
        </div>
      </div>
    </div>
  )
}
