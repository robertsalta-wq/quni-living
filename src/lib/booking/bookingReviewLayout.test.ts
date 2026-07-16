import { describe, expect, it } from 'vitest'
import {
  BOOKING_REVIEW_STEPPER_LABELS,
  bookingReviewShellForStatus,
  resolveBookingReviewLayout,
  type BookingReviewStatus,
} from './bookingReviewLayout'

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

describe('BOOKING_REVIEW_STEPPER_LABELS', () => {
  it('matches HTML SoT labels (not MD Accepted wording)', () => {
    expect(BOOKING_REVIEW_STEPPER_LABELS).toEqual(['Request', 'Bond', 'Agreement', 'Active'])
  })
})

describe('resolveBookingReviewLayout', () => {
  it('maps every booking status to a non-blank shell', () => {
    for (const status of ALL_STATUSES) {
      const layout = resolveBookingReviewLayout(status, 'landlord')
      expect(layout.shell).toBeTruthy()
      expect(layout.pageTitle.length).toBeGreaterThan(0)
      expect(layout.stepperIndex).toBeGreaterThanOrEqual(0)
      expect(layout.stepperIndex).toBeLessThanOrEqual(3)
    }
  })

  it('uses HTML page titles for core landlord × renter states', () => {
    expect(resolveBookingReviewLayout('pending_confirmation', 'landlord').pageTitle).toBe(
      'Booking request',
    )
    expect(resolveBookingReviewLayout('pending_confirmation', 'renter').pageTitle).toBe(
      'Request sent',
    )
    expect(resolveBookingReviewLayout('awaiting_info', 'landlord').pageTitle).toBe(
      'Awaiting response',
    )
    expect(resolveBookingReviewLayout('awaiting_info', 'renter').pageTitle).toBe('Reply needed')
    expect(resolveBookingReviewLayout('bond_pending', 'landlord').pageTitle).toBe('Bond pending')
    expect(resolveBookingReviewLayout('bond_pending', 'renter').pageTitle).toBe('Bond due')
    expect(resolveBookingReviewLayout('confirmed', 'landlord').pageTitle).toBe(
      'Awaiting signature',
    )
    expect(resolveBookingReviewLayout('active', 'renter').pageTitle).toBe('Tenancy active')
    expect(resolveBookingReviewLayout('declined', 'landlord').pageTitle).toBe('Request declined')
  })

  it('keeps awaiting_info on the Request stepper step (sub-state of requested)', () => {
    const layout = resolveBookingReviewLayout('awaiting_info', 'landlord')
    expect(layout.shell).toBe('pre')
    expect(layout.stepperIndex).toBe(0)
    expect(layout.showTierChooser).toBe(false)
    expect(layout.showBackupsWarning).toBe(false)
    expect(layout.showAgreement).toBe(false)
  })

  it('shows tier chooser only for landlord pre (not awaiting_info)', () => {
    expect(resolveBookingReviewLayout('pending_confirmation', 'landlord').showTierChooser).toBe(
      true,
    )
    expect(resolveBookingReviewLayout('pending_confirmation', 'renter').showTierChooser).toBe(
      false,
    )
    expect(resolveBookingReviewLayout('awaiting_info', 'landlord').showTierChooser).toBe(false)
    expect(resolveBookingReviewLayout('bond_pending', 'landlord').showTierChooser).toBe(false)
  })

  it('opens agreement/activity from bond_pending onward', () => {
    expect(resolveBookingReviewLayout('pending_confirmation', 'landlord').showAgreement).toBe(
      false,
    )
    expect(resolveBookingReviewLayout('bond_pending', 'landlord').showAgreement).toBe(true)
    expect(resolveBookingReviewLayout('confirmed', 'renter').showActivity).toBe(true)
    expect(resolveBookingReviewLayout('bond_pending', 'landlord').agreementDefaultOpen).toBe(
      false,
    )
    expect(resolveBookingReviewLayout('bond_pending', 'landlord').activityDefaultOpen).toBe(
      false,
    )
  })

  it('collapses applicant and evaluation defaults after confirmation', () => {
    const pre = resolveBookingReviewLayout('pending_confirmation', 'landlord')
    expect(pre.applicantCollapsible).toBe(false)
    expect(pre.applicantDefaultOpen).toBe(true)
    expect(pre.evaluationDefaultOpen).toBe(true)

    const confirmed = resolveBookingReviewLayout('confirmed', 'landlord')
    expect(confirmed.applicantCollapsible).toBe(true)
    expect(confirmed.applicantDefaultOpen).toBe(false)
    expect(confirmed.evaluationDefaultOpen).toBe(false)

    const active = resolveBookingReviewLayout('active', 'landlord')
    expect(active.applicantCollapsible).toBe(true)
    expect(active.evaluationDefaultOpen).toBe(false)
    expect(active.stepperComplete).toBe(true)
  })

  it('maps stepper indices from HTML order', () => {
    expect(resolveBookingReviewLayout('pending_confirmation', 'landlord').stepperIndex).toBe(0)
    expect(resolveBookingReviewLayout('bond_pending', 'landlord').stepperIndex).toBe(1)
    expect(resolveBookingReviewLayout('confirmed', 'landlord').stepperIndex).toBe(2)
    expect(resolveBookingReviewLayout('active', 'landlord').stepperIndex).toBe(3)
    expect(resolveBookingReviewLayout('completed', 'landlord').stepperIndex).toBe(3)
  })

  describe('payment_failed → pre-acceptance shell (§17 confirmed)', () => {
    it('uses pre shell, hides tier/backups, landlord title waits on payment', () => {
      expect(bookingReviewShellForStatus('payment_failed')).toBe('pre')
      const landlord = resolveBookingReviewLayout('payment_failed', 'landlord')
      const renter = resolveBookingReviewLayout('payment_failed', 'renter')
      expect(landlord.shell).toBe('pre')
      expect(renter.shell).toBe('pre')
      expect(landlord.stepperIndex).toBe(0)
      expect(landlord.showAgreement).toBe(false)
      expect(landlord.showTierChooser).toBe(false)
      expect(landlord.showBackupsWarning).toBe(false)
      expect(landlord.pageTitle).toBe('Waiting on payment')
      expect(renter.pageTitle).toBe('Payment failed')
    })
  })

  it('disables inputs for expired / declined / cancelled', () => {
    expect(resolveBookingReviewLayout('expired', 'landlord').inputsDisabled).toBe(true)
    expect(resolveBookingReviewLayout('expired', 'landlord').shell).toBe('expired')
    expect(resolveBookingReviewLayout('declined', 'landlord').inputsDisabled).toBe(true)
    expect(resolveBookingReviewLayout('cancelled', 'landlord').shell).toBe('declined')
  })
})
