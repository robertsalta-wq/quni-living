/**
 * Landlord Bookings scheduling helpers: Timeline occupancy, Calendar events, Next 7 days.
 * Pure derivation from listings + bookings — no UI.
 */

import {
  groupLandlordListings,
  landlordRoomDisplayName,
  type LandlordListingForGroup,
} from './landlordListingsGrouped'

export type BookingsScheduleView = 'requests' | 'calendar' | 'timeline'

export const BOOKINGS_SCHEDULE_VIEWS: ReadonlyArray<{ value: BookingsScheduleView; label: string }> = [
  { value: 'requests', label: 'Requests' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'timeline', label: 'Timeline' },
]

export function parseBookingsScheduleView(raw: string | null | undefined): BookingsScheduleView {
  if (raw === 'calendar' || raw === 'timeline' || raw === 'requests') return raw
  return 'requests'
}

/** Occupying / upcoming confirmed tenancies for bars. */
const OCCUPANCY_STATUSES = new Set(['confirmed', 'active', 'bond_pending'])
/** Awaiting landlord action. */
const PENDING_REQUEST_STATUSES = new Set(['pending_confirmation', 'awaiting_info'])

export type SchedulingBooking = {
  id: string
  property_id: string | null
  status: string
  move_in_date: string | null
  start_date: string | null
  end_date: string | null
  weekly_rent: number | string | null
  expires_at?: string | null
  confirmed_at?: string | null
  created_at?: string | null
  student_name?: string | null
  property_title?: string | null
  service_tier?: string | null
}

export type SchedulingWindow = {
  /** Inclusive YYYY-MM-DD */
  startIso: string
  /** Inclusive YYYY-MM-DD */
  endIso: string
  todayIso: string
  totalDays: number
}

export type TimelineBarKind = 'occupied' | 'upcoming' | 'empty'

export type TimelineBar = {
  kind: TimelineBarKind
  leftPct: number
  widthPct: number
  /** Empty bars only */
  label?: string
  weeks?: number
  rentMissed?: number
  bookingId?: string
}

export type TimelineMarker = {
  kind: 'lease_end' | 'pending_request'
  leftPct: number
  label: string
  bookingId: string
}

export type TimelineRoomRow = {
  propertyId: string
  roomLabel: string
  rentPerWeek: number
  bars: TimelineBar[]
  markers: TimelineMarker[]
}

export type TimelinePropertyGroup = {
  key: string
  addressLabel: string
  suburb: string | null
  rooms: TimelineRoomRow[]
}

export type TimelineStats = {
  occupiedNow: number
  totalRooms: number
  emptyWeeks: number
  rentAtRisk: number
  leasesEndingSoon: number
  requestsAwaiting: number
}

export type CalendarEventKind =
  | 'move_in'
  | 'move_out'
  | 'bond_due'
  | 'rent_payout'
  | 'pending_request'
  | 'admin'

export type CalendarEvent = {
  id: string
  dateIso: string
  kind: CalendarEventKind
  title: string
  subtitle?: string
  bookingId?: string
}

export type Next7DayTag = 'Routine' | 'Action' | 'Urgent'

export type Next7DayItem = {
  id: string
  dateIso: string
  tag: Next7DayTag
  title: string
  subtitle?: string
  bookingId?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function parseIsoDateLocal(iso: string): Date {
  const s = iso.slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDateLocal(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const a = parseIsoDateLocal(startIso).getTime()
  const b = parseIsoDateLocal(endIso).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1)
}

export function daysBetweenExclusiveEnd(startIso: string, endIso: string): number {
  const a = parseIsoDateLocal(startIso).getTime()
  const b = parseIsoDateLocal(endIso).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/** First day of current month → last day of month five months ahead (~6 calendar months). */
export function buildSchedulingWindow(today: Date = new Date()): SchedulingWindow {
  const todayIso = toIsoDate(today)
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 6, 0)
  const startIso = toIsoDate(start)
  const endIso = toIsoDate(end)
  return {
    startIso,
    endIso,
    todayIso,
    totalDays: daysBetweenInclusive(startIso, endIso),
  }
}

export function pctInWindow(iso: string, window: SchedulingWindow): number {
  const dayIndex = daysBetweenExclusiveEnd(window.startIso, iso.slice(0, 10))
  if (window.totalDays <= 1) return 0
  return Math.min(100, Math.max(0, (dayIndex / (window.totalDays - 1)) * 100))
}

export function spanPct(startIso: string, endIso: string, window: SchedulingWindow): {
  leftPct: number
  widthPct: number
} {
  const clippedStart =
    startIso < window.startIso ? window.startIso : startIso > window.endIso ? window.endIso : startIso
  const clippedEnd =
    endIso > window.endIso ? window.endIso : endIso < window.startIso ? window.startIso : endIso
  if (clippedStart > clippedEnd) return { leftPct: 0, widthPct: 0 }
  const leftPct = pctInWindow(clippedStart, window)
  const rightPct = pctInWindow(clippedEnd, window)
  const widthPct = Math.max(0, rightPct - leftPct)
  // Full-window bars: ensure width reaches 100 when spanning entire window
  if (clippedStart === window.startIso && clippedEnd === window.endIso) {
    return { leftPct: 0, widthPct: 100 }
  }
  // Minimum visible width for very short spans
  return { leftPct, widthPct: Math.max(widthPct, widthPct > 0 || clippedStart === clippedEnd ? 0.8 : 0) }
}

function bookingMoveIn(b: SchedulingBooking): string | null {
  const raw = (b.move_in_date || b.start_date || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function bookingEnd(b: SchedulingBooking): string | null {
  const raw = (b.end_date || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function numRent(v: number | string | null | undefined, fallback = 0): number {
  if (v == null || v === '') return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatRentMissed(weeks: number, rentPerWeek: number): string {
  const missed = weeks * rentPerWeek
  const weeksLabel = `${weeks} wk${weeks === 1 ? '' : 's'}`
  if (missed >= 1000) {
    const k = missed / 1000
    const kLabel = Number.isInteger(k) ? `$${k}k` : `$${k.toFixed(1)}k`
    return `${weeksLabel} · ${kLabel}`
  }
  return `${weeksLabel} · $${Math.round(missed).toLocaleString('en-AU')}`
}

function formatShortDayMonth(iso: string): string {
  const d = parseIsoDateLocal(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

type CoverInterval = {
  start: string
  end: string
  kind: 'occupied' | 'upcoming'
  bookingId: string
}

function buildCoverIntervals(
  bookings: SchedulingBooking[],
  propertyId: string,
  todayIso: string,
): CoverInterval[] {
  const out: CoverInterval[] = []
  for (const b of bookings) {
    if (b.property_id !== propertyId) continue
    if (!OCCUPANCY_STATUSES.has(b.status)) continue
    const start = bookingMoveIn(b)
    const end = bookingEnd(b)
    if (!start || !end || end < start) continue
    const kind: 'occupied' | 'upcoming' = start <= todayIso ? 'occupied' : 'upcoming'
    // Confirmed future stay that hasn't started: upcoming even if status is confirmed
    if (start > todayIso) {
      out.push({ start, end, kind: 'upcoming', bookingId: b.id })
    } else {
      out.push({ start, end, kind, bookingId: b.id })
    }
  }
  out.sort((a, b) => a.start.localeCompare(b.start))
  return out
}

function mergeGapsAsEmpty(
  covers: CoverInterval[],
  window: SchedulingWindow,
  rentPerWeek: number,
): TimelineBar[] {
  const bars: TimelineBar[] = []
  let cursor = window.startIso

  const clipped = covers
    .map((c) => ({
      ...c,
      start: c.start < window.startIso ? window.startIso : c.start,
      end: c.end > window.endIso ? window.endIso : c.end,
    }))
    .filter((c) => c.start <= c.end)
    .sort((a, b) => a.start.localeCompare(b.start))

  for (const c of clipped) {
    if (c.start > cursor) {
      const gapEnd = addDaysIso(c.start, -1)
      if (gapEnd >= cursor) {
        const weeks = Math.max(1, Math.round(daysBetweenInclusive(cursor, gapEnd) / 7))
        const { leftPct, widthPct } = spanPct(cursor, gapEnd, window)
        if (widthPct > 0) {
          bars.push({
            kind: 'empty',
            leftPct,
            widthPct,
            weeks,
            rentMissed: weeks * rentPerWeek,
            label: formatRentMissed(weeks, rentPerWeek),
          })
        }
      }
    }
    const { leftPct, widthPct } = spanPct(c.start, c.end, window)
    if (widthPct > 0) {
      bars.push({
        kind: c.kind,
        leftPct,
        widthPct,
        bookingId: c.bookingId,
      })
    }
    const next = addDaysIso(c.end, 1)
    if (next > cursor) cursor = next
  }

  if (cursor <= window.endIso) {
    const weeks = Math.max(1, Math.round(daysBetweenInclusive(cursor, window.endIso) / 7))
    const { leftPct, widthPct } = spanPct(cursor, window.endIso, window)
    if (widthPct > 0) {
      bars.push({
        kind: 'empty',
        leftPct,
        widthPct,
        weeks,
        rentMissed: weeks * rentPerWeek,
        label: formatRentMissed(weeks, rentPerWeek),
      })
    }
  }

  return bars
}

function buildRoomMarkers(
  bookings: SchedulingBooking[],
  propertyId: string,
  window: SchedulingWindow,
): TimelineMarker[] {
  const markers: TimelineMarker[] = []
  for (const b of bookings) {
    if (b.property_id !== propertyId) continue

    if (PENDING_REQUEST_STATUSES.has(b.status)) {
      const moveIn = bookingMoveIn(b) ?? window.todayIso
      if (moveIn >= window.startIso && moveIn <= window.endIso) {
        markers.push({
          kind: 'pending_request',
          leftPct: pctInWindow(moveIn, window),
          label: 'Pending',
          bookingId: b.id,
        })
      }
    }

    if (OCCUPANCY_STATUSES.has(b.status) && bookingMoveIn(b) && bookingMoveIn(b)! <= window.todayIso) {
      const end = bookingEnd(b)
      if (!end) continue
      const daysToEnd = daysBetweenExclusiveEnd(window.todayIso, end)
      if (daysToEnd >= 0 && daysToEnd <= 45 && end >= window.startIso && end <= window.endIso) {
        markers.push({
          kind: 'lease_end',
          leftPct: pctInWindow(end, window),
          label: daysToEnd === 0 ? 'ends today' : `ends ${daysToEnd}d`,
          bookingId: b.id,
        })
      }
    }
  }
  return markers
}

export function buildTimelineModel(
  listings: LandlordListingForGroup[],
  bookings: SchedulingBooking[],
  today: Date = new Date(),
): { window: SchedulingWindow; groups: TimelinePropertyGroup[]; stats: TimelineStats } {
  const window = buildSchedulingWindow(today)
  const activeListings = listings.filter((l) => l.status === 'active' || l.status === 'inactive')
  const propertyGroups = groupLandlordListings(activeListings, bookings)

  const groups: TimelinePropertyGroup[] = []
  let occupiedNow = 0
  let totalRooms = 0
  let emptyWeeks = 0
  let rentAtRisk = 0
  let leasesEndingSoon = 0

  for (const g of propertyGroups) {
    const rooms: TimelineRoomRow[] = []
    g.listings.forEach((listing, idx) => {
      if (listing.status === 'draft' || listing.status === 'suspended' || listing.status === 'pending') return
      totalRooms += 1
      const rent = numRent(listing.rent_per_week)
      const covers = buildCoverIntervals(bookings, listing.id, window.todayIso)
      const occupiedHere = covers.some(
        (c) => c.kind === 'occupied' && c.start <= window.todayIso && c.end >= window.todayIso,
      )
      if (occupiedHere) occupiedNow += 1

      const bars = mergeGapsAsEmpty(covers, window, rent)
      for (const bar of bars) {
        if (bar.kind === 'empty') {
          emptyWeeks += bar.weeks ?? 0
          rentAtRisk += bar.rentMissed ?? 0
        }
      }
      const markers = buildRoomMarkers(bookings, listing.id, window)
      leasesEndingSoon += markers.filter((m) => m.kind === 'lease_end').length

      rooms.push({
        propertyId: listing.id,
        roomLabel: landlordRoomDisplayName(listing, idx),
        rentPerWeek: rent,
        bars,
        markers,
      })
    })
    if (rooms.length > 0) {
      groups.push({
        key: g.key,
        addressLabel: g.addressLabel,
        suburb: g.suburb,
        rooms,
      })
    }
  }

  const requestsAwaiting = bookings.filter((b) => PENDING_REQUEST_STATUSES.has(b.status)).length

  return {
    window,
    groups,
    stats: {
      occupiedNow,
      totalRooms,
      emptyWeeks,
      rentAtRisk,
      leasesEndingSoon,
      requestsAwaiting,
    },
  }
}

export function calendarEventDotClass(kind: CalendarEventKind): string {
  switch (kind) {
    case 'move_in':
      return 'bg-[var(--quni-success)]'
    case 'move_out':
      return 'bg-[var(--quni-warning)]'
    case 'bond_due':
      return 'bg-[var(--quni-danger-strong)]'
    case 'rent_payout':
      return 'bg-[var(--quni-coral)]'
    case 'pending_request':
      return 'bg-[var(--quni-coral)]'
    default:
      return 'bg-[var(--quni-ink-4)]'
  }
}

export function calendarEventChipClass(kind: CalendarEventKind): string {
  switch (kind) {
    case 'move_in':
      return 'bg-[var(--quni-success-bg)] text-[var(--quni-success-strong)] border-admin-success/30'
    case 'move_out':
      return 'bg-[var(--quni-warning-bg)] text-[var(--quni-warning-fg)] border-admin-warning/40'
    case 'bond_due':
      return 'bg-[var(--quni-danger-bg)] text-[var(--quni-danger-strong)] border-admin-danger-strong/30'
    case 'rent_payout':
      return 'bg-[rgba(255,111,97,0.12)] text-[var(--quni-danger-strong)] border-[rgba(255,111,97,0.35)]'
    case 'pending_request':
      return 'bg-[rgba(255,111,97,0.12)] text-[var(--quni-coral)] border-[rgba(255,111,97,0.4)]'
    default:
      return 'bg-[var(--quni-surface-3)] text-[var(--quni-ink-4)] border-[var(--quni-line)]'
  }
}

function studentLabel(b: SchedulingBooking): string {
  return (b.student_name || 'Tenant').trim() || 'Tenant'
}

/** Next mid-month rent payout date on/after `fromIso` within the month of `fromIso` or following. */
function nextRentPayoutIso(fromIso: string): string {
  const d = parseIsoDateLocal(fromIso)
  const midThis = new Date(d.getFullYear(), d.getMonth(), 21)
  if (toIsoDate(midThis) >= fromIso) return toIsoDate(midThis)
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 21))
}

export function buildCalendarEvents(
  bookings: SchedulingBooking[],
  opts?: { today?: Date; monthIso?: string },
): CalendarEvent[] {
  const today = opts?.today ?? new Date()
  const todayIso = toIsoDate(today)
  const monthAnchor = opts?.monthIso ? parseIsoDateLocal(opts.monthIso.slice(0, 7) + '-01') : today
  const monthStart = toIsoDate(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1))
  const monthEnd = toIsoDate(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0))

  const events: CalendarEvent[] = []

  for (const b of bookings) {
    const name = studentLabel(b)
    const moveIn = bookingMoveIn(b)
    const end = bookingEnd(b)

    if (moveIn && moveIn >= monthStart && moveIn <= monthEnd) {
      if (OCCUPANCY_STATUSES.has(b.status) || PENDING_REQUEST_STATUSES.has(b.status)) {
        events.push({
          id: `${b.id}-movein`,
          dateIso: moveIn,
          kind: 'move_in',
          title: `Move-in · ${name}`,
          subtitle: b.property_title ?? undefined,
          bookingId: b.id,
        })
      }
    }

    if (end && end >= monthStart && end <= monthEnd && OCCUPANCY_STATUSES.has(b.status)) {
      events.push({
        id: `${b.id}-moveout`,
        dateIso: end,
        kind: 'move_out',
        title: `Lease ends · ${name}`,
        subtitle: b.property_title ?? undefined,
        bookingId: b.id,
      })
    }

    if (PENDING_REQUEST_STATUSES.has(b.status)) {
      const reqDate = (b.expires_at || moveIn || b.created_at || todayIso).slice(0, 10)
      const dateIso = /^\d{4}-\d{2}-\d{2}$/.test(reqDate) ? reqDate : todayIso
      if (dateIso >= monthStart && dateIso <= monthEnd) {
        events.push({
          id: `${b.id}-pending`,
          dateIso: dateIso > todayIso ? dateIso : todayIso,
          kind: 'pending_request',
          title: `Respond to request · ${name}`,
          subtitle: b.property_title ?? undefined,
          bookingId: b.id,
        })
      }
    }

    if (b.status === 'bond_pending' || b.status === 'confirmed') {
      const bondAnchor = (b.confirmed_at || moveIn || todayIso).slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(bondAnchor)) {
        const bondDue = addDaysIso(bondAnchor, 5)
        if (bondDue >= monthStart && bondDue <= monthEnd && bondDue >= todayIso) {
          events.push({
            id: `${b.id}-bond`,
            dateIso: bondDue,
            kind: 'bond_due',
            title: `Bond / deposit due · ${name}`,
            subtitle: b.property_title ?? undefined,
            bookingId: b.id,
          })
        }
      }
    }

    if ((b.status === 'active' || b.status === 'confirmed') && (b.service_tier === 'managed' || !b.service_tier)) {
      const payout = nextRentPayoutIso(monthStart < todayIso ? todayIso : monthStart)
      if (payout >= monthStart && payout <= monthEnd) {
        const rent = numRent(b.weekly_rent)
        events.push({
          id: `${b.id}-payout-${payout}`,
          dateIso: payout,
          kind: 'rent_payout',
          title: rent > 0 ? `Rent payout · $${Math.round(rent).toLocaleString('en-AU')}` : 'Rent payout landing',
          subtitle: name,
          bookingId: b.id,
        })
      }
    }
  }

  // Dedupe payout events on same day for display stability (keep first)
  const seen = new Set<string>()
  const deduped: CalendarEvent[] = []
  for (const e of events.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.title.localeCompare(b.title))) {
    const key = `${e.dateIso}|${e.kind}|${e.bookingId ?? e.title}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(e)
  }
  return deduped
}

export function buildNext7Days(
  bookings: SchedulingBooking[],
  today: Date = new Date(),
): Next7DayItem[] {
  const todayIso = toIsoDate(today)
  const horizon = addDaysIso(todayIso, 6)
  const items: Next7DayItem[] = []

  for (const b of bookings) {
    const name = studentLabel(b)
    const moveIn = bookingMoveIn(b)
    const end = bookingEnd(b)

    if (PENDING_REQUEST_STATUSES.has(b.status)) {
      items.push({
        id: `${b.id}-respond`,
        dateIso: todayIso,
        tag: 'Urgent',
        title: `Respond to booking request · ${name}`,
        subtitle: b.property_title ?? undefined,
        bookingId: b.id,
      })
    }

    if (moveIn && moveIn >= todayIso && moveIn <= horizon && OCCUPANCY_STATUSES.has(b.status)) {
      items.push({
        id: `${b.id}-movein`,
        dateIso: moveIn,
        tag: moveIn === todayIso ? 'Routine' : 'Action',
        title: moveIn === todayIso ? `Move-in today · ${name}` : `Move-in · ${name}`,
        subtitle: formatShortDayMonth(moveIn),
        bookingId: b.id,
      })
    }

    if (b.status === 'bond_pending' || (b.status === 'confirmed' && !end)) {
      const bondDate = moveIn && moveIn <= horizon ? addDaysIso(moveIn, Math.min(5, 6)) : addDaysIso(todayIso, 2)
      if (bondDate >= todayIso && bondDate <= horizon) {
        items.push({
          id: `${b.id}-deposit`,
          dateIso: bondDate,
          tag: 'Action',
          title: `Deposit pending · ${name}`,
          subtitle: formatShortDayMonth(bondDate),
          bookingId: b.id,
        })
      }
    }

    if (b.status === 'bond_pending' || b.status === 'confirmed') {
      const lodgement = addDaysIso(todayIso, 5)
      if (lodgement <= horizon) {
        items.push({
          id: `${b.id}-bond-lodge`,
          dateIso: lodgement,
          tag: 'Action',
          title: `Bond lodgement due · ${name}`,
          subtitle: formatShortDayMonth(lodgement),
          bookingId: b.id,
        })
      }
    }

    if (b.status === 'active' || b.status === 'confirmed') {
      const payout = nextRentPayoutIso(todayIso)
      if (payout >= todayIso && payout <= horizon) {
        const rent = numRent(b.weekly_rent)
        items.push({
          id: `${b.id}-payout`,
          dateIso: payout,
          tag: 'Routine',
          title: rent > 0 ? `Rent payout landing · $${Math.round(rent).toLocaleString('en-AU')}` : 'Rent payout landing',
          subtitle: formatShortDayMonth(payout),
          bookingId: b.id,
        })
      }
    }

    if (end && end >= todayIso && end <= horizon && OCCUPANCY_STATUSES.has(b.status)) {
      items.push({
        id: `${b.id}-end`,
        dateIso: end,
        tag: 'Action',
        title: `Lease ends · ${name}`,
        subtitle: formatShortDayMonth(end),
        bookingId: b.id,
      })
    }
  }

  const seen = new Set<string>()
  return items
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => {
      const tagOrder = { Urgent: 0, Action: 1, Routine: 2 }
      const d = a.dateIso.localeCompare(b.dateIso)
      if (d !== 0) return d
      return tagOrder[a.tag] - tagOrder[b.tag]
    })
    .slice(0, 6)
}

export function next7TagClass(tag: Next7DayTag): string {
  if (tag === 'Urgent') return 'bg-admin-coral-tint-15 text-[var(--quni-danger-strong)]'
  if (tag === 'Action') return 'bg-[var(--quni-warning-bg)] text-[var(--quni-warning-fg)]'
  return 'bg-[var(--quni-success-bg)] text-[var(--quni-success-strong)]'
}

export function next7DotClass(tag: Next7DayTag): string {
  if (tag === 'Urgent') return 'bg-[var(--quni-danger-strong)]'
  if (tag === 'Action') return 'bg-[var(--quni-warning)]'
  return 'bg-[var(--quni-success)]'
}

export function formatMoneyCompact(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000
    return Number.isInteger(k) ? `$${k}k` : `$${k.toFixed(1)}k`
  }
  return `$${Math.round(amount).toLocaleString('en-AU')}`
}

export function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

/** Calendar grid cells for a month (Sun–Sat), including leading/trailing days from adjacent months. */
export function buildMonthGrid(year: number, monthIndex: number): Array<{
  dateIso: string
  day: number
  inMonth: boolean
}> {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay() // 0 = Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: Array<{ dateIso: string; day: number; inMonth: boolean }> = []

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, monthIndex, 1 - (startPad - i))
    cells.push({ dateIso: toIsoDate(d), day: d.getDate(), inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      dateIso: toIsoDate(new Date(year, monthIndex, day)),
      day,
      inMonth: true,
    })
  }
  while (cells.length % 7 !== 0) {
    const last = parseIsoDateLocal(cells[cells.length - 1]!.dateIso)
    last.setDate(last.getDate() + 1)
    cells.push({ dateIso: toIsoDate(last), day: last.getDate(), inMonth: false })
  }
  return cells
}
