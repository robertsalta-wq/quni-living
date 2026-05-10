import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./listingTransactionalEmails.js', () => ({
  sendListingBondReceivedEmails: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./triggerListingDocumentGeneration.js', () => ({
  triggerListingDocumentGeneration: vi.fn().mockResolvedValue({ ok: true, skipped: true, reason: 'mock' }),
}))

import { sendListingBondReceivedEmails } from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { runMarkBondReceivedLandlord } from './markBondReceived.js'

const llId = 'll1'
const bookingBase = {
  id: '00000000-0000-4000-8000-000000000001',
  landlord_id: llId,
  student_id: 'st1',
  property_id: 'pr1',
  status: 'bond_pending',
  service_tier_final: 'listing',
  bond_received_by_landlord_at: null,
  confirmed_at: '2026-01-01T00:00:00.000Z',
}

function mockAdmin(opts: {
  booking?: Record<string, unknown>
  loadError?: unknown
  updateRows?: unknown[] | null
  updateError?: unknown
  againRow?: Record<string, unknown> | null
  eventError?: unknown
}) {
  const booking = opts.booking ?? bookingBase
  const loadError = opts.loadError ?? null
  const updateRows =
    opts.updateRows ??
    ([
      {
        ...booking,
        status: 'confirmed',
        bond_received_by_landlord_at: '2026-05-09T12:00:00.000Z',
      },
    ] as Record<string, unknown>[])
  const updateError = opts.updateError ?? null
  const againRow = opts.againRow
  const eventError = opts.eventError ?? null

  let bookingsN = 0

  const from = vi.fn((table: string) => {
    if (table === 'bookings') {
      bookingsN += 1
      if (bookingsN === 1) {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                loadError ? { data: null, error: loadError } : { data: booking, error: null },
            }),
          }),
        }
      }
      if (bookingsN === 2) {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => {
                  if (updateError) return { data: null, error: updateError }
                  return { data: updateRows, error: null }
                },
              }),
            }),
          }),
        }
      }
      if (bookingsN === 3) {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: againRow ?? null, error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected bookings from() call count ${bookingsN}`)
    }
    if (table === 'service_tier_events') {
      return {
        insert: async () => ({ error: eventError }),
      }
    }
    return {}
  })

  return { from }
}

describe('runMarkBondReceivedLandlord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path: bond_pending → confirmed, flag + telemetry insert', async () => {
    const admin = mockAdmin({})
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(false)
    expect(result.booking.status).toBe('confirmed')
    expect(admin.from).toHaveBeenCalledWith('service_tier_events')
    expect(sendListingBondReceivedEmails).toHaveBeenCalledWith(expect.anything(), bookingBase.id)
  })

  it('Phase 3 / Task J: bond received unlocks signing — triggers document generation with deferSigning=false', async () => {
    const admin = mockAdmin({})
    await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(triggerListingDocumentGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: bookingBase.id,
        deferSigning: false,
      }),
    )
  })

  it('Phase 3 / Task J: idempotent re-call does NOT trigger document generation again', async () => {
    const admin = mockAdmin({
      booking: {
        ...bookingBase,
        status: 'confirmed',
        bond_received_by_landlord_at: '2026-05-08T00:00:00.000Z',
      },
    })
    await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(triggerListingDocumentGeneration).not.toHaveBeenCalled()
  })

  it('wrong user (not landlord on booking)', async () => {
    const admin = mockAdmin({})
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: 'other-ll',
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('forbidden')
    expect(result.status).toBe(403)
  })

  it('wrong status (not bond_pending)', async () => {
    const admin = mockAdmin({
      booking: { ...bookingBase, status: 'pending_confirmation' },
    })
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('invalid_status')
  })

  it('idempotent when already active', async () => {
    const admin = mockAdmin({
      booking: {
        ...bookingBase,
        status: 'active',
        bond_received_by_landlord_at: '2026-05-08T00:00:00.000Z',
      },
    })
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(true)
    expect(result.booking.status).toBe('active')
    expect(sendListingBondReceivedEmails).not.toHaveBeenCalled()
  })

  it('idempotent re-call when already confirmed', async () => {
    const admin = mockAdmin({
      booking: {
        ...bookingBase,
        status: 'confirmed',
        bond_received_by_landlord_at: '2026-05-08T00:00:00.000Z',
      },
    })
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(true)
    expect(admin.from.mock.calls.filter((c) => c[0] === 'service_tier_events')).toHaveLength(0)
  })

  it('Managed / tier mismatch rejected', async () => {
    const admin = mockAdmin({
      booking: { ...bookingBase, service_tier_final: 'managed' },
    })
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('wrong_tier')
  })

  it('telemetry insert failure still returns success after booking update', async () => {
    const logger = { warn: vi.fn() }
    const admin = mockAdmin({ eventError: new Error('insert failed') })
    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
      logger,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.booking.status).toBe('confirmed')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('concurrent: empty update then row already confirmed → idempotent', async () => {
    const admin = mockAdmin({
      updateRows: [],
      againRow: {
        id: bookingBase.id,
        status: 'confirmed',
        bond_received_by_landlord_at: '2026-05-09T12:00:00.000Z',
        service_tier_final: 'listing',
        confirmed_at: bookingBase.confirmed_at,
      },
    })

    const result = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: llId,
      bookingId: bookingBase.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idempotent).toBe(true)
  })
})
