import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordBookingEvent = vi.fn()

vi.mock('./recordBookingEvent.js', () => ({
  recordBookingEvent: (...args: unknown[]) => recordBookingEvent(...args),
}))

import {
  emitDocusealSyncBookingEvents,
  emitDocumentSignatureRecorded,
  maxSignatureOccurredAt,
} from './emitDocusealDocumentEvents.js'

describe('emitDocusealDocumentEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recordBookingEvent.mockResolvedValue({ ok: true, id: 'evt-1' })
  })

  it('maxSignatureOccurredAt picks the latest party time', () => {
    expect(
      maxSignatureOccurredAt({
        landlordSignedAt: '2026-06-26T09:58:51.253Z',
        studentSignedAt: '2026-06-27T02:09:29.563Z',
        coTenantSignedAt: null,
      }),
    ).toBe('2026-06-27T02:09:29.563Z')
  })

  it('emitDocumentSignatureRecorded uses DocuSeal time as occurred_at', async () => {
    const admin = {} as never
    await emitDocumentSignatureRecorded(admin, {
      bookingId: 'book-1',
      landlordId: 'll',
      studentId: 'st',
      documentId: 'doc-1',
      submissionId: '133',
      party: 'landlord',
      signedAt: '2026-06-26T09:58:51.253Z',
      source: 'webhook',
      actorType: 'webhook',
    })

    expect(recordBookingEvent).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        eventType: 'document.signature_recorded',
        occurredAt: '2026-06-26T09:58:51.253Z',
        provider: 'docuseal',
        providerRef: '133',
        metadata: expect.objectContaining({ party: 'landlord', source: 'webhook' }),
        changes: [
          { field: 'landlord_signed_at', old: null, new: '2026-06-26T09:58:51.253Z' },
        ],
      }),
      { required: true },
    )
  })

  it('emitDocusealSyncBookingEvents emits per new party then fully_signed with same dialect', async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }

    await emitDocusealSyncBookingEvents(admin as never, {
      bookingId: 'book-1',
      landlordId: 'll',
      studentId: 'st',
      documentId: 'doc-1',
      submissionId: '133',
      before: {
        landlordSignedAt: null,
        studentSignedAt: null,
        coTenantSignedAt: null,
      },
      after: {
        landlordSignedAt: '2026-06-26T09:58:51.253Z',
        studentSignedAt: '2026-06-27T02:09:29.563Z',
        coTenantSignedAt: null,
      },
      fullySigned: true,
      wasFullySigned: false,
      source: 'historical_reconcile',
      actorType: 'system',
    })

    const types = recordBookingEvent.mock.calls.map((c) => c[1].eventType)
    expect(types).toEqual([
      'document.signature_recorded',
      'document.signature_recorded',
      'document.fully_signed',
    ])
    expect(recordBookingEvent.mock.calls[0][1]).toMatchObject({
      occurredAt: '2026-06-26T09:58:51.253Z',
      metadata: { party: 'landlord', source: 'historical_reconcile', docuseal_submission_id: '133' },
    })
    expect(recordBookingEvent.mock.calls[1][1]).toMatchObject({
      occurredAt: '2026-06-27T02:09:29.563Z',
      metadata: { party: 'student', source: 'historical_reconcile', docuseal_submission_id: '133' },
    })
    expect(recordBookingEvent.mock.calls[2][1]).toMatchObject({
      eventType: 'document.fully_signed',
      occurredAt: '2026-06-27T02:09:29.563Z',
      metadata: { source: 'historical_reconcile', docuseal_submission_id: '133' },
    })
  })
})
