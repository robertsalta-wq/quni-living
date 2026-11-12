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

import {
  CORRECTED_ADDENDUM_SENTENCE,
  CORRECTED_ADDENDUM_SIGNED_SUBJECT,
  sendCorrectedAddendumSignedEmails,
  sendCorrectedAddendumSignEmails,
} from './sendCorrectedAddendumEmails.js'

const admin = {} as never
const parties = {
  bookingId: 'book-1',
  submissionId: '174',
  propertyAddress: '1/244 Buffalo Road, Ryde, NSW',
  landlord: { email: 'quinn@example.com', name: 'Quinn Lee', signUrl: 'https://quni.com.au/api/sign/landlord' },
  renter: { email: 'rob@example.com', name: 'Robert', signUrl: 'https://quni.com.au/api/sign/renter' },
  coTenant: { email: 'sam@example.com', name: 'Sam Co', signUrl: 'https://quni.com.au/api/sign/co' },
  landlordId: 'll-1',
  studentId: 'st-1',
}

describe('corrected addendum emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listingEmailAttemptExists.mockResolvedValue(false)
    mocks.sendBookingEmail.mockResolvedValue({ resendId: 're_1', correlationId: 'corr_1' })
  })

  it('sends one signing email per party with the payee sentence and that person sign link', async () => {
    const result = await sendCorrectedAddendumSignEmails(admin, { ...parties, actorType: 'admin' })
    expect(result.sent).toEqual(['landlord', 'renter', 'co_tenant'])
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(3)
    const keys = mocks.sendBookingEmail.mock.calls.map((call) => call[1].templateKey)
    expect(keys).toEqual([
      'corrected_addendum_sign_landlord',
      'corrected_addendum_sign_renter',
      'corrected_addendum_sign_co_tenant',
    ])
    for (const call of mocks.sendBookingEmail.mock.calls) {
      const args = call[1]
      expect(args.subject).toBe('Sign the addendum for 1/244 Buffalo Road, Ryde, NSW')
      expect(args.html).toContain(CORRECTED_ADDENDUM_SENTENCE)
      expect(args.html).toContain('1/244 Buffalo Road, Ryde, NSW')
      expect(args.html).toContain('Sign the addendum')
      expect(args.html).toContain('/api/sign/')
      expect(args.metadata).toEqual({ docuseal_submission_id: '174' })
    }
    expect(mocks.sendBookingEmail.mock.calls[0][1].html).toContain('https://quni.com.au/api/sign/landlord')
    expect(mocks.sendBookingEmail.mock.calls[1][1].html).toContain('https://quni.com.au/api/sign/renter')
    expect(mocks.sendBookingEmail.mock.calls[2][1].html).toContain('https://quni.com.au/api/sign/co')
  })

  it('sends one signed-addendum email per party and does not send it again for the same submission', async () => {
    const first = await sendCorrectedAddendumSignedEmails(admin, {
      ...parties,
      downloadUrl: 'https://files.example/addendum.pdf',
      actorType: 'webhook',
    })
    expect(first.sent).toEqual(['landlord', 'renter', 'co_tenant'])
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(3)
    for (const call of mocks.sendBookingEmail.mock.calls) {
      expect(call[1].subject).toBe(CORRECTED_ADDENDUM_SIGNED_SUBJECT)
      expect(call[1].html).toContain('https://files.example/addendum.pdf')
      expect(call[1].html).toContain('Download the addendum')
      expect(call[1].metadata).toEqual({ docuseal_submission_id: '174' })
    }

    mocks.listingEmailAttemptExists.mockResolvedValue(true)
    const second = await sendCorrectedAddendumSignedEmails(admin, {
      ...parties,
      downloadUrl: 'https://files.example/addendum.pdf',
    })
    expect(second.sent).toEqual([])
    expect(second.skipped).toEqual(['landlord', 'renter', 'co_tenant'])
    expect(mocks.sendBookingEmail).toHaveBeenCalledTimes(3)
  })
})
