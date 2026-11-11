import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listingEmailAttemptExists: vi.fn(),
  sendBookingEmail: vi.fn(),
}))

vi.mock('./listingEmailAttempt.js', () => ({
  listingEmailAttemptExists: mocks.listingEmailAttemptExists,
}))

vi.mock('./sendBookingEmail.js', () => ({
  sendBookingEmail: mocks.sendBookingEmail,
}))

import { sendFullySignedAgreementEmails } from './sendFullySignedAgreementEmail.js'

const admin = {} as never

describe('sendFullySignedAgreementEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listingEmailAttemptExists.mockResolvedValue(false)
    mocks.sendBookingEmail.mockResolvedValue({ resendId: 're_1', correlationId: 'corr_1' })
  })

  it('sends once per party and records the submission id', async () => {
    const result = await sendFullySignedAgreementEmails(admin, {
      bookingId: 'book-1',
      submissionId: '174',
      downloadUrl: 'https://storage.example/signed.pdf',
      subject: 'Your NSW tenancy agreement is signed - Quni Living',
      downloadLabel: 'Download signed agreement package (7-day link)',
      landlord: { email: 'quinn@example.com', name: 'Quinn Lee' },
      renter: { email: 'rob@example.com', name: 'Robert' },
      coTenant: { email: 'sam@example.com', name: 'Sam Co' },
      landlordId: 'll-1',
      studentId: 'st-1',
      actorType: 'webhook',
    })

    expect(result).toEqual({ sent: ['landlord', 'renter', 'co_tenant'], skipped: [] })
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(3)
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        bookingId: 'book-1',
        templateKey: 'agreement_fully_signed_landlord',
        to: 'quinn@example.com',
        metadata: { docuseal_submission_id: '174' },
      }),
    )
    expect(mocks.listingEmailAttemptExists).toHaveBeenCalledWith(
      admin,
      'book-1',
      'agreement_fully_signed_renter',
      { metadata: { docuseal_submission_id: '174' }, failClosed: true },
    )
  })

  it('skips a party that already has an attempt for this submission', async () => {
    mocks.listingEmailAttemptExists.mockImplementation(async (_admin, _bookingId, templateKey: string) => {
      return templateKey === 'agreement_fully_signed_landlord'
    })

    const result = await sendFullySignedAgreementEmails(admin, {
      bookingId: 'book-1',
      submissionId: '174',
      downloadUrl: 'https://storage.example/signed.pdf',
      subject: 'Your NSW tenancy agreement is signed - Quni Living',
      downloadLabel: 'Download signed agreement package (7-day link)',
      landlord: { email: 'quinn@example.com', name: 'Quinn Lee' },
      renter: { email: 'rob@example.com', name: 'Robert' },
    })

    expect(result).toEqual({ sent: ['renter'], skipped: ['landlord'] })
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(1)
    expect(mocks.sendBookingEmail).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ templateKey: 'agreement_fully_signed_renter' }),
    )
  })

  it('does not send when the attempt lookup fails', async () => {
    mocks.listingEmailAttemptExists.mockRejectedValue(new Error('email.attempt lookup failed'))

    await expect(
      sendFullySignedAgreementEmails(admin, {
        bookingId: 'book-1',
        submissionId: '174',
        downloadUrl: 'https://storage.example/signed.pdf',
        subject: 'Your lease is signed - Quni Living',
        downloadLabel: 'Download signed lease (7-day link)',
        landlord: { email: 'quinn@example.com', name: 'Quinn' },
        renter: { email: 'rob@example.com', name: 'Robert' },
      }),
    ).rejects.toThrow(/lookup failed/)
    expect(mocks.sendBookingEmail).not.toHaveBeenCalled()
  })
})
