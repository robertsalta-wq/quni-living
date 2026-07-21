import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildCalendarEvents,
  buildMonthGrid,
  calendarEventChipClass,
  calendarEventDotClass,
  monthLabel,
  toIsoDate,
  type CalendarEvent,
  type CalendarEventKind,
  type SchedulingBooking,
} from '../../../lib/landlordBookingsScheduling'

type Props = {
  bookings: SchedulingBooking[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEGEND: Array<{ kind: CalendarEventKind; label: string }> = [
  { kind: 'move_in', label: 'Move-in' },
  { kind: 'move_out', label: 'Move-out / lease end' },
  { kind: 'bond_due', label: 'Deposit / bond due' },
  { kind: 'rent_payout', label: 'Rent payout' },
  { kind: 'pending_request', label: 'Request awaiting you' },
  { kind: 'admin', label: 'Admin' },
]

export default function LandlordBookingsCalendar({ bookings }: Props) {
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(today)
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))

  const monthIso = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`
  const events = useMemo(
    () => buildCalendarEvents(bookings, { today, monthIso }),
    [bookings, today, monthIso],
  )
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const list = map.get(e.dateIso) ?? []
      list.push(e)
      map.set(e.dateIso, list)
    }
    return map
  }, [events])

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor.year, cursor.month])

  const agendaDays = useMemo(() => {
    const dates = [...eventsByDate.keys()].sort()
    return dates.map((dateIso) => ({
      dateIso,
      events: eventsByDate.get(dateIso) ?? [],
    }))
  }, [eventsByDate])

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg border border-[var(--quni-line)] bg-white px-2.5 py-1.5 text-sm font-semibold text-[var(--quni-navy)] hover:bg-[var(--quni-surface-2)]"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="text-base font-semibold text-[var(--quni-ink)] font-admin-display sm:text-lg">
          {monthLabel(cursor.year, cursor.month)}
        </h3>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg border border-[var(--quni-line)] bg-white px-2.5 py-1.5 text-sm font-semibold text-[var(--quni-navy)] hover:bg-[var(--quni-surface-2)]"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[var(--quni-ink-4)]">
        {LEGEND.map((l) => (
          <span key={l.kind} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${calendarEventDotClass(l.kind)}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Mobile: mini grid + agenda */}
      <div className="sm:hidden space-y-4">
        <div className="quni-dashboard-panel p-3">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[9px] font-semibold uppercase text-[var(--quni-ink-5)]">
                {d.slice(0, 1)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateIso) ?? []
              const isToday = cell.dateIso === todayIso
              const isPast = cell.dateIso < todayIso
              return (
                <div
                  key={cell.dateIso}
                  className={[
                    'flex flex-col items-center rounded-lg py-1.5 min-h-[40px]',
                    !cell.inMonth ? 'opacity-30' : '',
                    isPast && cell.inMonth ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-6 w-6 items-center justify-center text-xs font-semibold',
                      isToday
                        ? 'rounded-full ring-2 ring-[var(--quni-coral)] text-[var(--quni-ink)]'
                        : 'text-[var(--quni-ink-2)]',
                    ].join(' ')}
                  >
                    {cell.day}
                  </span>
                  {dayEvents.length > 0 ? (
                    <div className="mt-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`h-1.5 w-1.5 rounded-full ${calendarEventDotClass(e.kind)}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          {agendaDays.length === 0 ? (
            <p className="rounded-2xl border border-[var(--quni-line)] bg-white p-6 text-center text-sm text-[var(--quni-ink-4)]">
              No events this month.
            </p>
          ) : (
            agendaDays.map(({ dateIso, events: dayEvents }) => {
              const d = new Date(dateIso + 'T12:00:00')
              return (
                <div key={dateIso} className="space-y-1.5">
                  {dayEvents.map((e) => (
                    <AgendaRow key={e.id} event={e} date={d} />
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop: month grid with chips */}
      <div className="quni-dashboard-panel hidden sm:block">
        <div className="grid grid-cols-7 border-b border-[var(--quni-line)] bg-[var(--quni-surface-2)]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--quni-ink-4)]"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {cells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateIso) ?? []
            const isToday = cell.dateIso === todayIso
            const isPast = cell.dateIso < todayIso
            return (
              <div
                key={cell.dateIso}
                className={[
                  'min-h-[96px] border-b border-r border-[var(--quni-line)] p-1.5',
                  !cell.inMonth ? 'bg-admin-surface-2/60' : 'bg-white',
                  isPast && cell.inMonth ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-6 w-6 items-center justify-center text-xs font-semibold',
                    isToday
                      ? 'rounded-full ring-2 ring-[var(--quni-coral)] text-[var(--quni-ink)]'
                      : cell.inMonth
                        ? 'text-[var(--quni-ink-2)]'
                        : 'text-[var(--quni-ink-5)]',
                  ].join(' ')}
                >
                  {cell.day}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <EventChip key={e.id} event={e} />
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="text-[10px] font-medium text-[var(--quni-ink-4)]">+{dayEvents.length - 3} more</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventChip({ event }: { event: CalendarEvent }) {
  const inner = (
    <span
      className={`block truncate rounded border px-1 py-0.5 text-[10px] font-semibold leading-tight ${calendarEventChipClass(event.kind)}`}
      title={event.title}
    >
      {event.title}
    </span>
  )
  if (event.bookingId) {
    return (
      <Link to={`/landlord/bookings/${event.bookingId}/review`} className="block hover:opacity-90">
        {inner}
      </Link>
    )
  }
  return inner
}

function AgendaRow({ event, date }: { event: CalendarEvent; date: Date }) {
  const badge = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const body = (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--quni-line)] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(8,6,13,0.06)]">
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--quni-surface-2)] text-center">
        <span className="text-[10px] font-semibold uppercase text-[var(--quni-ink-4)]">
          {date.toLocaleDateString('en-AU', { weekday: 'short' })}
        </span>
        <span className="text-sm font-bold tabular-nums text-[var(--quni-ink)] leading-none">
          {date.getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${calendarEventDotClass(event.kind)}`} />
          <p className="truncate text-sm font-semibold text-[var(--quni-ink)]">{event.title}</p>
        </div>
        {event.subtitle ? (
          <p className="mt-0.5 truncate text-xs text-[var(--quni-ink-4)]">{event.subtitle}</p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--quni-ink-5)]">{badge}</p>
        )}
      </div>
    </div>
  )
  if (event.bookingId) {
    return (
      <Link to={`/landlord/bookings/${event.bookingId}/review`} className="block">
        {body}
      </Link>
    )
  }
  return body
}
