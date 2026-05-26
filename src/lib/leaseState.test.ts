import { describe, expect, it } from 'vitest'

import { deriveLeaseDocState, leaseDocStateCtaLabel } from './leaseState'

const baseRow = {
  bookingStatus: 'confirmed' as string | null,
  serviceTierFinal: 'managed' as string | null,
  documentExists: true,
  documentStatus: 'sent_for_signing' as string | null,
  landlordSignedAt: null as string | null,
  studentSignedAt: null as string | null,
  viewerRole: 'tenant' as 'landlord' | 'tenant',
}

describe('deriveLeaseDocState', () => {
  it("'none' when no tenancy_document row exists", () => {
    const state = deriveLeaseDocState({ ...baseRow, documentExists: false, documentStatus: null })
    expect(state).toBe('none')
  })

  it("'preview' for Listing draft (status=draft, no signing yet)", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      bookingStatus: 'bond_pending',
      serviceTierFinal: 'listing',
      documentStatus: 'draft',
    })
    expect(state).toBe('preview')
  })

  it("'ready_to_sign' when sent_for_signing and viewer hasn't signed", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'sent_for_signing',
      landlordSignedAt: null,
      studentSignedAt: null,
      viewerRole: 'tenant',
    })
    expect(state).toBe('ready_to_sign')
  })

  it("'awaiting_other' when viewer (tenant) has signed but counterparty has not", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'sent_for_signing',
      landlordSignedAt: null,
      studentSignedAt: '2026-05-09T00:00:00Z',
      viewerRole: 'tenant',
    })
    expect(state).toBe('awaiting_other')
  })

  it("'awaiting_other' when viewer (landlord) has signed but tenant has not", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'sent_for_signing',
      landlordSignedAt: '2026-05-09T00:00:00Z',
      studentSignedAt: null,
      viewerRole: 'landlord',
    })
    expect(state).toBe('awaiting_other')
  })

  it("'fully_signed' wins over status when BOTH timestamps are set, regardless of doc.status", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'sent_for_signing', // status flag stale
      landlordSignedAt: '2026-05-09T00:00:00Z',
      studentSignedAt: '2026-05-09T01:00:00Z',
    })
    expect(state).toBe('fully_signed')
  })

  it("'fully_signed' when status='signed' and both timestamps set", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'signed',
      landlordSignedAt: '2026-05-09T00:00:00Z',
      studentSignedAt: '2026-05-09T01:00:00Z',
    })
    expect(state).toBe('fully_signed')
  })

  it("status='signed' but only one timestamp does NOT yield fully_signed (gates Download button)", () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'signed',
      landlordSignedAt: '2026-05-09T00:00:00Z',
      studentSignedAt: null,
      viewerRole: 'tenant',
    })
    expect(state).toBe('ready_to_sign')
  })

  it('whitespace-only timestamps are treated as null (defensive)', () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'signed',
      landlordSignedAt: '   ',
      studentSignedAt: '  ',
      viewerRole: 'tenant',
    })
    expect(state).toBe('ready_to_sign')
  })

  it('does not yield fully_signed when co-tenant signature is required but missing', () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'signed',
      landlordSignedAt: '2026-05-09T00:00:00Z',
      studentSignedAt: '2026-05-09T01:00:00Z',
      coTenantSigningRequired: true,
      coTenantSignedAt: null,
      viewerRole: 'landlord',
    })
    expect(state).toBe('awaiting_other')
  })

  it('yields fully_signed when co-tenant has also signed', () => {
    const state = deriveLeaseDocState({
      ...baseRow,
      documentStatus: 'signed',
      landlordSignedAt: '2026-05-09T00:00:00Z',
      studentSignedAt: '2026-05-09T01:00:00Z',
      coTenantSigningRequired: true,
      coTenantSignedAt: '2026-05-09T02:00:00Z',
    })
    expect(state).toBe('fully_signed')
  })
})

describe('leaseDocStateCtaLabel', () => {
  it('returns expected human labels', () => {
    expect(leaseDocStateCtaLabel('preview')).toMatch(/preview/i)
    expect(leaseDocStateCtaLabel('ready_to_sign')).toMatch(/sign/i)
    expect(leaseDocStateCtaLabel('awaiting_other')).toMatch(/await/i)
    expect(leaseDocStateCtaLabel('fully_signed')).toMatch(/download/i)
    expect(leaseDocStateCtaLabel('none')).toBe('')
  })
})
