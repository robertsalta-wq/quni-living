/**
 * Presentational helpers for booking_events timelines (Stage 7).
 * Landlord/admin = full stream; renter = audience='both' + soft copy.
 * Email rows collapse by correlation_id on the internal view only.
 */

import type { Database, Json } from '../database.types'

export type BookingEventRow = Database['public']['Tables']['booking_events']['Row']

export type BookingActivityTone = 'success' | 'warning' | 'danger' | 'neutral'

export type BookingActivityLink = {
  label: string
  href: string | null
}

export type BookingActivityItem = {
  /** Stable React key (primary event id or correlation group). */
  key: string
  occurredAt: string
  tone: BookingActivityTone
  title: string
  detail: string | null
  links: BookingActivityLink[]
}

export type BookingEventChange = {
  field: string
  old: unknown
  new: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function parseBookingEventChanges(raw: Json | null): BookingEventChange[] {
  if (!Array.isArray(raw)) return []
  const out: BookingEventChange[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.field !== 'string') continue
    out.push({ field: item.field, old: item.old, new: item.new })
  }
  return out
}

export function parseBookingEventMetadata(raw: Json): Record<string, unknown> {
  return isRecord(raw) ? raw : {}
}

function formatScalar(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return '—'
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
      try {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t)
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        }
      } catch {
        /* fall through */
      }
    }
    return t.replace(/_/g, ' ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  return String(value)
}

function formatFieldLabel(field: string): string {
  const map: Record<string, string> = {
    status: 'status',
    lease_length: 'lease term',
    end_date: 'end',
    start_date: 'start',
    move_in_date: 'move-in',
    weekly_rent: 'weekly rent',
    bond_amount: 'bond',
    occupant_count: 'occupants',
    landlord_signed_at: 'landlord signed',
    student_signed_at: 'renter signed',
    co_tenant_signed_at: 'co-tenant signed',
    listing_agreement_status: 'agreement status',
    bond_received_by_landlord_at: 'bond received at',
    booking_fee_paid: 'listing fee paid',
  }
  return map[field] ?? field.replace(/_/g, ' ')
}

export function formatChangesInline(changes: BookingEventChange[]): string | null {
  if (!changes.length) return null
  return changes
    .map((c) => {
      if (c.field === 'status') {
        return `${formatScalar(c.old)} → ${formatScalar(c.new)}`
      }
      return `${formatFieldLabel(c.field)} ${formatScalar(c.old)} → ${formatScalar(c.new)}`
    })
    .join(' · ')
}

function formatClock(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

export function formatTimelineDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  } catch {
    return '—'
  }
}

function moneyFromCents(cents: unknown): string | null {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return null
  const aud = cents / 100
  return `$${aud.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function moneyAud(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `$${value.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function templateLabel(templateKey: unknown): string {
  const key = typeof templateKey === 'string' ? templateKey : ''
  const map: Record<string, string> = {
    listing_payment_instructions: 'Payment instructions',
    listing_booking_accepted_renter: 'Booking accepted email',
    listing_booking_accepted_landlord: 'Booking accepted email (landlord)',
    listing_agreement_ready_renter: 'Agreement ready email',
    listing_agreement_ready_landlord: 'Agreement ready email (landlord)',
  }
  if (map[key]) return map[key]
  if (!key) return 'Email'
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function recipientHint(meta: Record<string, unknown>): string | null {
  const to = meta.to_masked
  if (Array.isArray(to) && typeof to[0] === 'string') return to[0]
  if (typeof to === 'string' && to.trim()) return to.trim()
  return null
}

function extractLinks(meta: Record<string, unknown>, mode: 'internal' | 'renter'): BookingActivityLink[] {
  const linksRaw = meta.links
  if (!isRecord(linksRaw)) return []
  const out: BookingActivityLink[] = []
  for (const [key, value] of Object.entries(linksRaw)) {
    if (typeof value !== 'string' || !value.trim()) continue
    const href = /^https?:\/\//i.test(value) ? value : null
    if (mode === 'renter' && !href) continue
    const label =
      key === 'signed_pdf' ? 'signed PDF' : key === 'draft' || key === 'draft_pdf' ? 'document draft' : key.replace(/_/g, ' ')
    out.push({ label, href })
  }
  return out
}

function toneFromOutcome(outcome: BookingEventRow['outcome'], eventType: string): BookingActivityTone {
  if (outcome === 'failure' || eventType === 'email.bounced' || eventType === 'email.complained') {
    return 'danger'
  }
  if (outcome === 'success') return 'success'
  if (outcome === 'pending') return 'warning'
  if (eventType === 'booking.confirmed' || eventType === 'bond.received_acknowledged') return 'warning'
  return 'neutral'
}

function actorDisplay(event: BookingEventRow): string | null {
  if (event.actor_label?.trim()) return event.actor_label.trim()
  if (event.actor_type === 'system') return 'system'
  if (event.actor_type === 'webhook') return 'webhook'
  if (event.actor_type === 'cron') return 'cron'
  return event.actor_type
}

function joinDetail(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)
  return cleaned.length ? cleaned.join(' · ') : null
}

function internalTitle(event: BookingEventRow, meta: Record<string, unknown>): string {
  const changes = parseBookingEventChanges(event.changes)
  switch (event.event_type) {
    case 'document.fully_signed':
      return 'Agreement signed by all parties'
    case 'document.signature_recorded': {
      const party = typeof meta.party === 'string' ? meta.party : null
      if (party === 'landlord') return 'Agreement signed by landlord'
      if (party === 'student') return 'Agreement signed by renter'
      if (party === 'co_tenant') return 'Agreement signed by co-tenant'
      return 'Agreement signature recorded'
    }
    case 'document.sent_for_signing':
      return 'Agreement sent for signing'
    case 'document.generated':
      return 'Agreement draft generated'
    case 'document.voided':
      return 'Agreement voided'
    case 'document.regenerated':
      return 'Agreement regenerated · previous draft voided'
    case 'document.reconciled':
      return 'Agreement reconciled from DocuSeal'
    case 'document.archive_failed':
      return 'Agreement archive failed'
    case 'booking.confirmed':
      return 'Booking accepted · bond pending'
    case 'booking.created':
      return 'Booking requested'
    case 'booking.cancelled':
      return 'Booking cancelled'
    case 'booking.declined':
      return 'Booking declined'
    case 'booking.expired':
      return 'Booking expired'
    case 'booking.awaiting_info':
      return 'More information requested'
    case 'booking.terms_updated':
      return 'Lease terms changed by landlord'
    case 'booking.status_changed': {
      const statusChange = changes.find((c) => c.field === 'status')
      if (statusChange) {
        return `Status changed · ${formatScalar(statusChange.old)} → ${formatScalar(statusChange.new)}`
      }
      return 'Booking status changed'
    }
    case 'booking.field_changed': {
      const field = typeof meta.field === 'string' ? meta.field : changes[0]?.field
      return field ? `${formatFieldLabel(field)} updated` : 'Booking field updated'
    }
    case 'bond.received_acknowledged':
      return 'Bond received acknowledged'
    case 'bond.pending_cancelled_by_landlord':
      return 'Bond-pending booking cancelled by landlord'
    case 'bond.pending_expired':
      return 'Bond window expired'
    case 'payment_instructions.resent':
      return 'Payment instructions resent to renter'
    case 'rent.agreed_override':
      return 'Agreed rent overridden'
    case 'rent.invite_offer_applied':
      return 'Invite rent offer applied'
    case 'signature.on_terminal_booking':
      return 'Signature recorded on terminal booking'
    case 'email.attempt':
      return `${templateLabel(meta.template_key)} sent to renter`
    case 'email.accepted':
      return `${templateLabel(meta.template_key)} accepted by Resend`
    case 'email.failed':
      return `${templateLabel(meta.template_key)} failed to send`
    case 'email.delivered':
      return `${templateLabel(meta.template_key)} delivered`
    case 'email.bounced':
      return `${templateLabel(meta.template_key)} bounced`
    case 'email.complained':
      return `${templateLabel(meta.template_key)} complained`
    case 'email.opened':
      return `${templateLabel(meta.template_key)} opened`
    default:
      return event.event_type.replace(/\./g, ' · ').replace(/_/g, ' ')
  }
}

function internalDetail(event: BookingEventRow, meta: Record<string, unknown>): string | null {
  const changes = parseBookingEventChanges(event.changes)
  const parts: Array<string | null> = []

  if (event.event_type === 'document.fully_signed') {
    const bits: string[] = []
    if (typeof meta.landlord_signed_at === 'string') {
      const t = formatClock(meta.landlord_signed_at)
      bits.push(t ? `landlord ${t}` : 'landlord signed')
    }
    if (typeof meta.student_signed_at === 'string') {
      const t = formatClock(meta.student_signed_at)
      bits.push(t ? `renter ${t}` : 'renter signed')
    }
    if (typeof meta.co_tenant_signed_at === 'string') {
      const t = formatClock(meta.co_tenant_signed_at)
      bits.push(t ? `co-tenant ${t}` : 'co-tenant signed')
    }
    if (bits.length) parts.push(bits.join(' · '))
  }

  const changeLine = formatChangesInline(
    event.event_type === 'booking.status_changed'
      ? changes.filter((c) => c.field !== 'status')
      : changes,
  )
  if (changeLine) parts.push(changeLine)

  if (event.reason?.trim()) {
    parts.push(
      event.event_type === 'booking.terms_updated' ? `"${event.reason.trim()}"` : `reason: ${event.reason.trim()}`,
    )
  }

  if (event.event_type === 'booking.confirmed') {
    const fee = moneyFromCents(meta.amount_cents)
    if (meta.fee_exempt === true) {
      parts.push(fee ? `listing fee ${fee} (fee exempt)` : 'listing fee $0.00 (fee exempt)')
    } else if (fee) {
      parts.push(`listing fee ${fee}`)
    }
    if (typeof meta.bond_window_expires_at === 'string') {
      parts.push(`bond due by ${formatScalar(meta.bond_window_expires_at)}`)
    }
  }

  if (event.event_type.startsWith('email.') || event.event_type === 'payment_instructions.resent') {
    const to = recipientHint(meta)
    if (to) parts.push(to)
  }

  const actor = actorDisplay(event)
  if (
    actor &&
    !event.event_type.startsWith('email.') &&
    event.event_type !== 'document.signature_recorded' &&
    event.actor_type !== 'system'
  ) {
    parts.push(actor)
  } else if (actor && event.event_type === 'booking.terms_updated') {
    parts.push(actor)
  }

  if (event.provider_ref?.trim()) {
    if (event.provider === 'docuseal') {
      parts.push(`submission ${event.provider_ref.trim()}`)
    } else if (event.provider === 'resend') {
      parts.push(`resend ${event.provider_ref.trim()}`)
    } else if (event.provider === 'stripe') {
      parts.push(`stripe ${event.provider_ref.trim()}`)
    } else {
      parts.push(event.provider_ref.trim())
    }
  }

  return joinDetail(parts)
}

function renterTitle(event: BookingEventRow, meta: Record<string, unknown>): string {
  const changes = parseBookingEventChanges(event.changes)
  switch (event.event_type) {
    case 'document.fully_signed':
      return 'You signed your tenancy agreement'
    case 'document.signature_recorded': {
      const party = typeof meta.party === 'string' ? meta.party : null
      if (party === 'student') return 'You signed your tenancy agreement'
      if (party === 'landlord') return 'Your landlord signed the agreement'
      if (party === 'co_tenant') return 'Your co-tenant signed the agreement'
      return 'A signature was recorded on your agreement'
    }
    case 'document.sent_for_signing':
      return 'Your tenancy agreement is ready to sign'
    case 'booking.confirmed':
      return 'Your booking was accepted'
    case 'booking.created':
      return 'You submitted your application'
    case 'booking.cancelled':
      return 'Your booking was cancelled'
    case 'booking.declined':
      return 'Your booking was declined'
    case 'booking.expired':
      return 'Your booking expired'
    case 'booking.awaiting_info':
      return 'Your landlord asked for more information'
    case 'booking.terms_updated':
      return 'Your landlord updated the lease term'
    case 'booking.status_changed': {
      const statusChange = changes.find((c) => c.field === 'status')
      const next = statusChange ? formatScalar(statusChange.new) : null
      if (next === 'bond pending') return 'Your booking was accepted'
      if (next === 'confirmed' || next === 'active') return 'Your booking was confirmed'
      if (next === 'awaiting info') return 'Your landlord asked for more information'
      if (next === 'declined') return 'Your booking was declined'
      if (next === 'cancelled') return 'Your booking was cancelled'
      if (next === 'expired') return 'Your booking expired'
      return 'Your booking status was updated'
    }
    case 'bond.received_acknowledged':
      return 'Your landlord confirmed bond received'
    case 'bond.pending_cancelled_by_landlord':
      return 'Your booking was cancelled'
    case 'bond.pending_expired':
      return 'Your bond window expired'
    default:
      return 'Booking update'
  }
}

function renterDetail(event: BookingEventRow, meta: Record<string, unknown>): string | null {
  const changes = parseBookingEventChanges(event.changes)
  switch (event.event_type) {
    case 'document.fully_signed':
      return 'All parties signed · download your copy'
    case 'document.signature_recorded': {
      const party = typeof meta.party === 'string' ? meta.party : null
      if (party === 'student') return 'Waiting for other parties'
      if (party === 'landlord') return 'Waiting for you to sign'
      return null
    }
    case 'document.sent_for_signing':
      return 'Open your booking to review and sign'
    case 'booking.confirmed': {
      const actor = actorDisplay(event)
      return actor && actor !== 'system' && actor !== 'webhook' ? `${actor} accepted your request` : 'Your host accepted your request'
    }
    case 'booking.created': {
      const bits: string[] = []
      const occupants = changes.find((c) => c.field === 'occupant_count')
      if (occupants?.new != null) bits.push(`${formatScalar(occupants.new)} occupants`)
      const moveIn = changes.find((c) => c.field === 'move_in_date' || c.field === 'start_date')
      if (moveIn?.new != null) bits.push(`move-in ${formatScalar(moveIn.new)}`)
      if (typeof meta.occupant_count === 'number') bits.push(`${meta.occupant_count} occupants`)
      if (typeof meta.move_in_date === 'string') bits.push(`move-in ${formatScalar(meta.move_in_date)}`)
      const rent = moneyAud(meta.weekly_rent)
      if (rent) bits.push(`${rent}/wk negotiated rate`)
      return bits.length ? bits.join(' · ') : null
    }
    case 'booking.terms_updated': {
      const lease = changes.find((c) => c.field === 'lease_length')
      const start = changes.find((c) => c.field === 'start_date' || c.field === 'move_in_date')
      const end = changes.find((c) => c.field === 'end_date')
      const bits: string[] = []
      if (lease?.new != null) bits.push(`Now ${formatScalar(lease.new)}`)
      if (start?.new != null && end?.new != null) {
        bits.push(`${formatScalar(start.new)} to ${formatScalar(end.new)}`)
      } else if (end?.new != null) {
        bits.push(`Ends ${formatScalar(end.new)}`)
      }
      return bits.length ? bits.join(' · ') : 'Lease details were updated'
    }
    case 'booking.status_changed':
      return null
    case 'bond.received_acknowledged':
      return 'Bond step complete'
    default:
      return null
  }
}

function presentSingle(
  event: BookingEventRow,
  mode: 'internal' | 'renter',
): BookingActivityItem {
  const meta = parseBookingEventMetadata(event.metadata)
  const links = extractLinks(meta, mode)
  if (mode === 'renter') {
    return {
      key: event.id,
      occurredAt: event.occurred_at,
      tone: event.outcome === 'success' ? 'success' : event.outcome === 'pending' ? 'warning' : 'neutral',
      title: renterTitle(event, meta),
      detail: renterDetail(event, meta),
      links: links.filter((l) => l.href),
    }
  }
  return {
    key: event.id,
    occurredAt: event.occurred_at,
    tone: toneFromOutcome(event.outcome, event.event_type),
    title: internalTitle(event, meta),
    detail: internalDetail(event, meta),
    links,
  }
}

type EmailGroup = {
  correlationId: string
  events: BookingEventRow[]
}

function isEmailEvent(eventType: string): boolean {
  return eventType.startsWith('email.')
}

function collapseEmailGroups(events: BookingEventRow[]): Array<BookingEventRow | EmailGroup> {
  const byCorr = new Map<string, BookingEventRow[]>()
  const singles: BookingEventRow[] = []
  const order: Array<{ kind: 'single'; id: string } | { kind: 'group'; corr: string }> = []
  const seenCorr = new Set<string>()

  for (const event of events) {
    const corr = event.correlation_id?.trim()
    if (corr && isEmailEvent(event.event_type)) {
      const list = byCorr.get(corr) ?? []
      list.push(event)
      byCorr.set(corr, list)
      if (!seenCorr.has(corr)) {
        seenCorr.add(corr)
        order.push({ kind: 'group', corr })
      }
    } else {
      singles.push(event)
      order.push({ kind: 'single', id: event.id })
    }
  }

  const singleById = new Map(singles.map((e) => [e.id, e]))
  const out: Array<BookingEventRow | EmailGroup> = []
  for (const step of order) {
    if (step.kind === 'single') {
      const e = singleById.get(step.id)
      if (e) out.push(e)
    } else {
      const group = byCorr.get(step.corr)
      if (group?.length) out.push({ correlationId: step.corr, events: group })
    }
  }
  return out
}

function presentEmailGroup(group: EmailGroup): BookingActivityItem {
  const sorted = [...group.events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )
  const primary =
    sorted.find((e) => e.event_type === 'email.attempt') ??
    sorted.find((e) => e.event_type === 'email.accepted') ??
    sorted.find((e) => e.event_type === 'email.failed') ??
    sorted[0]

  const meta = parseBookingEventMetadata(primary.metadata)
  const to = recipientHint(meta)
  const label = templateLabel(meta.template_key)
  const resent = typeof meta.resent === 'boolean' ? meta.resent : false
  const title = resent
    ? `${label} resent to renter`
    : `${label} sent to renter`

  const outcomeBits: string[] = []
  let tone: BookingActivityTone = 'neutral'
  for (const e of sorted) {
    const clock = formatClock(e.occurred_at)
    if (e.event_type === 'email.bounced') {
      outcomeBits.push(clock ? `bounced ${clock} — not delivered` : 'bounced — not delivered')
      tone = 'danger'
    } else if (e.event_type === 'email.complained') {
      outcomeBits.push(clock ? `complained ${clock}` : 'complained')
      tone = 'danger'
    } else if (e.event_type === 'email.failed') {
      outcomeBits.push(clock ? `failed ${clock}` : 'failed')
      tone = 'danger'
    } else if (e.event_type === 'email.delivered') {
      outcomeBits.push(clock ? `delivered ${clock}` : 'delivered')
      if (tone !== 'danger') tone = 'success'
    } else if (e.event_type === 'email.opened') {
      outcomeBits.push(clock ? `opened ${clock}` : 'opened')
      if (tone !== 'danger') tone = 'success'
    } else if (e.event_type === 'email.accepted' && !sorted.some((x) => x.event_type === 'email.delivered')) {
      outcomeBits.push(clock ? `accepted ${clock}` : 'accepted by Resend')
    } else if (e.event_type === 'email.attempt' && sorted.length === 1) {
      outcomeBits.push('pending delivery')
      tone = 'warning'
    }
  }

  const providerRef =
    sorted.map((e) => e.provider_ref).find((r) => typeof r === 'string' && r.trim())?.trim() ?? null

  const detail = joinDetail([to, ...outcomeBits, providerRef ? `resend ${providerRef}` : null])
  const latest = sorted[sorted.length - 1]

  return {
    key: `corr:${group.correlationId}`,
    occurredAt: latest.occurred_at,
    tone,
    title,
    detail,
    links: [],
  }
}

/**
 * Build timeline items newest-first.
 * Internal mode collapses email.* sharing correlation_id into one visual row.
 */
export function buildBookingActivityItems(
  events: BookingEventRow[],
  mode: 'internal' | 'renter',
): BookingActivityItem[] {
  const filtered =
    mode === 'renter' ? events.filter((e) => e.audience === 'both') : events

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )

  if (mode === 'renter') {
    return sorted.map((e) => presentSingle(e, 'renter'))
  }

  const collapsed = collapseEmailGroups(sorted)
  const items: BookingActivityItem[] = collapsed.map((entry) =>
    'correlationId' in entry ? presentEmailGroup(entry) : presentSingle(entry, 'internal'),
  )

  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}
