import { describe, expect, it } from 'vitest'
import {
  isExecutedTenancyDocumentStatus,
  isFullyExecutedTenancyDocument,
} from './executedTenancyDocument'

describe('isExecutedTenancyDocumentStatus', () => {
  it('accepts signed and archived', () => {
    expect(isExecutedTenancyDocumentStatus('signed')).toBe(true)
    expect(isExecutedTenancyDocumentStatus('archived')).toBe(true)
    expect(isExecutedTenancyDocumentStatus('draft')).toBe(false)
    expect(isExecutedTenancyDocumentStatus('sent_for_signing')).toBe(false)
  })
})

describe('isFullyExecutedTenancyDocument', () => {
  it('requires both party stamps for archived (Kim terminated case)', () => {
    expect(
      isFullyExecutedTenancyDocument({
        status: 'archived',
        landlordSignedAt: '2026-07-01T00:00:00Z',
        studentSignedAt: '2026-07-02T00:00:00Z',
      }),
    ).toBe(true)
    expect(
      isFullyExecutedTenancyDocument({
        status: 'archived',
        landlordSignedAt: '2026-07-01T00:00:00Z',
        studentSignedAt: null,
      }),
    ).toBe(false)
  })

  it('accepts signed when both party stamps are present', () => {
    expect(
      isFullyExecutedTenancyDocument({
        status: 'signed',
        landlordSignedAt: '2026-07-01T00:00:00Z',
        studentSignedAt: '2026-07-02T00:00:00Z',
      }),
    ).toBe(true)
  })
})
