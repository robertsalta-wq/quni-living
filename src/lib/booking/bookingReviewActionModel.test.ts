import { describe, expect, it } from 'vitest'
import {
  formatBookingReviewShortDate,
  resolveLandlordAwaitingInfoQuestion,
  resolveLandlordBookingReviewActionCopy,
  resolveRenterBookingReviewActionCopy,
  type BookingReviewActionStatus,
} from './bookingReviewActionModel'

const ALL_STATUSES: BookingReviewActionStatus[] = [
  'pending',
  'pending_payment',
  'pending_confirmation',
  'awaiting_info',
  'bond_pending',
  'confirmed',
  'active',
  'cancelled',
  'declined',
  'expired',
  'payment_failed',
  'completed',
]

describe('formatBookingReviewShortDate', () => {
  it('formats without a year', () => {
    const label = formatBookingReviewShortDate('2026-07-08')
    expect(label).toContain('8')
    expect(label).toContain('Jul')
    expect(label).not.toContain('2026')
  })
  it('returns null for empty/invalid input', () => {
    expect(formatBookingReviewShortDate(null)).toBeNull()
    expect(formatBookingReviewShortDate('')).toBeNull()
    expect(formatBookingReviewShortDate('not-a-date')).toBeNull()
  })
})

describe('resolveLandlordAwaitingInfoQuestion', () => {
  it('returns the latest landlord message', () => {
    const q = resolveLandlordAwaitingInfoQuestion([
      { sender_role: 'landlord', message: 'First question', created_at: '2026-07-08T09:00:00.000Z' },
      { sender_role: 'student', message: 'A reply', created_at: '2026-07-08T19:00:00.000Z' },
      { sender_role: 'landlord', message: 'Second question', created_at: '2026-07-09T09:00:00.000Z' },
    ])
    expect(q?.text).toBe('Second question')
    expect(q?.askedAtLabel).toContain('9')
    expect(q?.askedAtLabel).toContain('Jul')
  })

  it('returns null when there is no landlord message', () => {
    expect(
      resolveLandlordAwaitingInfoQuestion([
        { sender_role: 'student', message: 'Hello', created_at: '2026-07-08T09:00:00.000Z' },
      ]),
    ).toBeNull()
    expect(resolveLandlordAwaitingInfoQuestion(null)).toBeNull()
    expect(resolveLandlordAwaitingInfoQuestion([])).toBeNull()
  })
})

describe('resolveLandlordBookingReviewActionCopy', () => {
  it('maps every status to a non-blank title', () => {
    for (const status of ALL_STATUSES) {
      const copy = resolveLandlordBookingReviewActionCopy({
        status,
        studentDisplayName: 'Geonho Lee',
        askedAtLabel: '8 Jul',
        bondDeadlineLabel: '18 Jul 2026',
        hasActionRequired: true,
      })
      expect(copy.title.length).toBeGreaterThan(0)
    }
  })

  it('awaiting_info is a status (grey) eyebrow with the asked deadline', () => {
    const copy = resolveLandlordBookingReviewActionCopy({
      status: 'awaiting_info',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: '8 Jul',
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(copy.eyebrowTone).toBe('status')
    expect(copy.title).toBe('Waiting on the applicant')
    expect(copy.deadlineLabel).toBe('Asked 8 Jul')
  })

  it('bond_pending is an action (coral) eyebrow titled "Confirm the bond"', () => {
    const copy = resolveLandlordBookingReviewActionCopy({
      status: 'bond_pending',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: null,
      bondDeadlineLabel: '18 Jul 2026',
      hasActionRequired: true,
    })
    expect(copy.eyebrowTone).toBe('action')
    expect(copy.title).toBe('Confirm the bond')
    expect(copy.deadlineLabel).toBe('18 Jul 2026')
  })

  it('payment_failed is status-only for the landlord (no accept, no action tone)', () => {
    const copy = resolveLandlordBookingReviewActionCopy({
      status: 'payment_failed',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(copy.eyebrowTone).toBe('status')
    expect(copy.title).toBe("Waiting on the applicant's payment")
  })

  it('confirmed / active / declined / expired have distinct titles from the page H1', () => {
    const confirmed = resolveLandlordBookingReviewActionCopy({
      status: 'confirmed',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(confirmed.title).toBe('Chase the signature')

    const active = resolveLandlordBookingReviewActionCopy({
      status: 'active',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(active.title).toBe('Tenancy is active')

    const declined = resolveLandlordBookingReviewActionCopy({
      status: 'declined',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(declined.title).toBe('Request declined')

    const expired = resolveLandlordBookingReviewActionCopy({
      status: 'expired',
      studentDisplayName: 'Geonho Lee',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    expect(expired.title).toContain('expired')
  })
})

describe('resolveRenterBookingReviewActionCopy', () => {
  it('maps every status to a non-blank title', () => {
    for (const status of ALL_STATUSES) {
      const copy = resolveRenterBookingReviewActionCopy({
        status,
        landlordDisplayName: 'Quinn D.',
        askedAtLabel: '8 Jul',
        sentAtLabel: '7 Jul',
        bondDeadlineLabel: '18 Jul 2026',
        obligationSub: null,
      })
      expect(copy.title.length).toBeGreaterThan(0)
    }
  })

  it('prefers the obligation sub copy when present', () => {
    const copy = resolveRenterBookingReviewActionCopy({
      status: 'bond_pending',
      landlordDisplayName: 'Quinn D.',
      askedAtLabel: null,
      sentAtLabel: null,
      bondDeadlineLabel: '18 Jul 2026',
      obligationSub: '$1,000 to your landlord by 18 July',
    })
    expect(copy.sub).toBe('$1,000 to your landlord by 18 July')
    expect(copy.title).toBe('Pay your bond')
  })

  it('payment_failed is action-required for the renter (unlike the landlord)', () => {
    const copy = resolveRenterBookingReviewActionCopy({
      status: 'payment_failed',
      landlordDisplayName: 'Quinn D.',
      askedAtLabel: null,
      sentAtLabel: null,
      bondDeadlineLabel: null,
      obligationSub: null,
    })
    expect(copy.eyebrowTone).toBe('action')
    expect(copy.title).toBe('Payment failed')
  })
})
