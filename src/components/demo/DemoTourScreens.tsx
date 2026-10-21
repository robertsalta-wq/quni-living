import { LISTING_TIER_ACCEPTANCE_FEE_DISPLAY } from '../../lib/pricing/listingTierAcceptanceFeeDisplay'
import {
  TOUR_ACCEPT_BUTTON,
  TOUR_ID_ROWS,
  landlordTourFixture,
  tourListingFeeRow,
} from '../../lib/demo/landlordTourFixture'

const sample = landlordTourFixture

function Tick({ filled }: { filled?: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        filled
          ? 'bg-[var(--quni-success-bg)] text-[var(--quni-success-fg)]'
          : 'border border-[var(--quni-ink-5)] bg-[var(--quni-surface-1)]'
      }`}
      aria-hidden
    >
      {filled ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3.5 8.2 6.4 11 12.5 4.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

function Initials({ letters }: { letters: string }) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--quni-navy-tint)] text-sm font-semibold text-[var(--quni-navy)]"
      aria-hidden
    >
      {letters}
    </span>
  )
}

function Fact({ label }: { label: string }) {
  return <p className="m-0 text-sm leading-snug text-[var(--quni-ink-2)]">{label}</p>
}

export function ListingScreen() {
  return (
    <div>
      <img
        src={sample.listingPhoto}
        alt=""
        className="block h-32 w-full object-cover"
      />
      <div className="space-y-3 p-4 pr-12">
        <p className="m-0 text-base font-semibold leading-snug text-[var(--quni-ink)]">{sample.listingTitle}</p>
        <p className="m-0 flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-[var(--quni-ink)]">{sample.rent}</span>
          <span className="rounded-full bg-[var(--quni-coral-tint-15)] px-2 py-0.5 text-sm font-semibold text-[var(--quni-coral-active)]">
            {sample.rentTag}
          </span>
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {sample.chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-[var(--quni-surface-3)] px-2.5 py-1 text-sm text-[var(--quni-ink-2)]"
            >
              {chip}
            </li>
          ))}
        </ul>
        {sample.description.map((line) => (
          <p key={line} className="m-0 text-sm leading-snug text-[var(--quni-ink-3)]">
            {line}
          </p>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <Initials letters={sample.hostInitials} />
          <p className="m-0 text-sm font-semibold text-[var(--quni-ink)]">{sample.hostLine}</p>
        </div>
      </div>
    </div>
  )
}

export function ApplicantScreen() {
  return (
    <div className="space-y-3 p-4 pr-12">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--quni-info-bg)] px-2.5 py-1 text-sm font-semibold text-[var(--quni-info-fg)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--quni-info-fg)]" aria-hidden />
        {sample.requestStatus}
      </span>
      <div className="flex items-center gap-3">
        <Initials letters={sample.applicantInitials} />
        <div className="min-w-0">
          <p className="m-0 text-base font-semibold text-[var(--quni-ink)]">{sample.applicantName}</p>
          <p className="m-0 text-sm leading-snug text-[var(--quni-ink-3)]">{sample.applicantLine}</p>
        </div>
      </div>
      <div className="space-y-1.5 border-t border-[var(--quni-line)] pt-3">
        <Fact label={sample.moveInRow} />
        <Fact label={sample.stayRow} />
        <Fact label={sample.rentRow} />
      </div>
      <p className="m-0 rounded-[var(--radius-md)] bg-[var(--quni-surface-2)] px-3 py-2.5 text-sm leading-snug text-[var(--quni-ink-2)]">
        {sample.applicantMessage}
      </p>
    </div>
  )
}

export function ChecksScreen() {
  return (
    <div className="space-y-3 p-4 pr-12">
      <p className="m-0 text-base font-semibold text-[var(--quni-ink)]">{sample.checksHeading}</p>
      <ul className="m-0 list-none space-y-3 p-0">
        {TOUR_ID_ROWS.map((row) => (
          <li key={row} className="flex items-center gap-3 text-sm leading-snug text-[var(--quni-ink)]">
            <Tick filled />
            {row}
          </li>
        ))}
      </ul>
      <p className="m-0 border-t border-[var(--quni-line)] pt-3 text-sm leading-snug text-[var(--quni-ink-4)]">
        {sample.checksNote}
      </p>
    </div>
  )
}

export function AcceptScreen({ onAccept }: { onAccept: () => void }) {
  const feeRow = tourListingFeeRow(LISTING_TIER_ACCEPTANCE_FEE_DISPLAY, sample.feeWaived)
  return (
    <div className="space-y-3 p-4 pr-12">
      <div className="space-y-1.5">
        {sample.acceptRows.map((row) => (
          <Fact key={row} label={row} />
        ))}
      </div>
      <p className="m-0 border-t border-[var(--quni-line)] pt-3 text-sm font-semibold leading-snug text-[var(--quni-ink)]">
        {feeRow}
      </p>
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--quni-line)] bg-transparent px-3 text-sm font-semibold text-[var(--quni-ink-4)]"
        >
          {sample.declineLabel}
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--quni-coral)] px-3 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)]"
        >
          {TOUR_ACCEPT_BUTTON}
        </button>
      </div>
    </div>
  )
}

export function AgreementScreen() {
  return (
    <div className="relative p-4 pr-12">
      <p
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-lg font-bold uppercase leading-tight tracking-wide text-[var(--quni-ink)] opacity-[0.12]"
        aria-hidden
      >
        {sample.agreementWatermark}
      </p>
      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--quni-surface-3)] text-[var(--quni-ink-3)]"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
              <path d="M14 3.5V9h5.5" />
            </svg>
          </span>
          <p className="m-0 pt-1 text-base font-semibold leading-snug text-[var(--quni-ink)]">{sample.agreementTitle}</p>
        </div>
        <div className="space-y-1.5">
          {sample.agreementRows.map((row) => (
            <Fact key={row} label={row} />
          ))}
        </div>
        <ul className="m-0 list-none space-y-2 border-t border-[var(--quni-line)] pt-3 p-0">
          {sample.waitingToSign.map((row) => (
            <li key={row} className="flex items-center gap-3 text-sm leading-snug text-[var(--quni-ink-2)]">
              <Tick />
              {row}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function ConfirmedScreen() {
  return (
    <div className="space-y-4 p-4 pr-12">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--quni-success-bg)] text-[var(--quni-success-fg)]"
          aria-hidden
        >
          <svg viewBox="0 0 16 16" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3.5 8.2 6.4 11 12.5 4.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="m-0 text-base font-semibold text-[var(--quni-ink)]">{sample.confirmedTitle}</p>
        <p className="m-0 text-sm text-[var(--quni-ink-3)]">{sample.confirmedWhen}</p>
      </div>
      <ul className="m-0 list-none space-y-2 border-t border-[var(--quni-line)] pt-3 p-0">
        {sample.signedRows.map((row) => (
          <li key={row} className="flex items-center gap-3 text-sm leading-snug text-[var(--quni-ink)]">
            <Tick filled />
            {row}
          </li>
        ))}
      </ul>
    </div>
  )
}
