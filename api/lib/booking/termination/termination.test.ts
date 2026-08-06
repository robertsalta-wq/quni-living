import { describe, expect, it, vi } from 'vitest'
import {
  effectiveDateReached,
  isBondOutcome,
  isTerminationType,
  parseIsoDateOnly,
} from './types.js'
import { runFinalizeTerminatedBooking } from './finalizeTerminatedBooking.js'
import { isTerminalBookingStatus } from '../terminalBookingStatus.js'
import { PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES } from '../tenantBookingPipelineStatuses.js'
import { STATUS_LIFECYCLE } from '../statusLifecycle.js'

describe('termination types', () => {
  it('parses dates and bond outcomes', () => {
    expect(parseIsoDateOnly('2026-08-10')).toBe('2026-08-10')
    expect(parseIsoDateOnly('nope')).toBeNull()
    expect(isBondOutcome('never_lodged')).toBe(true)
    expect(isTerminationType('mutual_surrender')).toBe(true)
    expect(effectiveDateReached('2020-01-01', new Date('2026-08-03T12:00:00Z'))).toBe(true)
    expect(effectiveDateReached('2099-01-01', new Date('2026-08-03T12:00:00Z'))).toBe(false)
  })
})

describe('termination status semantics', () => {
  it('treats terminated as terminal but not terminating', () => {
    expect(isTerminalBookingStatus('terminated')).toBe(true)
    expect(isTerminalBookingStatus('terminating')).toBe(false)
    expect(isTerminalBookingStatus('cancelled')).toBe(true)
  })

  it('keeps terminating in the reserved set; terminated out', () => {
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).toContain('terminating')
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).not.toContain('terminated')
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).not.toContain('cancelled')
  })

  it('declares listing lifecycle edges for terminate and withdraw', () => {
    const edges = STATUS_LIFECYCLE.listing.edges
    expect(edges.some((e) => e.from === 'active' && e.to === 'terminating')).toBe(true)
    expect(edges.some((e) => e.from === 'confirmed' && e.to === 'terminating')).toBe(true)
    expect(edges.some((e) => e.from === 'terminating' && e.to === 'terminated')).toBe(true)
    expect(edges.some((e) => e.from === 'terminating' && e.to === 'active')).toBe(true)
    expect(edges.some((e) => e.from === 'terminating' && e.to === 'confirmed')).toBe(true)
  })
})

describe('runFinalizeTerminatedBooking', () => {
  it('skips when awaiting acknowledgment', async () => {
    const update = vi.fn()
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                id: 'b1',
                status: 'terminating',
                termination_type: 'mutual_surrender',
                termination_effective_date: '2020-01-01',
                termination_acknowledged_at: null,
                landlord_id: 'l1',
                student_id: 's1',
                property_id: 'p1',
                service_tier_final: 'listing',
                termination_initiated_by: 'landlord',
                bond_outcome: 'never_lodged',
              },
              error: null,
            })),
          })),
        })),
        update,
      })),
    }

    const r = await runFinalizeTerminatedBooking({
      admin: admin as never,
      bookingId: 'b1',
      now: new Date('2026-08-03T12:00:00Z'),
    })
    expect(r).toEqual({ ok: true, skipped: true, reason: 'awaiting_acknowledgment' })
    expect(update).not.toHaveBeenCalled()
  })

  it('finalizes when acknowledged and effective date reached', async () => {
    const recordBookingEvent = vi.fn()
    vi.doMock('../events/recordBookingEvent.js', () => ({ recordBookingEvent }))
    vi.doMock('../unwindListingAgreement.js', () => ({
      runUnwindListingAgreementCleanup: vi.fn(async () => undefined),
    }))

    const { runFinalizeTerminatedBooking: finalize } = await import('./finalizeTerminatedBooking.js')

    let status = 'terminating'
    const admin = {
      from: vi.fn((table: string) => {
        if (table !== 'bookings') throw new Error(table)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: 'b1',
                  status,
                  termination_type: 'mutual_surrender',
                  termination_effective_date: '2020-01-01',
                  termination_acknowledged_at: '2020-01-01T00:00:00Z',
                  landlord_id: 'l1',
                  student_id: 's1',
                  property_id: 'p1',
                  service_tier_final: 'listing',
                  termination_initiated_by: 'landlord',
                  bond_outcome: 'never_lodged',
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(async () => {
                  status = 'terminated'
                  return { data: [{ id: 'b1' }], error: null }
                }),
              })),
            })),
          })),
        }
      }),
    }

    const r = await finalize({
      admin: admin as never,
      bookingId: 'b1',
      now: new Date('2026-08-03T12:00:00Z'),
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.skipped).toBe(false)
  })
})
