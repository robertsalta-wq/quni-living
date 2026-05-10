import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'

const baseBooking = {
  id: '00000000-0000-4000-8000-000000000001',
  property_id: 'pr1',
  move_in_date: '2026-06-01',
  properties: {
    state: 'NSW',
    property_type: 'entire_property',
    is_registered_rooming_house: false,
  },
}

function mockAdmin(booking: typeof baseBooking | null) {
  return {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: booking,
            error: booking ? null : new Error('not found'),
          }),
        }),
      }),
    })),
  }
}

const ORIGINAL_ENV = { ...process.env }
const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  process.env.INTERNAL_DOC_FLOW_SECRET = 'test-secret'
  process.env.PUBLIC_SITE_URL = 'https://example.test'
})

afterEach(() => {
  vi.unstubAllGlobals()
  process.env = { ...ORIGINAL_ENV }
})

describe('triggerListingDocumentGeneration', () => {
  it('skips when INTERNAL_DOC_FLOW_SECRET is not set', async () => {
    delete process.env.INTERNAL_DOC_FLOW_SECRET
    const admin = mockAdmin(baseBooking)
    const logger = { warn: vi.fn(), error: vi.fn() }
    const r = await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: true,
      logger,
    })
    expect(r).toMatchObject({ ok: true, skipped: true, reason: 'no_internal_secret' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips when booking has no property', async () => {
    const admin = mockAdmin({ ...baseBooking, property_id: null } as never)
    const logger = { warn: vi.fn(), error: vi.fn() }
    const r = await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: true,
      logger,
    })
    expect(r).toMatchObject({ ok: true, skipped: true, reason: 'no_property' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('NSW T2 entire_property → posts to /api/documents/generate-residential-tenancy with defer_signing', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const admin = mockAdmin(baseBooking)
    const r = await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: true,
    })
    expect(r).toMatchObject({ ok: true, deferSigning: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/documents/generate-residential-tenancy')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body).toEqual({ booking_id: baseBooking.id, defer_signing: true })
    expect(init.headers.Authorization).toBe('Bearer test-secret')
  })

  it('Listing post-bond-received call uses defer_signing=false', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const admin = mockAdmin(baseBooking)
    await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: false,
    })
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body).defer_signing).toBe(false)
  })

  it('QLD T2 entire_property → routes to QLD generator', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const admin = mockAdmin({
      ...baseBooking,
      properties: { state: 'QLD', property_type: 'entire_property', is_registered_rooming_house: false },
    } as never)
    await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: true,
    })
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/documents/generate-qld-residential-tenancy')
  })

  it('Unsupported tenancy package (e.g. WA) → skip without throwing', async () => {
    const admin = mockAdmin({
      ...baseBooking,
      properties: { state: 'WA', property_type: 'entire_property', is_registered_rooming_house: false },
    } as never)
    const logger = { warn: vi.fn(), error: vi.fn() }
    const r = await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: true,
      logger,
    })
    expect(r).toMatchObject({ ok: true, skipped: true, reason: 'tenancy_unsupported' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('non-2xx generator response surfaces as ok=false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => '{"error":"boom"}',
    })
    const admin = mockAdmin(baseBooking)
    const logger = { warn: vi.fn(), error: vi.fn() }
    const r = await triggerListingDocumentGeneration({
      admin: admin as never,
      bookingId: baseBooking.id,
      deferSigning: true,
      logger,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.status).toBe(500)
    expect(logger.error).toHaveBeenCalled()
  })
})
