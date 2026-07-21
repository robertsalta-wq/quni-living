type Props = {
  moveInLabel: string
  endLabel: string
  weeklyRentLabel: string
}

export default function BookingListDetailStrip({ moveInLabel, endLabel, weeklyRentLabel }: Props) {
  return (
    <div className="border-y border-[var(--quni-line-soft)] py-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--quni-ink-5)]">Move-in → End</p>
          <p className="mt-1 text-[13px] text-[var(--quni-ink)]">
            {moveInLabel}
            <span className="text-[var(--quni-ink-4)]"> → </span>
            {endLabel}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--quni-ink-5)]">Rent / wk</p>
          <p className="mt-1 text-[13px] font-bold tabular-nums text-[var(--quni-ink)]">{weeklyRentLabel}</p>
        </div>
      </div>
    </div>
  )
}
