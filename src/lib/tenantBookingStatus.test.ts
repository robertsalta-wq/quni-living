import { describe, expect, it } from 'vitest'
import {
  tenantBookingAtAGlanceKind,
  tenantBookingCardBanner,
  tenantBookingStatusLabel,
  tenantDashboardStatusStrip,
} from './tenantBookingStatus'

describe('tenantBookingStatusLabel', () => {
  it('uses plain language for pipeline statuses', () => {
    expect(tenantBookingStatusLabel('pending_confirmation')).toBe('Request submitted')
    expect(tenantBookingStatusLabel('bond_pending')).toBe('Host accepted')
  })
})

describe('tenantBookingAtAGlanceKind', () => {
  it('maps submitted vs accepted vs confirmed', () => {
    expect(tenantBookingAtAGlanceKind('pending_confirmation')).toBe('request_submitted')
    expect(tenantBookingAtAGlanceKind('bond_pending')).toBe('host_accepted')
    expect(tenantBookingAtAGlanceKind('confirmed')).toBe('confirmed')
  })
})

describe('tenantBookingCardBanner', () => {
  it('returns banner for pending_confirmation', () => {
    const b = tenantBookingCardBanner('pending_confirmation', 'listing')
    expect(b?.text).toMatch(/Application submitted/)
    expect(b?.text).toMatch(/7 days/)
  })

  it('returns banner for bond_pending', () => {
    const b = tenantBookingCardBanner('bond_pending')
    expect(b?.text).toMatch(/Host accepted/)
  })
})

describe('tenantDashboardStatusStrip', () => {
  it('returns mobile strip for key states', () => {
    expect(tenantDashboardStatusStrip('pending_confirmation')?.title).toBe('Booking request submitted')
    expect(tenantDashboardStatusStrip('bond_pending')?.title).toBe('Complete bond & agreement')
    expect(tenantDashboardStatusStrip('confirmed')?.title).toBe('Booking confirmed')
  })
})
