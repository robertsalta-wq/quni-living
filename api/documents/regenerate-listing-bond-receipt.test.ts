import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/adminAuth.js', () => ({
  requireAdminUser: vi.fn(),
}))

vi.mock('./listingBondReceipt.js', () => ({
  generateAndPersistListingBondReceipt: vi.fn(),
}))

vi.mock('../lib/booking/listingTransactionalEmails.js', () => ({
  sendListingBondReceivedEmails: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: '771acf77-0000-4000-8000-000000000001',
                  status: 'active',
                  service_tier_final: 'listing',
                  bond_received_by_landlord_at: '2026-05-01T00:00:00.000Z',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    }),
  })),
}))

import { requireAdminUser } from '../lib/adminAuth.js'
import { generateAndPersistListingBondReceipt } from './listingBondReceipt.js'
import { sendListingBondReceivedEmails } from '../lib/booking/listingTransactionalEmails.js'
import handler from './regenerate-listing-bond-receipt.js'

describe('POST /api/documents/regenerate-listing-bond-receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    process.env.SUPABASE_ANON_KEY = 'anon'
    vi.mocked(requireAdminUser).mockResolvedValue({
      user: { id: 'admin-user-1' } as never,
    })
  })

  it('creates missing receipt for active Listing booking and optionally re-emails', async () => {
    vi.mocked(generateAndPersistListingBondReceipt).mockResolvedValue({
      status: 'created',
      documentId: 'doc-1',
      filePath: 'ten1/bond/bond_receipt.pdf',
      pdfBase64: 'cGRm',
      receiptNumber: 'QR-2026-TEN1',
    })

    const req = new Request('https://quni.com.au/api/documents/regenerate-listing-bond-receipt', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: '771acf77-0000-4000-8000-000000000001',
        force: true,
        reEmail: true,
      }),
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(true)
    expect(body.status).toBe('created')
    expect(body.emailed).toBe(true)
    expect(generateAndPersistListingBondReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: '771acf77-0000-4000-8000-000000000001',
        force: true,
        generatedByUserId: 'admin-user-1',
      }),
    )
    expect(sendListingBondReceivedEmails).toHaveBeenCalledWith(
      expect.anything(),
      '771acf77-0000-4000-8000-000000000001',
      { pdfAttachment: { filename: 'bond_receipt.pdf', content: 'cGRm' } },
    )
  })

  it('returns skipped_exists when force is false and row exists', async () => {
    vi.mocked(generateAndPersistListingBondReceipt).mockResolvedValue({
      status: 'skipped_exists',
      documentId: 'doc-existing',
    })

    const req = new Request('https://quni.com.au/api/documents/regenerate-listing-bond-receipt', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: '771acf77-0000-4000-8000-000000000001',
        force: false,
      }),
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.status).toBe('skipped_exists')
    expect(sendListingBondReceivedEmails).not.toHaveBeenCalled()
  })
})
