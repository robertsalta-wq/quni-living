import NswRentalBondOnlineLink from '../bond/NswRentalBondOnlineLink'
import type { ListingBondPaymentTenantGuidance } from '../../lib/tenancy/listingBondPaymentCopy'

type Props = {
  guidance: ListingBondPaymentTenantGuidance
  bondAmountAud?: number | null
  className?: string
}

function formatBondAud(amount: number): string {
  return `$${amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

/** Renter-facing: statutory bond scheme - pay authority (first) or pay landlord. */
export default function ListingBondPaymentGuidance({ guidance, bondAmountAud, className }: Props) {
  const amountPhrase =
    bondAmountAud != null && Number.isFinite(bondAmountAud) && bondAmountAud > 0
      ? formatBondAud(bondAmountAud)
      : 'the bond amount on your booking'

  return (
    <div
      className={`rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 space-y-3 ${className ?? ''}`.trim()}
      role="note"
    >
      <p className="font-semibold leading-snug">How to pay your bond ({amountPhrase})</p>
      <p className="text-xs leading-relaxed text-amber-900/95">
        Under {guidance.stateLabel} law, your host must let you choose how to pay. These are your options, in the order
        they must be offered:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-amber-950">
        <li>
          <span className="font-semibold">Pay through {guidance.authorityLabel}</span> (offered first)
          <div className="mt-1 pl-4">
            <a
              href={guidance.directPayLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#FF6F61] underline underline-offset-2"
            >
              {guidance.directPayLinkLabel}
            </a>
            <NswRentalBondOnlineLink when={guidance.stateLabel === 'NSW'} />
          </div>
          {guidance.directPayNote && <p className="mt-1 pl-4 text-amber-900/90">{guidance.directPayNote}</p>}
        </li>
        <li>
          <span className="font-semibold">Pay your host directly</span> (bank transfer, cash, or as agreed) - they must
          lodge with {guidance.authorityLabel} within {guidance.lodgementDeadlinePhrase} and give you a receipt.
        </li>
      </ol>
      <p className="text-xs text-amber-900/90 border-t border-amber-200/80 pt-2">
        Sign your tenancy agreement on Quni when you receive the signing email - you do not need to wait for bond
        confirmation to sign.
      </p>
    </div>
  )
}
