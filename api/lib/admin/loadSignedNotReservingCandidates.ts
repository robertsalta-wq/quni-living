import type { SupabaseClient } from '@supabase/supabase-js'
import {
  KNOWN_SMOKE_BOOKING_IDS,
  type SignedNotReservingRow,
} from './classifySignedNotReserving.js'

const DEAD_STATUSES = ['expired', 'cancelled', 'declined'] as const
const LEASE_DOC_TYPES = ['lease', 'residential_tenancy'] as const

/**
 * Load dead bookings that have a latest lease/residential_tenancy doc, plus
 * smoke-booking ids to exclude (denylist ∪ booking_events.reason `[SMOKE…`).
 */
export async function loadSignedNotReservingCandidates(admin: SupabaseClient): Promise<{
  rows: SignedNotReservingRow[]
  smokeBookingIds: Set<string>
}> {
  const smokeBookingIds = new Set(KNOWN_SMOKE_BOOKING_IDS)

  const { data: deadBookings, error: bookingsErr } = await admin
    .from('bookings')
    .select('id, status')
    .in('status', [...DEAD_STATUSES])
    .limit(500)
  if (bookingsErr) throw bookingsErr

  const bookings = deadBookings ?? []
  if (bookings.length === 0) {
    return { rows: [], smokeBookingIds }
  }

  const bookingIds = bookings.map((b) => b.id)
  const statusByBooking = new Map(bookings.map((b) => [b.id, b.status as string]))

  const { data: tenancies, error: tenancyErr } = await admin
    .from('tenancies')
    .select('id, booking_id')
    .in('booking_id', bookingIds)
  if (tenancyErr) throw tenancyErr

  const tenancyRows = tenancies ?? []
  if (tenancyRows.length === 0) {
    return { rows: [], smokeBookingIds }
  }

  const tenancyIds = tenancyRows.map((t) => t.id)
  const bookingByTenancy = new Map(tenancyRows.map((t) => [t.id, t.booking_id as string]))

  const { data: docs, error: docsErr } = await admin
    .from('tenancy_documents')
    .select(
      'tenancy_id, status, landlord_signed_at, student_signed_at, created_at',
    )
    .in('tenancy_id', tenancyIds)
    .in('document_type', [...LEASE_DOC_TYPES])
    .order('created_at', { ascending: false })
  if (docsErr) throw docsErr

  // Latest doc per tenancy (query is newest-first).
  const latestByTenancy = new Map<string, (typeof docs)[number]>()
  for (const doc of docs ?? []) {
    if (!doc.tenancy_id || latestByTenancy.has(doc.tenancy_id)) continue
    latestByTenancy.set(doc.tenancy_id, doc)
  }

  const rows: SignedNotReservingRow[] = []
  for (const [tenancyId, doc] of latestByTenancy) {
    const bookingId = bookingByTenancy.get(tenancyId)
    if (!bookingId) continue
    const bookingStatus = statusByBooking.get(bookingId)
    if (!bookingStatus) continue
    rows.push({
      bookingId,
      bookingStatus,
      docStatus: doc.status ?? null,
      landlordSignedAt: doc.landlord_signed_at ?? null,
      studentSignedAt: doc.student_signed_at ?? null,
    })
  }

  const candidateIds = rows.map((r) => r.bookingId)
  if (candidateIds.length > 0) {
    const { data: smokeEvents, error: smokeErr } = await admin
      .from('booking_events')
      .select('booking_id, reason')
      .in('booking_id', candidateIds)
      .ilike('reason', '[SMOKE%')
    if (smokeErr) throw smokeErr
    for (const ev of smokeEvents ?? []) {
      if (ev.booking_id) smokeBookingIds.add(ev.booking_id)
    }
  }

  return { rows, smokeBookingIds }
}
