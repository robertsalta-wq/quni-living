import { describe, expect, it, vi } from 'vitest'
import { PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES } from './tenantBookingPipelineStatuses.js'
import { checkPropertyAvailableForNewApplication } from './propertyAvailability.js'

describe('checkPropertyAvailableForNewApplication (Listing + Managed apply commit guard)', () => {
  it('uses PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES including bond_pending', () => {
    expect(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES).toContain('bond_pending')
  })

  it('rejects apply when property has a bond_pending reservation (Listing commit preamble)', async () => {
    let queriedStatuses: string[] | undefined

    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            in: (column: string, statuses: string[]) => {
              expect(column).toBe('status')
              queriedStatuses = statuses
              return {
                limit: async () => ({
                  data: [{ id: 'winner-bond-pending', status: 'bond_pending' }],
                  error: null,
                }),
              }
            },
          }),
        }),
      })),
    }

    const result = await checkPropertyAvailableForNewApplication(admin as never, 'property-1')

    expect(queriedStatuses).toEqual(PROPERTY_RESERVED_FOR_NEW_APPLICATIONS_STATUSES)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.body.error).toBe('property_unavailable')
  })

  it('allows apply when only pending_confirmation siblings exist (not reserved)', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      })),
    }

    const result = await checkPropertyAvailableForNewApplication(admin as never, 'property-1')
    expect(result).toEqual({ ok: true })
  })

  it('allows apply when no blocking bookings exist', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      })),
    }

    const result = await checkPropertyAvailableForNewApplication(admin as never, 'property-1')
    expect(result.ok).toBe(true)
  })
})
