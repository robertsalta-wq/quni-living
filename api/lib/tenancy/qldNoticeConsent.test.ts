import { describe, expect, it } from 'vitest'
import { emptyQldNoticeConsentFormState } from './qldRoomingListingFields.js'
import {
  parseQldResidentNoticeConsentBody,
  projectQldNoticeConsents,
  qldNoticeConsentEventsToReach,
  qldNoticeConsentFormFromProjection,
} from './qldNoticeConsent.js'

describe('qldNoticeConsent', () => {
  it('projects the latest event per channel', () => {
    const projection = projectQldNoticeConsents([
      {
        property_id: 'p',
        booking_id: null,
        party: 'provider',
        channel: 'email',
        action: 'grant',
        permitted: true,
        address: 'old@example.com',
        created_at: '2026-09-01T00:00:00Z',
        id: '1',
      },
      {
        property_id: 'p',
        booking_id: null,
        party: 'provider',
        channel: 'email',
        action: 'change',
        permitted: true,
        address: 'new@example.com',
        created_at: '2026-09-02T00:00:00Z',
        id: '2',
      },
      {
        property_id: 'p',
        booking_id: null,
        party: 'provider',
        channel: 'sms',
        action: 'grant',
        permitted: false,
        address: null,
        created_at: '2026-09-02T00:00:00Z',
        id: '3',
      },
    ])
    expect(projection.email).toEqual({ permitted: true, address: 'new@example.com' })
    expect(projection.sms).toEqual({ permitted: false, address: '' })
  })

  it('emits grant, change, and withdraw rather than overwriting', () => {
    const current = {
      email: { permitted: true, address: 'old@example.com' },
      sms: { permitted: false, address: '' },
    }
    const desired = emptyQldNoticeConsentFormState()
    desired.emailPermitted = 'yes'
    desired.emailAddress = 'new@example.com'
    desired.smsPermitted = 'yes'
    desired.smsAddress = '0400000000'
    const events = qldNoticeConsentEventsToReach({
      party: 'provider',
      bookingId: null,
      current,
      desired,
    })
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'email', action: 'change', address: 'new@example.com' }),
        expect.objectContaining({ channel: 'sms', action: 'grant', permitted: true }),
      ]),
    )
    desired.emailPermitted = 'no'
    desired.emailAddress = ''
    const withdrawn = qldNoticeConsentEventsToReach({
      party: 'provider',
      bookingId: null,
      current,
      desired,
    })
    expect(withdrawn.some((e) => e.channel === 'email' && e.action === 'withdraw')).toBe(true)
  })

  it('does not emit when the form matches the projection', () => {
    const form = qldNoticeConsentFormFromProjection({
      email: { permitted: false, address: '' },
      sms: { permitted: false, address: '' },
    })
    expect(
      qldNoticeConsentEventsToReach({
        party: 'resident',
        bookingId: 'b',
        current: { email: { permitted: false, address: '' }, sms: { permitted: false, address: '' } },
        desired: form,
      }),
    ).toEqual([])
  })

  it('parses resident apply payload without inventing yes', () => {
    expect(parseQldResidentNoticeConsentBody({})).toBeNull()
    expect(
      parseQldResidentNoticeConsentBody({
        emailPermitted: 'no',
        smsPermitted: 'no',
      }),
    ).toEqual({
      emailPermitted: 'no',
      emailAddress: '',
      smsPermitted: 'no',
      smsAddress: '',
    })
  })
})
