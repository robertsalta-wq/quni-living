import {
  isMissingQldNoticeConsentTable,
  projectQldNoticeConsents,
  qldNoticeConsentEventsToReach,
  type QldNoticeConsentEventRow,
  type QldNoticeParty,
} from './qldNoticeConsent.js'
import type { QldNoticeConsentFormState } from './qldRoomingListingFields.js'

function asRows(data: unknown): QldNoticeConsentEventRow[] {
  return Array.isArray(data) ? (data as QldNoticeConsentEventRow[]) : []
}

/** Service-role persist. Swallows a missing table so Preview can run before Rob applies SQL. */
export async function recordQldNoticeConsentEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: { from: (table: string) => any },
  args: {
    propertyId: string
    party: QldNoticeParty
    bookingId?: string | null
    desired: QldNoticeConsentFormState
    createdBy?: string | null
  },
): Promise<void> {
  const bookingId = args.bookingId ?? null
  let query = admin
    .from('qld_notice_consent_events')
    .select('id, property_id, booking_id, party, channel, action, permitted, address, created_at')
    .eq('property_id', args.propertyId)
    .eq('party', args.party)
  query = bookingId ? query.eq('booking_id', bookingId) : query.is('booking_id', null)
  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) {
    if (isMissingQldNoticeConsentTable(error)) return
    throw error
  }
  const events = qldNoticeConsentEventsToReach({
    party: args.party,
    bookingId,
    current: projectQldNoticeConsents(asRows(data)),
    desired: args.desired,
  })
  if (events.length === 0) return
  const { error: insErr } = await admin.from('qld_notice_consent_events').insert(
    events.map((row) => ({
      property_id: args.propertyId,
      booking_id: row.booking_id,
      party: row.party,
      channel: row.channel,
      action: row.action,
      permitted: row.permitted,
      address: row.address,
      created_by: args.createdBy ?? null,
    })),
  )
  if (insErr && !isMissingQldNoticeConsentTable(insErr)) throw insErr
}
