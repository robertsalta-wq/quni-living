import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import {
  isMissingQldNoticeConsentTable,
  projectQldNoticeConsents,
  qldNoticeConsentEventsToReach,
  qldNoticeConsentFormFromProjection,
  type QldNoticeConsentEventRow,
  type QldNoticeParty,
} from './qldNoticeConsent'
import type { QldNoticeConsentFormState } from './qldRoomingListingFields'

type NoticeClient = SupabaseClient<Database>

function asEventRows(data: unknown): QldNoticeConsentEventRow[] {
  if (!Array.isArray(data)) return []
  return data as QldNoticeConsentEventRow[]
}

export async function loadQldNoticeConsentForm(
  client: NoticeClient,
  args: { propertyId: string; party: QldNoticeParty; bookingId?: string | null },
): Promise<QldNoticeConsentFormState> {
  let query = client
    .from('qld_notice_consent_events')
    .select('id, property_id, booking_id, party, channel, action, permitted, address, created_at')
    .eq('property_id', args.propertyId)
    .eq('party', args.party)
    .order('created_at', { ascending: true })
  query = args.bookingId
    ? query.eq('booking_id', args.bookingId)
    : query.is('booking_id', null)
  const { data, error } = await query
  if (error) {
    if (isMissingQldNoticeConsentTable(error)) {
      return qldNoticeConsentFormFromProjection({ email: null, sms: null })
    }
    throw error
  }
  return qldNoticeConsentFormFromProjection(projectQldNoticeConsents(asEventRows(data)))
}

export async function persistQldNoticeConsentEvents(
  client: NoticeClient,
  args: {
    propertyId: string
    party: QldNoticeParty
    bookingId?: string | null
    desired: QldNoticeConsentFormState
    createdBy?: string | null
  },
): Promise<void> {
  const bookingId = args.bookingId ?? null
  let query = client
    .from('qld_notice_consent_events')
    .select('id, property_id, booking_id, party, channel, action, permitted, address, created_at')
    .eq('property_id', args.propertyId)
    .eq('party', args.party)
    .order('created_at', { ascending: true })
  query = bookingId ? query.eq('booking_id', bookingId) : query.is('booking_id', null)
  const { data, error } = await query
  if (error) {
    if (isMissingQldNoticeConsentTable(error)) return
    throw error
  }
  const events = qldNoticeConsentEventsToReach({
    party: args.party,
    bookingId,
    current: projectQldNoticeConsents(asEventRows(data)),
    desired: args.desired,
  })
  if (events.length === 0) return
  const { error: insErr } = await client.from('qld_notice_consent_events').insert(
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
  if (!insErr) return
  if (isMissingQldNoticeConsentTable(insErr)) return
  throw insErr
}
