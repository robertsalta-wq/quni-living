import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  archiveDocusealSubmission: vi.fn(),
  setListingAgreementStatus: vi.fn(),
}))

vi.mock('../docusealArchive.js', () => ({
  archiveDocusealSubmission: mocks.archiveDocusealSubmission,
}))

vi.mock('./listingAgreementStatus.js', () => ({
  setListingAgreementStatus: mocks.setListingAgreementStatus,
}))

import { runUnwindListingAgreementCleanup } from './unwindListingAgreement.js'

const bookingId = 'book-1'
const tenancyId = 'ten-1'
const docId = 'doc-1'
const submissionId = '4242'

const ctx = {
  bookingId,
  propertyId: 'prop-1',
  landlordId: 'll-1',
  studentId: 'st-1',
  serviceTier: 'listing' as const,
  unwindReason: 'cancelled' as const,
}

const docMeta = {
  signing_package: 'residential_tenancy',
  docuseal_response: {
    id: 4242,
    submitters: [{ role: 'Tenant', embed_src: 'https://sign.example/t' }],
  },
}

function buildAdmin(options: {
  submissionId?: string | null
  archiveResult?: { ok: boolean; outcome?: string; status?: number; message?: string }
}) {
  let docUpdate: Record<string, unknown> | null = null
  let tenancyUpdate: Record<string, unknown> | null = null
  let eventInsert: Record<string, unknown> | null = null

  mocks.archiveDocusealSubmission.mockResolvedValue(
    options.archiveResult ?? { ok: true, outcome: 'archived' },
  )

  const admin = {
    from: (table: string) => {
      if (table === 'tenancies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: tenancyId, status: 'active' },
                error: null,
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: async () => {
                tenancyUpdate = patch
                return { error: null }
              },
            }),
          }),
        }
      }
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: [
                  {
                    id: docId,
                    status: 'sent_for_signing',
                    metadata: docMeta,
                    document_type: 'residential_tenancy',
                    docuseal_submission_id:
                      options.submissionId !== undefined ? options.submissionId : submissionId,
                  },
                ],
                error: null,
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              docUpdate = patch
              return { error: null }
            },
          }),
        }
      }
      if (table === 'service_tier_events') {
        return {
          insert: async (row: Record<string, unknown>) => {
            eventInsert = row
            return { error: null }
          },
        }
      }
      return {}
    },
    _docUpdate: () => docUpdate,
    _tenancyUpdate: () => tenancyUpdate,
    _eventInsert: () => eventInsert,
  }

  return admin
}

describe('runUnwindListingAgreementCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setListingAgreementStatus.mockResolvedValue(undefined)
  })

  it('archives remotely, sets doc archived, strips embed_src, voids agreement, ends tenancy', async () => {
    const admin = buildAdmin({})
    await runUnwindListingAgreementCleanup(admin as never, ctx)

    expect(mocks.archiveDocusealSubmission).toHaveBeenCalledWith(submissionId)
    expect(admin._docUpdate()).toMatchObject({ status: 'archived' })
    const meta = admin._docUpdate()?.metadata as {
      docuseal_response: { submitters: Array<Record<string, unknown>> }
    }
    expect(meta.docuseal_response.submitters[0].embed_src).toBeUndefined()
    expect(mocks.setListingAgreementStatus).toHaveBeenCalledWith(admin, bookingId, 'voided', null)
    expect(admin._tenancyUpdate()).toEqual({ status: 'ended' })
    expect(admin._eventInsert()).toBeNull()
  })

  it('skips remote archive when no submission id but still does local cleanup', async () => {
    const admin = buildAdmin({ submissionId: null })
    await runUnwindListingAgreementCleanup(admin as never, ctx)

    expect(mocks.archiveDocusealSubmission).not.toHaveBeenCalled()
    expect(admin._docUpdate()).toMatchObject({ status: 'archived' })
    expect(mocks.setListingAgreementStatus).toHaveBeenCalledWith(admin, bookingId, 'voided', null)
  })

  it('does not block unwind when archive fails; emits anomaly event', async () => {
    const admin = buildAdmin({
      archiveResult: { ok: false, outcome: 'failed', status: 500, message: 'server error' },
    })
    await runUnwindListingAgreementCleanup(admin as never, ctx)

    expect(admin._docUpdate()).toMatchObject({ status: 'archived' })
    expect(mocks.setListingAgreementStatus).toHaveBeenCalled()
    expect(admin._eventInsert()).toMatchObject({
      event_type: 'docuseal_archive_failed',
      booking_id: bookingId,
      metadata: expect.objectContaining({
        docuseal_submission_id: submissionId,
        unwind_reason: 'cancelled',
      }),
    })
  })
})
