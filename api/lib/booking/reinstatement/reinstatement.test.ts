import { describe, expect, it, vi } from 'vitest'
import {
  graceWindowExpiresAt,
  isWithinReinstatementGrace,
  REINSTATEMENT_GRACE_MS,
  validateV1FeeAction,
} from './constants.js'
import { assertReinstatementRequestEligibility, parseOptionalFeeAction } from './eligibility.js'

describe('reinstatement constants', () => {
  it('grace window is 30 days', () => {
    expect(REINSTATEMENT_GRACE_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('isWithinReinstatementGrace respects expired_at + 30d', () => {
    const expiredAt = '2026-06-01T00:00:00.000Z'
    const within = new Date('2026-06-15T00:00:00.000Z').getTime()
    const past = new Date('2026-07-02T00:00:00.000Z').getTime()
    expect(isWithinReinstatementGrace(expiredAt, within)).toBe(true)
    expect(isWithinReinstatementGrace(expiredAt, past)).toBe(false)
    expect(isWithinReinstatementGrace(null)).toBe(false)
  })

  it('graceWindowExpiresAt adds REINSTATEMENT_GRACE_MS', () => {
    expect(graceWindowExpiresAt('2026-06-01T00:00:00.000Z')).toBe('2026-07-01T00:00:00.000Z')
  })

  it('validateV1FeeAction only allows reinstate_free_flagged', () => {
    expect(validateV1FeeAction('reinstate_free_flagged')).toBe(true)
    expect(validateV1FeeAction('recharge')).toBe(false)
    expect(validateV1FeeAction(undefined)).toBe(false)
  })
})

describe('assertReinstatementRequestEligibility', () => {
  const base = {
    id: 'b1',
    status: 'expired',
    landlord_id: 'll',
    student_id: 'st',
    property_id: 'p1',
    service_tier_final: 'listing',
    expired_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    bond_received_by_landlord_at: null,
    listing_agreement_status: 'voided',
    move_in_date: '2026-08-01',
    start_date: null,
    end_date: null,
  }

  it('accepts expired listing within grace', () => {
    expect(assertReinstatementRequestEligibility(base).ok).toBe(true)
  })

  it('rejects not expired', () => {
    const r = assertReinstatementRequestEligibility({ ...base, status: 'bond_pending' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('not_expired')
  })

  it('rejects withdrawn', () => {
    const r = assertReinstatementRequestEligibility({ ...base, status: 'cancelled' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('withdrawn')
  })

  it('rejects non-listing', () => {
    const r = assertReinstatementRequestEligibility({ ...base, service_tier_final: 'managed' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('not_listing')
  })

  it('rejects missing expired_at', () => {
    const r = assertReinstatementRequestEligibility({ ...base, expired_at: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('missing_expired_at')
  })

  it('rejects past grace', () => {
    const r = assertReinstatementRequestEligibility({
      ...base,
      expired_at: '2020-01-01T00:00:00.000Z',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('grace_elapsed')
  })
})

describe('parseOptionalFeeAction', () => {
  it('allows omit or reinstate_free_flagged', () => {
    expect(parseOptionalFeeAction(undefined).ok).toBe(true)
    expect(parseOptionalFeeAction('reinstate_free_flagged').ok).toBe(true)
  })

  it('rejects recharge', () => {
    const r = parseOptionalFeeAction('recharge')
    expect(r.ok).toBe(false)
  })
})

describe('lazyExpireReinstatementRequest', () => {
  it('flips pending past deadline to window_expired', async () => {
    const { lazyExpireReinstatementRequest } = await import('./requestRows.js')
    const row = {
      id: 'r1',
      booking_id: 'b1',
      requested_by: 'u1',
      requested_by_role: 'landlord' as const,
      requested_at: '2026-01-01T00:00:00.000Z',
      grace_window_expires_at: '2020-01-01T00:00:00.000Z',
      status: 'pending_confirmation' as const,
      requested_fee_action: null,
      confirmed_by: null,
      confirmed_at: null,
      fee_action: null,
      metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }
    const update = vi.fn().mockReturnValue({
      eq: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => ({
              data: { ...row, status: 'window_expired' },
              error: null,
            }),
          }),
        }),
      }),
    })
    const admin = {
      from: vi.fn(() => ({ update })),
    } as any
    const next = await lazyExpireReinstatementRequest(admin, row)
    expect(next.status).toBe('window_expired')
  })
})
