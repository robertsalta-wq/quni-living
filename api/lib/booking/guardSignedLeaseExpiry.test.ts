import { describe, expect, it, vi } from 'vitest'
import {
  guardBondExpiryForSignedLease,
  leaseDocBlocksBondExpiry,
  type LeaseSignatureRow,
} from './guardSignedLeaseExpiry.js'

const baseDoc: LeaseSignatureRow = {
  id: 'doc-1',
  status: 'sent_for_signing',
  landlord_signed_at: null,
  student_signed_at: null,
  co_tenant_signed_at: null,
  docuseal_submission_id: '133',
}

describe('leaseDocBlocksBondExpiry', () => {
  it('returns false for no document', () => {
    expect(leaseDocBlocksBondExpiry(null)).toBe(false)
    expect(leaseDocBlocksBondExpiry(undefined)).toBe(false)
  })

  it('blocks when status is signed', () => {
    expect(leaseDocBlocksBondExpiry({ ...baseDoc, status: 'signed' })).toBe(true)
  })

  it('blocks when both landlord and student have signed even if status lags', () => {
    expect(
      leaseDocBlocksBondExpiry({
        ...baseDoc,
        status: 'sent_for_signing',
        landlord_signed_at: '2026-06-26T09:58:51.253Z',
        student_signed_at: '2026-06-27T02:09:29.563Z',
      }),
    ).toBe(true)
  })

  it('does not block on a single signature', () => {
    expect(
      leaseDocBlocksBondExpiry({ ...baseDoc, landlord_signed_at: '2026-06-26T09:58:51.253Z' }),
    ).toBe(false)
  })

  it('treats blank strings as unsigned', () => {
    expect(
      leaseDocBlocksBondExpiry({
        ...baseDoc,
        landlord_signed_at: '   ',
        student_signed_at: '',
      }),
    ).toBe(false)
  })
})

type DocRow = Record<string, unknown>

function makeAdmin(opts: {
  tenancyId: string | null
  docs: DocRow[]
  onEvent?: (row: Record<string, unknown>) => void
  eventError?: unknown
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'tenancies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.tenancyId ? { id: opts.tenancyId } : null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: async () => ({ data: opts.docs, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'booking_events') {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                opts.onEvent?.(row)
                if (opts.eventError) return { data: null, error: opts.eventError }
                return { data: { id: 'evt-1' }, error: null }
              },
            }),
          }),
        }
      }
      return {}
    }),
  }
}

const booking = { id: 'bk-1', landlord_id: 'll-1', student_id: 'st-1' }
const nowIso = '2026-07-17T00:00:00.000Z'

describe('guardBondExpiryForSignedLease', () => {
  it('does not block and emits nothing when there is no tenancy', async () => {
    let emitted = false
    const admin = makeAdmin({ tenancyId: null, docs: [], onEvent: () => (emitted = true) })
    const result = await guardBondExpiryForSignedLease({ admin: admin as never, booking, nowIso })
    expect(result).toEqual({ blocked: false })
    expect(emitted).toBe(false)
  })

  it('does not block when the latest lease doc is unsigned', async () => {
    const admin = makeAdmin({
      tenancyId: 'ten-1',
      docs: [{ id: 'doc-1', status: 'sent_for_signing', landlord_signed_at: null, student_signed_at: null, co_tenant_signed_at: null, docuseal_submission_id: '133' }],
    })
    const result = await guardBondExpiryForSignedLease({ admin: admin as never, booking, nowIso })
    expect(result).toEqual({ blocked: false })
  })

  it('blocks and emits bond.expiry_blocked_signed_lease when fully signed', async () => {
    let event: Record<string, unknown> | null = null
    const admin = makeAdmin({
      tenancyId: 'ten-1',
      docs: [
        {
          id: 'doc-1',
          status: 'signed',
          landlord_signed_at: '2026-06-26T09:58:51.253Z',
          student_signed_at: '2026-06-27T02:09:29.563Z',
          co_tenant_signed_at: null,
          docuseal_submission_id: '133',
        },
      ],
      onEvent: (row) => (event = row),
    })
    const result = await guardBondExpiryForSignedLease({ admin: admin as never, booking, nowIso })
    expect(result).toEqual({ blocked: true, documentId: 'doc-1' })
    expect(event).toMatchObject({
      event_type: 'bond.expiry_blocked_signed_lease',
      booking_id: 'bk-1',
      landlord_id: 'll-1',
      student_id: 'st-1',
      actor_type: 'cron',
      audience: 'internal',
      outcome: 'n/a',
      provider: 'docuseal',
      provider_ref: '133',
      reason: 'lease_fully_signed',
      occurred_at: nowIso,
      document_id: 'doc-1',
    })
  })

  it('still blocks even if the event insert fails (safety over telemetry)', async () => {
    const admin = makeAdmin({
      tenancyId: 'ten-1',
      docs: [{ id: 'doc-1', status: 'signed', landlord_signed_at: null, student_signed_at: null, co_tenant_signed_at: null, docuseal_submission_id: null }],
      eventError: new Error('insert boom'),
    })
    const result = await guardBondExpiryForSignedLease({ admin: admin as never, booking, nowIso })
    expect(result).toEqual({ blocked: true, documentId: 'doc-1' })
  })
})
