import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: vi.fn().mockResolvedValue(null),
}))

import { fetchCoTenantSignerForTenancy } from './coTenantSigning.js'
import {
  LISTING_BOND_DONE_FIELD,
  LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS,
  listingLeaseDocLooksFullySigned,
  maybeAdvanceListingBookingToActive,
} from './maybeAdvanceListingBookingToActive.js'

const bookingId = '00000000-0000-4000-8000-000000000099'

function mockAdmin(opts: {
  booking?: Record<string, unknown> | null
  loadError?: unknown
  tenancyId?: string | null
  leaseDoc?: Record<string, unknown> | null
  updateRows?: unknown[] | null
  updateError?: unknown
}) {
  const booking =
    opts.booking === undefined
      ? {
          id: bookingId,
          status: 'confirmed',
          service_tier_final: 'listing',
          bond_received_by_landlord_at: '2026-07-16T00:00:00.000Z',
        }
      : opts.booking

  const from = vi.fn((table: string) => {
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              opts.loadError
                ? { data: null, error: opts.loadError }
                : { data: booking, error: null },
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: async () => {
                if (opts.updateError) return { data: null, error: opts.updateError }
                return {
                  data:
                    opts.updateRows ??
                    [{ id: bookingId, status: 'active' }],
                  error: null,
                }
              },
            }),
          }),
        }),
      }
    }
    if (table === 'tenancies') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.tenancyId === null ? null : { id: opts.tenancyId ?? 'ten1' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'tenancy_documents') {
      const doc =
        opts.leaseDoc === undefined
          ? {
              status: 'signed',
              landlord_signed_at: '2026-07-13T00:00:00.000Z',
              student_signed_at: '2026-07-13T00:00:00.000Z',
              co_tenant_signed_at: null,
            }
          : opts.leaseDoc
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              order: () => ({
                limit: async () => ({
                  data: doc ? [doc] : [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    }
    return {}
  })

  return { from }
}

describe('listingLeaseDocLooksFullySigned', () => {
  it('treats status signed as fully signed', () => {
    expect(
      listingLeaseDocLooksFullySigned(
        {
          status: 'signed',
          landlord_signed_at: null,
          student_signed_at: null,
          co_tenant_signed_at: null,
        },
        true,
      ),
    ).toBe(true)
  })

  it('requires co-tenant timestamp when co-tenant required and status not signed', () => {
    expect(
      listingLeaseDocLooksFullySigned(
        {
          status: 'sent_for_signing',
          landlord_signed_at: 'a',
          student_signed_at: 'b',
          co_tenant_signed_at: null,
        },
        true,
      ),
    ).toBe(false)
    expect(
      listingLeaseDocLooksFullySigned(
        {
          status: 'sent_for_signing',
          landlord_signed_at: 'a',
          student_signed_at: 'b',
          co_tenant_signed_at: 'c',
        },
        true,
      ),
    ).toBe(true)
  })
})

describe('maybeAdvanceListingBookingToActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchCoTenantSignerForTenancy).mockResolvedValue(null)
  })

  it('advances confirmed + bond + signed → active', async () => {
    const admin = mockAdmin({})
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId)
    expect(result).toEqual({ advanced: true, from: 'confirmed', to: 'active' })
  })

  it('no-ops when bond missing', async () => {
    const admin = mockAdmin({
      booking: {
        id: bookingId,
        status: 'confirmed',
        service_tier_final: 'listing',
        bond_received_by_landlord_at: null,
      },
    })
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId)
    expect(result).toEqual({ advanced: false, reason: 'missing_bond' })
  })

  it('no-ops when not fully signed', async () => {
    const admin = mockAdmin({
      leaseDoc: {
        status: 'sent_for_signing',
        landlord_signed_at: '2026-07-13T00:00:00.000Z',
        student_signed_at: null,
        co_tenant_signed_at: null,
      },
    })
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId)
    expect(result).toEqual({ advanced: false, reason: 'not_fully_signed' })
  })

  it('no-ops when already active', async () => {
    const admin = mockAdmin({
      booking: {
        id: bookingId,
        status: 'active',
        service_tier_final: 'listing',
        bond_received_by_landlord_at: '2026-07-16T00:00:00.000Z',
      },
    })
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId)
    expect(result).toEqual({ advanced: false, reason: 'already_active' })
  })

  it('no-ops for wrong tier', async () => {
    const admin = mockAdmin({
      booking: {
        id: bookingId,
        status: 'confirmed',
        service_tier_final: 'managed',
        bond_received_by_landlord_at: '2026-07-16T00:00:00.000Z',
      },
    })
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId)
    expect(result).toEqual({ advanced: false, reason: 'wrong_tier' })
  })

  it('skips lease query when assumeLeaseFullySigned', async () => {
    const admin = mockAdmin({})
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId, {
      assumeLeaseFullySigned: true,
    })
    expect(result.advanced).toBe(true)
    expect(admin.from).not.toHaveBeenCalledWith('tenancy_documents')
  })

  it('warns on concurrent miss when update matches nothing', async () => {
    const warn = vi.fn()
    const admin = mockAdmin({ updateRows: [] })
    const result = await maybeAdvanceListingBookingToActive(admin as never, bookingId, {
      assumeLeaseFullySigned: true,
      logger: { warn },
    })
    expect(result).toEqual({ advanced: false, reason: 'concurrent_miss' })
    expect(warn).toHaveBeenCalled()
  })
})

describe('Listing bond-done signal constants', () => {
  it('declares bond_received_by_landlord_at as sole bond-done field', () => {
    expect(LISTING_BOND_DONE_FIELD).toBe('bond_received_by_landlord_at')
  })

  it('lists RTA fields as not alternate bond-done signals', () => {
    expect(LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS).toContain('rta_bond_lodged_at')
    expect(LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS).toContain('rta_bond_number')
    expect(LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS).not.toContain(LISTING_BOND_DONE_FIELD)
  })
})
