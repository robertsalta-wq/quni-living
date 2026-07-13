import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  archiveDocusealSubmission: vi.fn(),
  emitDocumentRegenerated: vi.fn(),
}))

vi.mock('../docusealArchive.js', () => ({
  archiveDocusealSubmission: mocks.archiveDocusealSubmission,
}))

vi.mock('./events/emitDocusealDocumentEvents.js', () => ({
  emitDocumentRegenerated: (...args: unknown[]) => mocks.emitDocumentRegenerated(...args),
}))

import { resetTenancyDocumentForNewSigningRound } from './resetTenancyDocumentForNewSigningRound.js'

const bookingId = 'book-1'
const tenancyId = 'ten-1'
const docId = 'doc-1'
const submissionId = '7777'

describe('resetTenancyDocumentForNewSigningRound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.archiveDocusealSubmission.mockResolvedValue({ ok: true, outcome: 'archived' })
    mocks.emitDocumentRegenerated.mockResolvedValue({ ok: true, id: 'evt-regen' })
  })

  it('archives old submission before clearing docuseal_submission_id', async () => {
    let docUpdate: Record<string, unknown> | null = null

    const admin = {
      from: (table: string) => {
        if (table === 'bookings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    property_id: 'p1',
                    landlord_id: 'll1',
                    student_id: 'st1',
                    service_tier_final: 'listing',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'tenancies') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: tenancyId }, error: null }),
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
                      metadata: {
                        docuseal_response: {
                          submitters: [{ role: 'Tenant', embed_src: 'https://x' }],
                        },
                      },
                      document_type: 'residential_tenancy',
                      docuseal_submission_id: submissionId,
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
        return {}
      },
    }

    const result = await resetTenancyDocumentForNewSigningRound(admin, bookingId)

    expect(result).toMatchObject({ ok: true, reset: true, documentId: docId })
    expect(mocks.archiveDocusealSubmission).toHaveBeenCalledWith(submissionId)
    expect(docUpdate).toMatchObject({
      status: 'draft',
      docuseal_submission_id: null,
    })
    expect(docUpdate?.metadata).not.toHaveProperty('docuseal_response')
    expect(mocks.emitDocumentRegenerated).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        bookingId,
        documentId: docId,
        previousSubmissionId: submissionId,
      }),
    )
  })
})
