import { describe, expect, it } from 'vitest'
import {
  resolveBookingReviewHoldNote,
  resolveBookingReviewHoldRow,
  resolveBookingReviewRentBreakdownRows,
} from './bookingReviewTermsSummary'

describe('resolveBookingReviewHoldRow (§14 — managed deposit visibility)', () => {
  it('never shows for Listing, regardless of status', () => {
    for (const status of ['pending_confirmation', 'bond_pending', 'confirmed', 'active', 'completed']) {
      const row = resolveBookingReviewHoldRow({
        tier: 'listing',
        status,
        depositAmountCents: 50000,
        depositReleasedAt: null,
      })
      expect(row.show).toBe(false)
    }
  })

  it('hides for Managed pre-acceptance statuses (deposit not yet held)', () => {
    for (const status of ['pending', 'pending_payment', 'pending_confirmation', 'awaiting_info', 'payment_failed', 'expired']) {
      const row = resolveBookingReviewHoldRow({
        tier: 'managed',
        status,
        depositAmountCents: 50000,
        depositReleasedAt: null,
      })
      expect(row.show).toBe(false)
    }
  })

  it('shows the held deposit amount at bond_pending / confirmed, captioned "Until day after move-in"', () => {
    for (const status of ['bond_pending', 'confirmed']) {
      const row = resolveBookingReviewHoldRow({
        tier: 'managed',
        status,
        depositAmountCents: 50000,
        depositReleasedAt: null,
      })
      expect(row.show).toBe(true)
      expect(row.valueLabel).toBe('$500')
      expect(row.caption).toBe('Until day after move-in')
      expect(row.toneClass).toBe('text-admin-ink')
    }
  })

  it('shows $0 green with the release date once active and deposit_released_at is set', () => {
    const row = resolveBookingReviewHoldRow({
      tier: 'managed',
      status: 'active',
      depositAmountCents: 50000,
      depositReleasedAt: '2026-07-08T00:00:00.000Z',
    })
    expect(row.show).toBe(true)
    expect(row.valueLabel).toBe('$0')
    expect(row.caption).toContain('after move-in')
    expect(row.toneClass).toBe('text-admin-success-fg')
  })

  it('shows $0 green without a date fallback when active but deposit_released_at is unset', () => {
    const row = resolveBookingReviewHoldRow({
      tier: 'managed',
      status: 'completed',
      depositAmountCents: 50000,
      depositReleasedAt: null,
    })
    expect(row.show).toBe(true)
    expect(row.valueLabel).toBe('$0')
    expect(row.caption).toBe('Released after move-in')
  })
})

describe('resolveBookingReviewHoldNote', () => {
  it('Listing note is tier-only, independent of status', () => {
    const note = resolveBookingReviewHoldNote({
      tier: 'listing',
      status: 'active',
      depositAmountCents: null,
      depositReleasedAt: null,
    })
    expect(note).toContain('Quni holds $0 at any point')
  })

  it('Managed pre-acceptance note explains the deposit will be held from confirmation', () => {
    const note = resolveBookingReviewHoldNote({
      tier: 'managed',
      status: 'pending_confirmation',
      depositAmountCents: null,
      depositReleasedAt: null,
    })
    expect(note).toContain('from confirmation')
  })

  it('Managed active note with release date mentions the released amount and date', () => {
    const note = resolveBookingReviewHoldNote({
      tier: 'managed',
      status: 'active',
      depositAmountCents: 50000,
      depositReleasedAt: '2026-07-08T00:00:00.000Z',
    })
    expect(note).toContain('$500')
    expect(note).toContain('released')
  })
})

describe('resolveBookingReviewRentBreakdownRows', () => {
  it('uses em dash for absent additional occupant / parking rows', () => {
    const rows = resolveBookingReviewRentBreakdownRows({
      weeklyRentAud: 500,
      breakdown: null,
      parkingSelected: null,
    })
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(byKey.base.valueLabel).toBe('$500 /wk')
    expect(byKey.additional.valueLabel).toBe('—')
    expect(byKey.parking.valueLabel).toBe('—')
    expect(byKey.total.valueLabel).toBe('$500 /wk')
    expect(byKey.total.emphasis).toBe(true)
  })

  it('surfaces additional occupant and parking surcharges when present', () => {
    const rows = resolveBookingReviewRentBreakdownRows({
      weeklyRentAud: 560,
      breakdown: { base: 500, couple: 40, parking: 20 },
      parkingSelected: true,
    })
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(byKey.additional.valueLabel).toBe('+$40 /wk')
    expect(byKey.parking.valueLabel).toBe('+$20 /wk')
    expect(byKey.total.valueLabel).toBe('$560 /wk')
  })

  it('omits parking surcharge when parking was not selected even if breakdown has a value', () => {
    const rows = resolveBookingReviewRentBreakdownRows({
      weeklyRentAud: 500,
      breakdown: { base: 500, parking: 20 },
      parkingSelected: false,
    })
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(byKey.parking.valueLabel).toBe('—')
  })
})
