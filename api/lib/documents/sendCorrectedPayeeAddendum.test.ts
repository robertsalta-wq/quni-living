import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createDocusealSubmissionFromPdf: vi.fn(),
  sendCorrectedAddendumSignEmails: vi.fn(),
}))

vi.mock('../docuseal.shared.js', () => ({
  createDocusealSubmissionFromPdf: mocks.createDocusealSubmissionFromPdf,
}))

vi.mock('../booking/sendCorrectedAddendumEmails.js', () => ({
  sendCorrectedAddendumSignEmails: mocks.sendCorrectedAddendumSignEmails,
}))

import { sendCorrectedPayeeAddendum } from './sendCorrectedPayeeAddendum.js'

describe('sendCorrectedPayeeAddendum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DOCUSEAL_SIGN_LINK_SECRET = 'test-sign-link-secret'
    process.env.PUBLIC_SITE_URL = 'https://quni.com.au'
    mocks.createDocusealSubmissionFromPdf.mockResolvedValue({
      id: 174,
      submitters: [
        { id: 1, role: 'First Party', email: 'quinn@example.com', embed_src: 'https://docuseal.example/s/ll' },
        { id: 2, role: 'Second Party', email: 'rob@example.com', embed_src: 'https://docuseal.example/s/rr' },
        { id: 3, role: 'Co-tenant', email: 'sam@example.com', embed_src: 'https://docuseal.example/s/co' },
      ],
    })
    mocks.sendCorrectedAddendumSignEmails.mockResolvedValue({ sent: ['landlord', 'renter', 'co_tenant'], skipped: [] })
  })

  it('turns DocuSeal email off and sends one of our sign links per party', async () => {
    const inserted: Record<string, unknown>[] = []
    const admin = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row)
          return { error: null }
        },
      }),
    }

    const result = await sendCorrectedPayeeAddendum(admin as never, {
      bookingId: 'book-1',
      tenancyId: 'ten-1',
      unsignedPath: 'corrected-addenda/book-1/1.pdf',
      pdfBase64: 'cGRm',
      bookingReference: 'book-1',
      generatedBy: 'admin-1',
      propertyAddress: '1/244 Buffalo Road, Ryde, NSW',
      landlord: { id: 'll-1', name: 'Quinn Lee', email: 'quinn@example.com' },
      renter: { id: 'st-1', name: 'Robert', email: 'rob@example.com' },
      coTenant: { name: 'Sam Co', email: 'sam@example.com' },
    })

    expect(result.submissionId).toBe('174')
    expect(mocks.createDocusealSubmissionFromPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        sendEmail: false,
        order: 'random',
        coTenant: { name: 'Sam Co', email: 'sam@example.com' },
      }),
    )
    expect(inserted[0]).toMatchObject({
      document_type: 'other',
      file_path: 'corrected-addenda/book-1/1.pdf',
      docuseal_submission_id: '174',
      metadata: { document_kind: 'corrected_payee_addendum', booking_id: 'book-1' },
    })
    expect(mocks.sendCorrectedAddendumSignEmails).toHaveBeenCalledTimes(1)
    const mail = mocks.sendCorrectedAddendumSignEmails.mock.calls[0][1]
    expect(mail.landlord.signUrl).toContain('/api/sign/')
    expect(mail.renter.signUrl).toContain('/api/sign/')
    expect(mail.coTenant.signUrl).toContain('/api/sign/')
    expect(mail.landlord.signUrl).not.toBe(mail.renter.signUrl)
    expect(mail.renter.signUrl).not.toBe(mail.coTenant.signUrl)
  })
})
