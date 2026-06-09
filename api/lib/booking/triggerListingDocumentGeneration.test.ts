import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../documents/listingTenancyGeneration/index.js', () => ({
  runListingTenancyGeneration: vi.fn(),
}))

vi.mock('../documents/listingTenancyGeneration/resolveGenerator.js', () => ({
  resolveListingTenancyGenerator: vi.fn(),
}))

import { runListingTenancyGeneration } from '../documents/listingTenancyGeneration/index.js'
import { resolveListingTenancyGenerator } from '../documents/listingTenancyGeneration/resolveGenerator.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'

const admin = { from: vi.fn() } as never

beforeEach(() => {
  vi.clearAllMocks()
})

describe('triggerListingDocumentGeneration', () => {
  it('skips when booking not found', async () => {
    vi.mocked(resolveListingTenancyGenerator).mockResolvedValueOnce({
      ok: false,
      status: 404,
      error: 'Booking not found',
    })
    const r = await triggerListingDocumentGeneration({
      admin,
      bookingId: 'b1',
      deferSigning: true,
    })
    expect(r).toMatchObject({ ok: true, skipped: true, reason: 'booking_not_found' })
    expect(runListingTenancyGeneration).not.toHaveBeenCalled()
  })

  it('skips when tenancy unsupported', async () => {
    vi.mocked(resolveListingTenancyGenerator).mockResolvedValueOnce({
      ok: false,
      status: 400,
      error: 'Tenancy agreement not supported for this property',
    })
    const r = await triggerListingDocumentGeneration({
      admin,
      bookingId: 'b1',
      deferSigning: true,
    })
    expect(r).toMatchObject({ ok: true, skipped: true, reason: 'tenancy_unsupported' })
  })

  it('calls runListingTenancyGeneration with resolved generator', async () => {
    vi.mocked(resolveListingTenancyGenerator).mockResolvedValueOnce({
      ok: true,
      generator: 'nsw-ft6600',
      package: { supported: true, generator: 'nsw-ft6600' } as never,
    })
    vi.mocked(runListingTenancyGeneration).mockResolvedValueOnce({
      ok: true,
      tenancyId: 't1',
      documentId: 'd1',
      docusealSubmissionId: 'sub1',
    })

    const r = await triggerListingDocumentGeneration({
      admin,
      bookingId: 'b1',
      deferSigning: false,
    })

    expect(r.ok).toBe(true)
    expect(runListingTenancyGeneration).toHaveBeenCalledWith(admin, 'b1', {
      deferSigning: false,
      generator: 'nsw-ft6600',
    })
  })

  it('surfaces ok=false from generator without throwing', async () => {
    vi.mocked(resolveListingTenancyGenerator).mockResolvedValueOnce({
      ok: true,
      generator: 'qld-form18a',
      package: { supported: true, generator: 'qld-form18a' } as never,
    })
    vi.mocked(runListingTenancyGeneration).mockResolvedValueOnce({
      ok: false,
      status: 500,
      error: 'fetch failed',
      detail: 'network',
    })

    const r = await triggerListingDocumentGeneration({
      admin,
      bookingId: 'b1',
      deferSigning: false,
    })

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBe('fetch failed')
  })
})
