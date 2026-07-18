import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.hoisted(() => vi.fn())

vi.mock('../../sendEmail.js', () => ({
  sendEmail,
}))

vi.mock('../listingTransactionalEmails.js', () => ({
  siteBaseUrl: () => 'https://quni.test',
}))

import {
  graceDaysRemaining,
  sendReinstatementConfirmedEmails,
  unwrapRelation,
} from './emails.js'

function mockAdminWithProfiles(opts: {
  studentEmail?: string | null
  landlordEmail?: string | null
  /** Simulate PostgREST returning nested rows as one-element arrays. */
  asArrays?: boolean
}) {
  const student = {
    email: opts.studentEmail ?? 'renter@example.com',
    full_name: 'Geonho Kim',
    first_name: 'Geonho',
    last_name: 'Kim',
  }
  const landlord = {
    email: opts.landlordEmail ?? 'host@example.com',
    full_name: 'Host Name',
  }
  const property = {
    title: 'Sunny room',
    address: '1 Test St',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
  }
  const wrap = <T,>(row: T) => (opts.asArrays ? [row] : row)

  return {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'b1',
              properties: wrap(property),
              student_profiles: wrap(student),
              landlord_profiles: wrap(landlord),
            },
            error: null,
          }),
        }),
      }),
    })),
  } as any
}

describe('reinstatement email helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendEmail.mockResolvedValue({ ok: true })
  })

  it('unwrapRelation flattens one-element PostgREST arrays', () => {
    expect(unwrapRelation([{ email: 'a@b.com' }])).toEqual({ email: 'a@b.com' })
    expect(unwrapRelation({ email: 'a@b.com' })).toEqual({ email: 'a@b.com' })
    expect(unwrapRelation(null)).toEqual({})
  })

  it('graceDaysRemaining ceilings remaining calendar days', () => {
    const now = Date.parse('2026-07-18T00:00:00.000Z')
    expect(graceDaysRemaining('2026-07-20T12:00:00.000Z', now)).toBe(3)
    expect(graceDaysRemaining('2026-07-17T00:00:00.000Z', now)).toBe(0)
  })

  it('confirmed send emails both parties with bond_pending copy', async () => {
    const admin = mockAdminWithProfiles({})
    await sendReinstatementConfirmedEmails(admin, 'b1', {
      signingResent: false,
      signingResendFailed: false,
      listingFeeRefunded: false,
      bookingStatusAfter: 'bond_pending',
    })

    expect(sendEmail).toHaveBeenCalledTimes(2)
    const tos = sendEmail.mock.calls.map((c) => c[0].to).sort()
    expect(tos).toEqual(['host@example.com', 'renter@example.com'])
    for (const call of sendEmail.mock.calls) {
      expect(call[0].subject).toMatch(/Booking reinstated/i)
      expect(call[0].html).toMatch(/bond pending/i)
      expect(call[0].html).toMatch(/not reserved/i)
      expect(call[0].html).not.toMatch(/Signing has been re-sent/)
    }
  })

  it('confirmed includes signing re-sent only when signingResent is true', async () => {
    const admin = mockAdminWithProfiles({})
    await sendReinstatementConfirmedEmails(admin, 'b1', {
      signingResent: true,
      signingResendFailed: false,
      listingFeeRefunded: false,
      bookingStatusAfter: 'bond_pending',
    })
    expect(sendEmail).toHaveBeenCalledTimes(2)
    for (const call of sendEmail.mock.calls) {
      expect(call[0].html).toMatch(/Signing has been re-sent/)
    }
  })

  it('confirmed resolves emails when nested joins are arrays', async () => {
    const admin = mockAdminWithProfiles({ asArrays: true })
    await sendReinstatementConfirmedEmails(admin, 'b1', {
      signingResent: false,
      signingResendFailed: false,
      listingFeeRefunded: false,
      bookingStatusAfter: 'bond_pending',
    })
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })
})
