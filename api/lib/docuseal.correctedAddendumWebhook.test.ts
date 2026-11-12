import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'

async function onePagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage()
  return doc.save()
}

const mocks = vi.hoisted(() => ({
  sendBookingEmail: vi.fn(),
  listingEmailAttemptExists: vi.fn(),
  chargeListingLeaseOnSigned: vi.fn(),
  maybeAdvanceListingBookingToActive: vi.fn(),
  createClient: vi.fn(),
  fetchCoTenantSignerForTenancy: vi.fn(),
  fetchCoTenantSignerForBooking: vi.fn(),
}))

vi.mock('./sendEmail.js', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('./booking/sendBookingEmail.js', () => ({
  sendBookingEmail: mocks.sendBookingEmail,
}))

vi.mock('./booking/listingEmailAttempt.js', () => ({
  listingEmailAttemptExists: mocks.listingEmailAttemptExists,
}))

vi.mock('./billing/listingLeaseCharge.js', () => ({
  chargeListingLeaseOnSigned: mocks.chargeListingLeaseOnSigned,
}))

vi.mock('./booking/maybeAdvanceListingBookingToActive.js', () => ({
  maybeAdvanceListingBookingToActive: mocks.maybeAdvanceListingBookingToActive,
}))

vi.mock('./booking/coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: mocks.fetchCoTenantSignerForTenancy,
  fetchCoTenantSignerForBooking: mocks.fetchCoTenantSignerForBooking,
  coTenantEmailDistinctFromPrimary: vi.fn(() => true),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { handleSigningWebhook } from './docuseal.js'

const submissionId = '174'
const tenancyId = 'ten-add-1'
const bookingId = 'book-add-1'

function buildAdmin(docRow: Record<string, unknown>) {
  const uploads: string[] = []
  const admin = {
    from(table: string) {
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: docRow, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      if (table === 'tenancies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  booking_id: bookingId,
                  landlord_profile_id: 'll-1',
                  student_profile_id: 'st-1',
                },
                error: null,
              }),
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
                  status: 'active',
                  property_id: 'prop-1',
                  landlord_id: 'll-1',
                  student_id: 'st-1',
                  service_tier_final: 'listing',
                  properties: { address: '1/244 Buffalo Road', suburb: 'Ryde', state: 'NSW' },
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'landlord_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: 'quinn@example.com', full_name: 'Quinn Lee', first_name: 'Quinn', last_name: 'Lee' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'student_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: 'rob@example.com', full_name: 'Robert', first_name: 'Robert', last_name: 'Salt' },
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
              single: async () => ({ data: { id: 'evt-1' }, error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          uploads.push(path)
          return { error: null }
        },
        createSignedUrl: async () => ({ data: { signedUrl: 'https://files.example/addendum.pdf' } }),
      }),
    },
    uploads,
  }
  return admin
}

describe('corrected addendum completion webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.DOCUSEAL_API_URL = 'https://docuseal.example'
    process.env.DOCUSEAL_API_TOKEN = 'token'
    mocks.listingEmailAttemptExists.mockResolvedValue(false)
    mocks.sendBookingEmail.mockResolvedValue({ resendId: 're_1', correlationId: 'c1' })
    mocks.fetchCoTenantSignerForTenancy.mockResolvedValue(null)
    mocks.fetchCoTenantSignerForBooking.mockResolvedValue({ email: 'sam@example.com', name: 'Sam Co' })
    mocks.chargeListingLeaseOnSigned.mockResolvedValue(undefined)
    mocks.maybeAdvanceListingBookingToActive.mockResolvedValue({ advanced: false, reason: 'already_active' })
  })

  it('stores the addendum aside, skips the lease charge, and emails each party once', async () => {
    const pdfBytes = await onePagePdf()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        if (u.includes('/documents')) {
          return {
            ok: true,
            json: async () => ({
              data: [{ name: 'Corrected addendum.pdf', url: 'https://files.example/raw.pdf' }],
            }),
          }
        }
        if (u.includes('/api/submissions/')) {
          return { ok: true, json: async () => ({ id: submissionId, status: 'completed' }) }
        }
        if (u.includes('raw.pdf')) {
          return { ok: true, arrayBuffer: async () => pdfBytes.buffer }
        }
        return { ok: false, status: 404, text: async () => 'missing' }
      }),
    )

    const admin = buildAdmin({
      id: 'doc-add-1',
      tenancy_id: tenancyId,
      document_type: 'other',
      docuseal_submission_id: submissionId,
      metadata: { document_kind: 'corrected_payee_addendum', booking_id: bookingId },
      status: 'sent_for_signing',
      landlord_signed_at: null,
      student_signed_at: null,
      co_tenant_signed_at: null,
      file_path: `corrected-addenda/${bookingId}/draft.pdf`,
    })
    mocks.createClient.mockReturnValue(admin)

    const result = await handleSigningWebhook({
      id: submissionId,
      event_type: 'submission.completed',
      data: {
        id: submissionId,
        completed_at: '2026-11-12T03:00:00.000Z',
        status: 'completed',
        submitters: [
          { role: 'First Party', completed_at: '2026-11-12T01:00:00.000Z' },
          { role: 'Second Party', completed_at: '2026-11-12T02:00:00.000Z' },
        ],
      },
    })

    expect(result).toEqual({ ok: true, message: 'Corrected addendum fully signed' })
    expect(admin.uploads).toEqual([`${tenancyId}/corrected_payee_addendum/${submissionId}_signed.pdf`])
    expect(mocks.chargeListingLeaseOnSigned).not.toHaveBeenCalled()
    expect(mocks.maybeAdvanceListingBookingToActive).not.toHaveBeenCalled()
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(3)
    const keys = mocks.sendBookingEmail.mock.calls.map((call) => call[1].templateKey)
    expect(keys).toEqual([
      'corrected_addendum_signed_landlord',
      'corrected_addendum_signed_renter',
      'corrected_addendum_signed_co_tenant',
    ])
    expect(keys.some((key: string) => key.startsWith('agreement_fully_signed'))).toBe(false)
    for (const call of mocks.sendBookingEmail.mock.calls) {
      expect(call[1].subject).toBe('Your signed addendum')
      expect(call[1].html).toContain('https://files.example/addendum.pdf')
      expect(call[1].metadata).toEqual({ docuseal_submission_id: submissionId })
    }

    vi.unstubAllGlobals()
  })

  it('still charges and emails the primary lease, and does not send the addendum email', async () => {
    const pdfBytes = await onePagePdf()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        if (u.includes('/documents')) {
          return {
            ok: true,
            json: async () => ({ data: [{ name: 'Lease.pdf', url: 'https://files.example/lease.pdf' }] }),
          }
        }
        if (u.includes('/api/submissions/')) {
          return { ok: true, json: async () => ({ id: 'lease-sub', status: 'completed' }) }
        }
        if (u.includes('lease.pdf')) {
          return { ok: true, arrayBuffer: async () => pdfBytes.buffer }
        }
        return { ok: false, status: 404, text: async () => 'missing' }
      }),
    )

    const admin = buildAdmin({
      id: 'doc-lease-1',
      tenancy_id: tenancyId,
      document_type: 'lease',
      docuseal_submission_id: 'lease-sub',
      metadata: {},
      status: 'sent_for_signing',
      landlord_signed_at: null,
      student_signed_at: null,
      co_tenant_signed_at: null,
      file_path: `${tenancyId}/lease/lease_draft.pdf`,
    })
    mocks.createClient.mockReturnValue(admin)
    mocks.fetchCoTenantSignerForBooking.mockResolvedValue(null)

    const result = await handleSigningWebhook({
      id: 'lease-sub',
      event_type: 'submission.completed',
      data: {
        id: 'lease-sub',
        completed_at: '2026-11-12T03:00:00.000Z',
        status: 'completed',
        submitters: [
          { role: 'Landlord', completed_at: '2026-11-12T01:00:00.000Z' },
          { role: 'Tenant', completed_at: '2026-11-12T02:00:00.000Z' },
        ],
      },
    })

    expect(result.ok).toBe(true)
    expect(admin.uploads).toEqual([`${tenancyId}/lease/lease_signed.pdf`])
    expect(mocks.chargeListingLeaseOnSigned).toHaveBeenCalledTimes(1)
    const keys = mocks.sendBookingEmail.mock.calls.map((call) => call[1].templateKey)
    expect(keys).toEqual(['agreement_fully_signed_landlord', 'agreement_fully_signed_renter'])
    vi.unstubAllGlobals()
  })
})
