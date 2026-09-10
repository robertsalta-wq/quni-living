/**
 * Form R18 item 5 notice consents, stored as events.
 * Projection is the latest event per party × channel. Fill (Stage 4) reads the projection.
 * Do not hardcode email Yes.
 */

import {
  emptyQldNoticeConsentFormState,
  type QldNoticeConsentFormState,
  type QldYesNo,
} from './qldRoomingListingFields.js'

export const QLD_NOTICE_CONSENT_TABLE = 'qld_notice_consent_events'

export type QldNoticeParty =
  | 'provider'
  | 'resident'
  | 'provider_agent'
  | 'resident_representative'

export type QldNoticeChannel = 'email' | 'sms'

export type QldNoticeAction = 'grant' | 'change' | 'withdraw'

export type QldNoticeConsentEventRow = {
  id?: string
  property_id: string
  booking_id: string | null
  party: QldNoticeParty
  channel: QldNoticeChannel
  action: QldNoticeAction
  permitted: boolean
  address: string | null
  created_at?: string
  created_by?: string | null
}

export type QldNoticeChannelProjection = {
  permitted: boolean
  address: string
}

export type QldNoticeConsentProjection = {
  email: QldNoticeChannelProjection | null
  sms: QldNoticeChannelProjection | null
}

export function emptyQldNoticeConsentProjection(): QldNoticeConsentProjection {
  return { email: null, sms: null }
}

export function projectQldNoticeConsents(
  events: readonly QldNoticeConsentEventRow[],
): QldNoticeConsentProjection {
  const sorted = [...events].sort((a, b) => {
    const at = a.created_at ?? ''
    const bt = b.created_at ?? ''
    if (at === bt) return (a.id ?? '').localeCompare(b.id ?? '')
    return at.localeCompare(bt)
  })
  const out = emptyQldNoticeConsentProjection()
  for (const ev of sorted) {
    if (ev.channel !== 'email' && ev.channel !== 'sms') continue
    out[ev.channel] = {
      permitted: Boolean(ev.permitted),
      address: typeof ev.address === 'string' ? ev.address : '',
    }
  }
  return out
}

export function qldNoticeConsentFormFromProjection(
  projection: QldNoticeConsentProjection,
): QldNoticeConsentFormState {
  const toYesNo = (row: QldNoticeChannelProjection | null): QldYesNo => {
    if (!row) return ''
    return row.permitted ? 'yes' : 'no'
  }
  return {
    emailPermitted: toYesNo(projection.email),
    emailAddress: projection.email?.address ?? '',
    smsPermitted: toYesNo(projection.sms),
    smsAddress: projection.sms?.address ?? '',
  }
}

function channelDesired(
  permitted: QldYesNo,
  address: string,
): QldNoticeChannelProjection | null {
  if (permitted !== 'yes' && permitted !== 'no') return null
  return {
    permitted: permitted === 'yes',
    address: permitted === 'yes' ? address.trim() : '',
  }
}

function eventsForChannel(args: {
  party: QldNoticeParty
  bookingId: string | null
  channel: QldNoticeChannel
  current: QldNoticeChannelProjection | null
  desired: QldNoticeChannelProjection | null
}): Array<Omit<QldNoticeConsentEventRow, 'property_id' | 'created_by' | 'id' | 'created_at'>> {
  if (!args.desired) return []
  const desired = args.desired
  const current = args.current
  if (
    current &&
    current.permitted === desired.permitted &&
    current.address.trim() === desired.address.trim()
  ) {
    return []
  }
  let action: QldNoticeAction = 'grant'
  if (current) {
    if (current.permitted && !desired.permitted) action = 'withdraw'
    else if (current.permitted === desired.permitted && current.address.trim() !== desired.address.trim()) {
      action = 'change'
    } else action = 'grant'
  }
  return [
    {
      booking_id: args.bookingId,
      party: args.party,
      channel: args.channel,
      action,
      permitted: desired.permitted,
      address: desired.permitted ? desired.address : null,
    },
  ]
}

export function qldNoticeConsentEventsToReach(args: {
  party: QldNoticeParty
  bookingId: string | null
  current: QldNoticeConsentProjection
  desired: QldNoticeConsentFormState
}): Array<Omit<QldNoticeConsentEventRow, 'property_id' | 'created_by' | 'id' | 'created_at'>> {
  return [
    ...eventsForChannel({
      party: args.party,
      bookingId: args.bookingId,
      channel: 'email',
      current: args.current.email,
      desired: channelDesired(args.desired.emailPermitted, args.desired.emailAddress),
    }),
    ...eventsForChannel({
      party: args.party,
      bookingId: args.bookingId,
      channel: 'sms',
      current: args.current.sms,
      desired: channelDesired(args.desired.smsPermitted, args.desired.smsAddress),
    }),
  ]
}

export function parseQldResidentNoticeConsentBody(raw: unknown): QldNoticeConsentFormState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const emailPermitted =
    o.emailPermitted === 'yes' || o.emailPermitted === 'no' ? o.emailPermitted : ''
  const smsPermitted = o.smsPermitted === 'yes' || o.smsPermitted === 'no' ? o.smsPermitted : ''
  if (!emailPermitted || !smsPermitted) return null
  return {
    ...emptyQldNoticeConsentFormState(),
    emailPermitted,
    emailAddress: typeof o.emailAddress === 'string' ? o.emailAddress : '',
    smsPermitted,
    smsAddress: typeof o.smsAddress === 'string' ? o.smsAddress : '',
  }
}

export function isMissingQldNoticeConsentTable(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  return (
    msg.includes('qld_notice_consent_events') &&
    (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find'))
  )
}
