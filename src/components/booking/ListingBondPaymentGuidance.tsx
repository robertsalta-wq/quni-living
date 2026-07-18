import NswRentalBondOnlineLink from '../bond/NswRentalBondOnlineLink'
import QldRtaLodgementGuidance from '../bond/QldRtaLodgementGuidance'
import type { ListingBondPaymentTenantGuidance } from '../../lib/tenancy/listingBondPaymentCopy'

type Props = {
  guidance: ListingBondPaymentTenantGuidance
  bondAmountAud?: number | null
  className?: string
}

function formatBondAud(amount: number): string {
  return `$${amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function hasPositiveBondAmount(bondAmountAud: number | null | undefined): bondAmountAud is number {
  return bondAmountAud != null && Number.isFinite(bondAmountAud) && bondAmountAud > 0
}

/** Renter-facing: statutory bond scheme - pay authority (first) or pay landlord. */
export default function ListingBondPaymentGuidance({ guidance, bondAmountAud, className }: Props) {
  if (!hasPositiveBondAmount(bondAmountAud)) {
    return (
      <div
        className={`rounded-admin-md border border-admin-success/90 bg-admin-success-bg px-4 py-3 text-sm text-admin-success-fg space-y-2 ${className ?? ''}`.trim()}
        role="note"
      >
        <p className="font-semibold leading-snug">No bond required for this stay</p>
        <p className="text-xs leading-relaxed text-admin-success-fg">
          Sign your tenancy agreement on Quni when you receive the signing email — you do not need to pay or lodge a
          bond for this booking.
        </p>
      </div>
    )
  }

  const amountPhrase = formatBondAud(bondAmountAud)

  const authorityStep = (
    <>
      <span className="font-semibold">Pay through {guidance.authorityLabel}</span>
      {guidance.preferLandlordCollection ? null : ' (offered first)'}
      <div className="mt-1 pl-4">
        <a
          href={guidance.directPayLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-admin-coral underline underline-offset-2"
        >
          {guidance.directPayLinkLabel}
        </a>
        <NswRentalBondOnlineLink when={guidance.stateLabel === 'NSW'} />
      </div>
      {guidance.directPayNote && !guidance.preferLandlordCollection ? (
        <p className="mt-1 pl-4 text-admin-warning-fg">{guidance.directPayNote}</p>
      ) : null}
    </>
  )

  const hostStep = (
    <>
      <span className="font-semibold">Pay your host directly</span>
      {guidance.preferLandlordCollection ? ' (your host\'s stated preference)' : ''}
      {guidance.hostPayeeAccountName &&
      guidance.hostPayeeBsbDisplay &&
      guidance.hostPayeeAccountNumber &&
      guidance.paymentReference ? (
        <>
          {' '}
          by fee-free bank transfer:
          <div className="mt-1 pl-4 tabular-nums text-xs leading-relaxed">
            Account name: {guidance.hostPayeeAccountName}
            <br />
            BSB: {guidance.hostPayeeBsbDisplay}
            <br />
            Account number: {guidance.hostPayeeAccountNumber}
            <br />
            Reference: {guidance.paymentReference}
          </div>
        </>
      ) : (
        <> (bank transfer, cash, or as agreed)</>
      )}{' '}
      - they must lodge with {guidance.authorityLabel} within {guidance.lodgementDeadlinePhrase} and give you a
      receipt.
      {guidance.hostPayeeAccountName && guidance.paymentReference ? (
        <span className="block mt-1 pl-4 text-admin-warning-fg">
          You may also pay by cash or another method as agreed with your host.
        </span>
      ) : null}
    </>
  )

  const steps = guidance.preferLandlordCollection
    ? [hostStep, authorityStep]
    : [authorityStep, hostStep]

  return (
    <div
      className={`rounded-admin-md border border-admin-warning/90 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg space-y-3 ${className ?? ''}`.trim()}
      role="note"
    >
      <p className="font-semibold leading-snug">How to pay your bond ({amountPhrase})</p>
      <p className="text-xs leading-relaxed text-admin-warning-fg">
        Under {guidance.stateLabel} law, your host must let you choose how to pay
        {guidance.preferLandlordCollection
          ? ' — they prefer to collect and lodge, but you can still lodge directly with the RTA.'
          : '. These are your options, in the order they must be offered:'}
      </p>
      <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-admin-warning-fg">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {guidance.preferLandlordCollection && guidance.directPayNote ? (
        <p className="text-xs text-admin-warning-fg">{guidance.directPayNote}</p>
      ) : null}
      {guidance.stateLabel === 'QLD' ? <QldRtaLodgementGuidance compact embedded /> : null}
      <p className="text-xs text-admin-warning-fg border-t border-admin-warning/80 pt-2">
        Sign your tenancy agreement on Quni when you receive the signing email - you do not need to wait for bond
        confirmation to sign.
      </p>
    </div>
  )
}
