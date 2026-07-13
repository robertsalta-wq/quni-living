import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  fetchCoTenantSignerForTenancy: vi.fn(),
  fetchCoTenantSignerForBooking: vi.fn(),
  createClient: vi.fn(),
  emitSignatureOnTerminalBooking: vi.fn(),
}))

vi.mock('./sendEmail.js', () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock('./booking/coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: mocks.fetchCoTenantSignerForTenancy,
  fetchCoTenantSignerForBooking: mocks.fetchCoTenantSignerForBooking,
  coTenantEmailDistinctFromPrimary: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('./booking/events/emitDocusealDocumentEvents.js', () => ({
  emitSignatureOnTerminalBooking: (...args: unknown[]) =>
    mocks.emitSignatureOnTerminalBooking(...args),
  emitDocumentSentForSigning: vi.fn(),
  loadBookingIdsForTenancy: vi.fn(),
}))

import { handleSigningWebhook } from './docuseal.js'

const submissionId = 'sub_test_123'
const tenancyId = 'ten_1'
const bookingId = 'book_1'
const docId = 'doc_1'

const docRow = {
  id: docId,
  tenancy_id: tenancyId,
  docuseal_submission_id: submissionId,
  metadata: {},
  status: 'sent_for_signing',
  landlord_signed_at: null,
  student_signed_at: null,
  co_tenant_signed_at: null,
}

function buildAdmin(options: { bookingStatus: string; trackDocUpdate?: boolean }) {
  let docUpdated = false

  const admin = {
    from: (table: string) => {
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: docRow, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => {
              if (options.trackDocUpdate !== false) docUpdated = true
              return { error: null }
            },
          }),
        }
      }
      if (table === 'tenancies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { booking_id: bookingId }, error: null }),
            }),
          }),
        }
      }
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookingId,
                  status: options.bookingStatus,
                  property_id: 'prop_1',
                  landlord_id: 'll_1',
                  student_id: 'st_1',
                  service_tier_final: 'listing',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'booking_events') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'evt-sig' }, error: null }),
            }),
          }),
        }
      }
      return {}
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://storage.example/signed.pdf' } }),
      }),
    },
    _docUpdated: () => docUpdated,
  }

  return admin
}

describe('handleSigningWebhook terminal booking guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.DOCUSEAL_API_URL = 'https://docuseal.example'
    process.env.DOCUSEAL_API_TOKEN = 'token'
    mocks.fetchCoTenantSignerForTenancy.mockResolvedValue(null)
    mocks.fetchCoTenantSignerForBooking.mockResolvedValue(null)
    mocks.emitSignatureOnTerminalBooking.mockResolvedValue({ ok: true, id: 'evt-1' })
  })

  it('no-ops on cancelled booking: 200, anomaly event, no doc update, no emails', async () => {
    const admin = buildAdmin({ bookingStatus: 'cancelled' })
    mocks.createClient.mockReturnValue(admin)

    const payload = {
      id: submissionId,
      event_type: 'submission.completed',
      submitters: [
        { role: 'Landlord', completed_at: '2026-06-09T10:00:00Z' },
        { role: 'Tenant', completed_at: '2026-06-09T11:00:00Z' },
      ],
    }

    const result = await handleSigningWebhook(payload)

    expect(result).toEqual({ ok: true, message: 'Booking terminal; signature ignored' })
    expect(admin._docUpdated()).toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.emitSignatureOnTerminalBooking).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        bookingId,
        documentId: docId,
        submissionId,
        bookingStatus: 'cancelled',
      }),
    )
  })

  it('processes bond_pending booking: updates tenancy_documents, no anomaly event', async () => {
    const admin = buildAdmin({ bookingStatus: 'bond_pending' })
    mocks.createClient.mockReturnValue(admin)

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        if (u.includes('/api/submissions/') && u.includes('/documents')) {
          return {
            ok: true,
            json: async () => ({
              data: [{ name: 'Lease.pdf', url: 'https://docuseal.example/files/lease.pdf' }],
            }),
          }
        }
        if (u.includes('/api/submissions/')) {
          return { ok: true, json: async () => ({ id: submissionId }) }
        }
        if (u.includes('lease.pdf')) {
          return { ok: true, arrayBuffer: async () => pdfBytes.buffer }
        }
        return { ok: false, status: 404, text: async () => 'not found' }
      }),
    )

    const payload = {
      id: submissionId,
      submitters: [{ role: 'Landlord', completed_at: '2026-06-09T10:00:00Z' }],
    }

    const result = await handleSigningWebhook(payload)

    expect(result.ok).toBe(true)
    expect(admin._docUpdated()).toBe(true)
    expect(mocks.emitSignatureOnTerminalBooking).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
