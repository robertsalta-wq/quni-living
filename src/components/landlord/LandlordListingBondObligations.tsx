import type { ListingBondPaymentLandlordObligations } from '../../lib/tenancy/listingBondPaymentCopy'

type Props = {
  obligations: ListingBondPaymentLandlordObligations
  className?: string
}

export default function LandlordListingBondObligations({ obligations, className }: Props) {
  return (
    <div
      className={`rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 space-y-2 ${className ?? ''}`.trim()}
      role="note"
    >
      <p className="font-semibold leading-snug">Bond — your legal obligations ({obligations.stateLabel})</p>
      <ul className="list-disc list-inside space-y-2 text-xs leading-relaxed text-sky-900">
        <li>{obligations.mustOfferAuthorityFirst}</li>
        <li>
          {obligations.ifPaidToLandlord}{' '}
          <a
            href={obligations.authorityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#FF6F61] underline underline-offset-2"
          >
            {obligations.authorityLabel}
          </a>
        </li>
      </ul>
    </div>
  )
}
