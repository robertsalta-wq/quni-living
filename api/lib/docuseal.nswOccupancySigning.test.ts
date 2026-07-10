import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  fetchCoTenantSignerForTenancy: vi.fn(),
  fetchCoTenantSignerForBooking: vi.fn(),
  createDocusealSubmissionFromPdf: vi.fn(),
  wrapSubmissionSubmitters: vi.fn((submission: unknown) => submission),
  createClient: vi.fn(),
}))

vi.mock('./sendEmail.js', () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock('./booking/coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: mocks.fetchCoTenantSignerForTenancy,
  fetchCoTenantSignerForBooking: mocks.fetchCoTenantSignerForBooking,
  coTenantEmailDistinctFromPrimary: vi.fn(),
}))

vi.mock('./docuseal.shared.js', () => ({
  createDocusealSubmissionFromPdf: mocks.createDocusealSubmissionFromPdf,
  getDocusealSubmissionsUrl: vi.fn(() => 'https://docuseal.example/api/submissions/pdf'),
}))

vi.mock('./docuseal/signLinkWrap.js', () => ({
  signingPackageNeedsDateRefresh: vi.fn(() => false),
  wrapSubmissionSubmitters: mocks.wrapSubmissionSubmitters,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { handleSigningWebhook, sendForSigning } from './docuseal.js'

const documentId = 'doc_occ_1'
const tenancyId = 'ten_occ_1'
const bookingId = 'book_occ_1'
const submissionId = 'sub_occ_1'

function buildSendForSigningAdmin() {
  const pdfBlob = new Blob([Buffer.from('%PDF-1.4')], { type: 'application/pdf' })
  return {
    from: (table: string) => {
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: documentId,
                  tenancy_id: tenancyId,
                  status: 'draft',
                  file_path: `${tenancyId}/lease/lease_draft.pdf`,
                },
                error: null,
              }),
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
                  landlord_profile_id: 'll_1',
                  student_profile_id: 'st_1',
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
                data: {
                  full_name: 'Pat Host',
                  first_name: 'Pat',
                  last_name: 'Host',
                  email: 'pat@example.com',
                },
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
                data: {
                  full_name: 'Alex Renter',
                  first_name: 'Alex',
                  last_name: 'Renter',
                  email: 'alex@example.com',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    },
    storage: {
      from: () => ({
        download: async () => ({ data: pdfBlob, error: null }),
      }),
    },
  }
}

const leaseDocRow = {
  id: documentId,
  tenancy_id: tenancyId,
  docuseal_submission_id: submissionId,
  metadata: {},
  status: 'sent_for_signing',
  landlord_signed_at: null,
  student_signed_at: null,
  co_tenant_signed_at: null,
}

function buildWebhookAdmin(options?: { trackDocUpdate?: boolean }) {
  let docUpdatePayload: Record<string, unknown> | null = null

  const admin = {
    from: (table: string) => {
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: leaseDocRow, error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              if (options?.trackDocUpdate !== false) docUpdatePayload = payload
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
                  status: 'bond_pending',
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
      if (table === 'landlord_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: 'pat@example.com', full_name: 'Pat Host', first_name: 'Pat', last_name: 'Host' },
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
                data: {
                  email: 'alex@example.com',
                  full_name: 'Alex Renter',
                  first_name: 'Alex',
                  last_name: 'Renter',
                },
                error: null,
              }),
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
    _docUpdatePayload: () => docUpdatePayload,
  }

  return admin
}

describe('nsw-occupancy signing (licence: landlord + resident only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.DOCUSEAL_API_URL = 'https://docuseal.example'
    process.env.DOCUSEAL_API_TOKEN = 'token'
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'test-sign-link-secret'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
  })

  it('sendForSigning with skipCoTenantSigner creates exactly 2 submitters and skips co-tenant email', async () => {
    mocks.createClient.mockReturnValue(buildSendForSigningAdmin())
    mocks.fetchCoTenantSignerForTenancy.mockResolvedValue({
      name: 'Sam Co',
      email: 'sam@example.com',
    })
    mocks.createDocusealSubmissionFromPdf.mockResolvedValue({
      id: 42,
      submitters: [
        { id: 1, role: 'Landlord', email: 'pat@example.com', embed_src: 'https://quni.com.au/api/sign/a' },
        { id: 2, role: 'Tenant', email: 'alex@example.com', embed_src: 'https://quni.com.au/api/sign/b' },
      ],
    })

    await sendForSigning(documentId, {
      documentPdfName: 'Quni Licence to Occupy.pdf',
      removeTags: true,
      skipCoTenantSigner: true,
    })

    expect(mocks.fetchCoTenantSignerForTenancy).not.toHaveBeenCalled()
    expect(mocks.createDocusealSubmissionFromPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        coTenant: null,
        landlord: { name: 'Pat Host', email: 'pat@example.com' },
        tenant: { name: 'Alex Renter', email: 'alex@example.com' },
      }),
    )
    const submissionArg = mocks.createDocusealSubmissionFromPdf.mock.calls[0][0]
    expect(submissionArg.coTenant).toBeNull()

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    const emailTos = mocks.sendEmail.mock.calls.map((c) => c[0].to)
    expect(emailTos).toContain('pat@example.com')
    expect(emailTos).toContain('alex@example.com')
    expect(emailTos).not.toContain('sam@example.com')
  })

  it('handleSigningWebhook marks lease fully_signed after landlord + resident when booking has co-occupant', async () => {
    const admin = buildWebhookAdmin()
    mocks.createClient.mockReturnValue(admin)
    mocks.fetchCoTenantSignerForTenancy.mockResolvedValue({
      name: 'Sam Co',
      email: 'sam@example.com',
    })
    mocks.fetchCoTenantSignerForBooking.mockResolvedValue({
      name: 'Sam Co',
      email: 'sam@example.com',
    })

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
      submitters: [
        { role: 'Landlord', completed_at: '2026-07-10T10:00:00Z' },
        { role: 'Tenant', completed_at: '2026-07-10T11:00:00Z' },
      ],
    }

    const result = await handleSigningWebhook(payload)

    expect(result.ok).toBe(true)
    expect(admin._docUpdatePayload()).toMatchObject({
      status: 'signed',
      landlord_signed_at: '2026-07-10T10:00:00Z',
      student_signed_at: '2026-07-10T11:00:00Z',
      co_tenant_signed_at: null,
    })

    vi.unstubAllGlobals()
  })
})
