/**
 * Status-coverage smoke — every bookings.status must resolve layout + action copy for both roles.
 * Keeps commit-1 layout tests and commit-5b action-model tests as the detailed source of truth;
 * this file only asserts the cross-cutting “no blank status” invariant for the v3 review surfaces.
 */
import { describe, expect, it } from 'vitest'
import {
  resolveBookingReviewLayout,
  type BookingReviewStatus,
} from './bookingReviewLayout'
import {
  resolveLandlordBookingReviewActionCopy,
  resolveRenterBookingReviewActionCopy,
} from './bookingReviewActionModel'

const ALL_STATUSES: BookingReviewStatus[] = [
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

describe('booking review v3 status coverage smoke', () => {
  it('every status has a non-blank layout + action-card title for landlord and renter', () => {
    for (const status of ALL_STATUSES) {
      const llLayout = resolveBookingReviewLayout(status, 'landlord')
      const renLayout = resolveBookingReviewLayout(status, 'renter')
      expect(llLayout.shell, `${status} landlord shell`).toBeTruthy()
      expect(renLayout.shell, `${status} renter shell`).toBeTruthy()
      expect(llLayout.pageTitle.length, `${status} landlord H1`).toBeGreaterThan(0)
      expect(renLayout.pageTitle.length, `${status} renter H1`).toBeGreaterThan(0)

      const llAction = resolveLandlordBookingReviewActionCopy({
        status,
        studentDisplayName: 'Geonho Lee',
        askedAtLabel: '8 Jul',
        bondDeadlineLabel: '18 Jul 2026',
        hasActionRequired: true,
      })
      const renAction = resolveRenterBookingReviewActionCopy({
        status,
        landlordDisplayName: 'Quinn D.',
        askedAtLabel: '8 Jul',
        sentAtLabel: '7 Jul',
        bondDeadlineLabel: '18 Jul 2026',
        obligationSub: null,
      })
      expect(llAction.title.length, `${status} landlord action`).toBeGreaterThan(0)
      expect(renAction.title.length, `${status} renter action`).toBeGreaterThan(0)
    }
  })

  it('payment_failed keeps landlord waiting / renter retry roles (layout H1 + action titles)', () => {
    const ll = resolveBookingReviewLayout('payment_failed', 'landlord')
    const ren = resolveBookingReviewLayout('payment_failed', 'renter')
    expect(ll.shell).toBe('pre')
    expect(ren.shell).toBe('pre')
    expect(ll.pageTitle).toBe('Waiting on payment')
    expect(ren.pageTitle).toBe('Payment failed')
    expect(ll.showTierChooser).toBe(false)

    const llAction = resolveLandlordBookingReviewActionCopy({
      status: 'payment_failed',
      studentDisplayName: 'Geonho',
      askedAtLabel: null,
      bondDeadlineLabel: null,
      hasActionRequired: false,
    })
    const renAction = resolveRenterBookingReviewActionCopy({
      status: 'payment_failed',
      landlordDisplayName: 'Quinn',
      askedAtLabel: null,
      sentAtLabel: null,
      bondDeadlineLabel: null,
      obligationSub: null,
    })
    expect(llAction.eyebrowTone).toBe('status')
    expect(llAction.title).toBe("Waiting on the applicant's payment")
    expect(renAction.eyebrowTone).toBe('action')
    expect(renAction.title).toBe('Payment failed')
  })

  it('awaiting_info stays on Request stepper and hides tier/backups for landlord', () => {
    const layout = resolveBookingReviewLayout('awaiting_info', 'landlord')
    expect(layout.shell).toBe('pre')
    expect(layout.stepperIndex).toBe(0)
    expect(layout.showTierChooser).toBe(false)
    expect(layout.showBackupsWarning).toBe(false)
    expect(layout.showAgreement).toBe(false)
  })
})
