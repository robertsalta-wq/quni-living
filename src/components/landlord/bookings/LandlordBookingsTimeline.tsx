import { useMemo, type CSSProperties } from 'react'
import {
  buildTimelineModel,
  formatMoneyCompact,
  pctInWindow,
  type SchedulingBooking,
  type TimelineBar,
} from '../../../lib/landlordBookingsScheduling'
import type { LandlordListingForGroup } from '../../../lib/landlordListingsGrouped'

type Props = {
  listings: LandlordListingForGroup[]
  bookings: SchedulingBooking[]
}

function BarSegment({ bar }: { bar: TimelineBar }) {
  const base =
    'absolute top-1 bottom-1 box-border overflow-hidden rounded-[4px] pointer-events-none'
  if (bar.kind === 'occupied') {
    return (
      <div
        className={`${base} bg-[var(--quni-success)]`}
        style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
        title="Occupied"
      />
    )
  }
  if (bar.kind === 'upcoming') {
    return (
      <div
        className={`${base} border-[1.5px] border-dashed border-[var(--quni-success)]`}
        style={{
          left: `${bar.leftPct}%`,
          width: `${bar.widthPct}%`,
          background: 'rgba(29,158,117,0.15)',
        }}
        title="Upcoming confirmed"
      />
    )
  }
  return (
    <div
      className={`${base} flex items-center justify-center border-[1.5px] border-dashed border-[rgba(255,111,97,0.55)]`}
      style={{
        left: `${bar.leftPct}%`,
        width: `${bar.widthPct}%`,
        background:
          'repeating-linear-gradient(45deg, rgba(255,111,97,0.22), rgba(255,111,97,0.22) 4px, var(--quni-coral-tint) 4px, var(--quni-coral-tint) 8px)',
      }}
      title={bar.label ?? 'Empty'}
    >
      {bar.widthPct >= 8 && bar.label ? (
        <span className="truncate px-1 text-[9px] font-semibold leading-none text-[var(--quni-danger-strong)] sm:text-[10px]">
          {bar.label}
        </span>
      ) : null}
    </div>
  )
}

const MONTH_TICKS = 6

export default function LandlordBookingsTimeline({ listings, bookings }: Props) {
  const model = useMemo(() => buildTimelineModel(listings, bookings), [listings, bookings])
  const { window, groups, stats } = model
  const todayLeft = pctInWindow(window.todayIso, window)

  const monthLabels = useMemo(() => {
    const start = new Date(window.startIso + 'T12:00:00')
    return Array.from({ length: MONTH_TICKS }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
      return d.toLocaleDateString('en-AU', { month: 'short' })
    })
  }, [window.startIso])

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--quni-line)] bg-white p-8 text-center text-sm text-[var(--quni-ink-4)] shadow-[0_1px_2px_rgba(8,6,13,0.08),0_1px_3px_rgba(8,6,13,0.06)]">
        Add an active listing to see occupancy across your rooms.
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          label="Occupied now"
          value={`${stats.occupiedNow} / ${stats.totalRooms}`}
        />
        <StatChip
          label="Empty weeks"
          value={`${stats.emptyWeeks}`}
          sub={stats.rentAtRisk > 0 ? `${formatMoneyCompact(stats.rentAtRisk)} at risk` : undefined}
        />
        <StatChip label="Leases ending ≤45d" value={String(stats.leasesEndingSoon)} />
        <StatChip label="Requests awaiting you" value={String(stats.requestsAwaiting)} accent />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--quni-ink-4)]">
        <LegendSwatch className="bg-[var(--quni-success)]" label="Occupied" />
        <LegendSwatch
          className="border-[1.5px] border-dashed border-[var(--quni-success)] bg-[rgba(29,158,117,0.15)]"
          label="Upcoming"
        />
        <LegendSwatch
          className="border-[1.5px] border-dashed border-[rgba(255,111,97,0.55)]"
          style={{
            background:
              'repeating-linear-gradient(45deg, rgba(255,111,97,0.22), rgba(255,111,97,0.22) 3px, var(--quni-coral-tint) 3px, var(--quni-coral-tint) 6px)',
          }}
          label="Empty"
        />
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--quni-coral)] bg-white" />
          Pending request
        </span>
      </div>

      <div className="rounded-2xl border border-[var(--quni-line)] bg-white p-3 sm:p-5 shadow-[0_1px_2px_rgba(8,6,13,0.08),0_1px_3px_rgba(8,6,13,0.06)] overflow-hidden">
        <div className="mb-2 flex items-end gap-0">
          <div className="w-[88px] shrink-0 sm:w-[220px]" />
          <div className="relative min-w-0 flex-1">
            <div className="grid grid-cols-6 text-[10px] font-medium uppercase tracking-wide text-[var(--quni-ink-5)]">
              {monthLabels.map((m) => (
                <span key={m} className="truncate">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--quni-ink-4)]">
                {g.addressLabel}
                {g.suburb ? (
                  <span className="font-normal text-[var(--quni-ink-5)]"> · {g.suburb}</span>
                ) : null}
              </p>
              {g.rooms.map((room) => (
                <div key={room.propertyId} className="flex items-center gap-0 min-w-0">
                  <div className="w-[88px] shrink-0 pr-2 sm:w-[220px] sm:pr-3">
                    <p className="truncate text-xs font-semibold text-[var(--quni-ink)]" title={room.roomLabel}>
                      {room.roomLabel}
                    </p>
                    <p className="truncate text-[10px] text-[var(--quni-ink-5)]">
                      ${Math.round(room.rentPerWeek)}/wk
                    </p>
                  </div>
                  <div className="relative h-9 min-w-0 flex-1 rounded-md bg-[var(--quni-surface-2)]">
                    {/* month gridlines */}
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-admin-line/80"
                        style={{ left: `${((i + 1) / 6) * 100}%` }}
                      />
                    ))}
                    {room.bars.map((bar, i) => (
                      <BarSegment key={`${bar.kind}-${i}-${bar.leftPct}`} bar={bar} />
                    ))}
                    {/* today line */}
                    <div
                      className="absolute top-0 bottom-0 z-10 w-0 border-l border-dashed border-admin-navy/50"
                      style={{ left: `${todayLeft}%` }}
                      title="Today"
                    />
                    {room.markers.map((m) =>
                      m.kind === 'lease_end' ? (
                        <div
                          key={`${m.bookingId}-end`}
                          className="absolute z-20 -translate-x-1/2"
                          style={{ left: `${m.leftPct}%`, top: '2px' }}
                          title={m.label}
                        >
                          <span className="block h-2 w-2 rounded-full bg-[var(--quni-warning)] ring-2 ring-white" />
                          <span className="absolute left-1/2 top-2.5 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold text-[var(--quni-warning-fg)] sm:text-[9px]">
                            {m.label}
                          </span>
                        </div>
                      ) : (
                        <div
                          key={`${m.bookingId}-pending`}
                          className="absolute z-20 -translate-x-1/2"
                          style={{ left: `${m.leftPct}%`, top: '50%', marginTop: -5 }}
                          title="Pending request"
                        >
                          <span className="block h-2.5 w-2.5 rounded-full border-2 border-[var(--quni-coral)] bg-white" />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatChip({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className={[
        'rounded-2xl border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(8,6,13,0.06)]',
        accent ? 'border-[rgba(255,111,97,0.35)]' : 'border-[var(--quni-line)]',
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--quni-ink-4)]">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--quni-ink)]">{value}</p>
      {sub ? <p className="text-[10px] font-medium text-[var(--quni-danger-strong)]">{sub}</p> : null}
    </div>
  )
}

function LegendSwatch({
  className,
  label,
  style,
}: {
  className: string
  label: string
  style?: CSSProperties
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-4 rounded-sm ${className}`} style={style} />
      {label}
    </span>
  )
}
