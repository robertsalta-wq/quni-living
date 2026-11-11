import { describe, expect, it, vi } from 'vitest'
import { listingEmailAttemptExists } from './listingEmailAttempt.js'

function adminReturning(result: { data: unknown; error: unknown }, seen: { metadata?: unknown }) {
  const query = {
    select: () => query,
    eq: () => query,
    contains: (column: string, metadata: unknown) => {
      if (column === 'metadata') seen.metadata = metadata
      return query
    },
    limit: async () => result,
  }
  return { from: () => query } as never
}

describe('listingEmailAttemptExists', () => {
  it('matches the template key and any extra metadata', async () => {
    const seen: { metadata?: unknown } = {}
    const found = await listingEmailAttemptExists(
      adminReturning({ data: [{ id: 'evt-1' }], error: null }, seen),
      'book-1',
      'agreement_fully_signed_landlord',
      { metadata: { docuseal_submission_id: '174' } },
    )
    expect(found).toBe(true)
    expect(seen.metadata).toEqual({
      template_key: 'agreement_fully_signed_landlord',
      docuseal_submission_id: '174',
    })
  })

  it('returns false on a lookup error so agreement-ready mail can still send', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const found = await listingEmailAttemptExists(
      adminReturning({ data: null, error: { message: 'down' } }, {}),
      'book-1',
      'listing_agreement_ready_renter',
    )
    expect(found).toBe(false)
    errorSpy.mockRestore()
  })

  it('throws on a lookup error when the caller must not send again', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      listingEmailAttemptExists(
        adminReturning({ data: null, error: { message: 'down' } }, {}),
        'book-1',
        'agreement_fully_signed_renter',
        { failClosed: true, metadata: { docuseal_submission_id: '174' } },
      ),
    ).rejects.toThrow(/email.attempt lookup failed/)
    errorSpy.mockRestore()
  })
})
