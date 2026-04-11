/** Shared helpers for listings / property detail / booking availability (URL + RPC). */

export function isIsoDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const t = Date.parse(`${s}T12:00:00`)
  return !Number.isNaN(t)
}

/** URL `lease` param: months or open-ended */
export type ListingLeaseUrlValue = '' | '3' | '6' | '12' | 'flex'

export function addCalendarMonthsIso(moveIn: string, months: number): string {
  const [y, m, d] = moveIn.split('-').map(Number)
  const local = new Date(y, m - 1, d)
  local.setMonth(local.getMonth() + months)
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
}

export function moveOutFromListingLeaseParam(moveIn: string, lease: string): string | null {
  if (!moveIn || !isIsoDateString(moveIn)) return null
  if (lease === '3') return addCalendarMonthsIso(moveIn, 3)
  if (lease === '6') return addCalendarMonthsIso(moveIn, 6)
  if (lease === '12') return addCalendarMonthsIso(moveIn, 12)
  if (lease === 'flex') return null
  return null
}

/** Prefer explicit move-out; else derive from lease param; else open-ended (null). */
export function effectiveMoveOutForAvailability(
  moveIn: string | null,
  moveOut: string | null,
  lease: string | null,
): string | null {
  if (!moveIn || !isIsoDateString(moveIn)) return null
  if (moveOut && isIsoDateString(moveOut)) return moveOut
  return moveOutFromListingLeaseParam(moveIn, (lease ?? '').trim())
}

export function formatAuShortDate(isoDate: string): string {
  const s = isoDate.trim()
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '—'
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** dd/mm/yyyy for display (calendar-day ISO, no TZ shift). */
export function formatIsoDateAuNumeric(isoDate: string): string {
  const s = isoDate.trim().slice(0, 10)
  if (!isIsoDateString(s)) return ''
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Parse typed dd/mm/yyyy to YYYY-MM-DD; invalid calendar dates return null. */
export function parseAuNumericDateToIso(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim())
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isIsoDateString(iso) ? iso : null
}

export function availabilityUnavailableBadgeLabel(
  moveIn: string,
  moveOutEffective: string | null,
): string {
  const a = formatAuShortDate(moveIn)
  if (moveOutEffective && isIsoDateString(moveOutEffective)) {
    return `Not available ${a} – ${formatAuShortDate(moveOutEffective)}`
  }
  return `Not available from ${a}`
}

export function moveOutFromBookingLeaseLength(
  moveIn: string,
  leaseLength: '3 months' | '6 months' | '12 months' | 'Flexible',
): string | null {
  if (!isIsoDateString(moveIn)) return null
  if (leaseLength === '3 months') return addCalendarMonthsIso(moveIn, 3)
  if (leaseLength === '6 months') return addCalendarMonthsIso(moveIn, 6)
  if (leaseLength === '12 months') return addCalendarMonthsIso(moveIn, 12)
  return null
}

export function buildAvailabilitySearchString(
  moveIn: string | null,
  moveOut: string | null,
  lease: string | null,
): string {
  const q = new URLSearchParams()
  if (moveIn && isIsoDateString(moveIn)) q.set('move_in', moveIn)
  if (moveOut && isIsoDateString(moveOut)) q.set('move_out', moveOut)
  const l = (lease ?? '').trim()
  if (l) q.set('lease', l)
  const s = q.toString()
  return s ? `?${s}` : ''
}
