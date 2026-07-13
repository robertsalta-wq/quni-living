import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchCoTenantSignerForTenancy: vi.fn(),
  setListingAgreementStatus: vi.fn(),
  downloadSignedSubmissionPdfFromDocuseal: vi.fn(),
  downloadSignedResidentialTenancyPackagePartsFromDocuseal: vi.fn(),
  extractCompletedAt: vi.fn(),
}))

vi.mock('../booking/coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: mocks.fetchCoTenantSignerForTenancy,
}))

vi.mock('../booking/listingAgreementStatus.js', () => ({
  setListingAgreementStatus: mocks.setListingAgreementStatus,
}))

vi.mock('../docuseal.js', () => ({
  downloadSignedSubmissionPdfFromDocuseal: mocks.downloadSignedSubmissionPdfFromDocuseal,
  downloadSignedResidentialTenancyPackagePartsFromDocuseal:
    mocks.downloadSignedResidentialTenancyPackagePartsFromDocuseal,
  extractCompletedAt: mocks.extractCompletedAt,
}))

import {
  computeSignatureTimestamps,
  isSubmissionFullySignedOnDocuseal,
  isWithdrawnBookingStatus,
  listingBondWindowExpiresAt,
  reinstateBookingAfterDocusealReconcile,
  syncFullySignedDocusealSubmission,
  targetBookingStatusAfterReinstate,
} from './reconcileFromDocuseal.js'

describe('reconcileFromDocuseal helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCoTenantSignerForTenancy.mockResolvedValue(null)
  })

  it('targetBookingStatusAfterReinstate returns active when bond received', () => {
    expect(targetBookingStatusAfterReinstate('2026-06-01T00:00:00Z')).toBe('active')
    expect(targetBookingStatusAfterReinstate(null)).toBe('bond_pending')
  })

  it('isSubmissionFullySignedOnDocuseal requires completed status and both parties', () => {
    const payload = {
      status: 'completed',
      submitters: [
        { role: 'First Party', completed_at: '2026-06-26T09:58:51.253Z' },
        { role: 'Second Party', completed_at: '2026-06-27T02:09:29.563Z' },
      ],
    }
    mocks.extractCompletedAt.mockImplementation((_payload, role: string) => {
      if (role === 'landlord') return '2026-06-26T09:58:51.253Z'
      if (role === 'tenant') return '2026-06-27T02:09:29.563Z'
      return null
    })
    expect(isSubmissionFullySignedOnDocuseal(payload, false)).toBe(true)
    expect(isSubmissionFullySignedOnDocuseal({ status: 'pending', submitters: [] }, false)).toBe(false)
  })

  it('computeSignatureTimestamps requires co-tenant when required', () => {
    mocks.extractCompletedAt.mockImplementation((_payload, role: string) => {
      if (role === 'landlord') return '2026-06-01T10:00:00Z'
      if (role === 'tenant') return '2026-06-01T11:00:00Z'
      return null
    })
    const withoutCo = computeSignatureTimestamps({
      docRow: {
        id: 'doc',
        tenancy_id: 'ten',
        docuseal_submission_id: '133',
        metadata: null,
        status: 'sent_for_signing',
        landlord_signed_at: null,
        student_signed_at: null,
        co_tenant_signed_at: null,
        file_path: null,
      },
      submissionPayload: {},
      coTenantRequired: true,
    })
    expect(withoutCo.fullySigned).toBe(false)

    mocks.extractCompletedAt.mockImplementation((_payload, role: string) => {
      if (role === 'landlord') return '2026-06-01T10:00:00Z'
      if (role === 'tenant') return '2026-06-01T11:00:00Z'
      if (role === 'co_tenant') return '2026-06-01T12:00:00Z'
      return null
    })
    const withCo = computeSignatureTimestamps({
      docRow: {
        id: 'doc',
        tenancy_id: 'ten',
        docuseal_submission_id: '133',
        metadata: null,
        status: 'sent_for_signing',
        landlord_signed_at: null,
        student_signed_at: null,
        co_tenant_signed_at: null,
        file_path: null,
      },
      submissionPayload: {},
      coTenantRequired: true,
    })
    expect(withCo.fullySigned).toBe(true)
  })

  it('syncFullySignedDocusealSubmission persists partial signed_at without downloading PDFs', async () => {
    mocks.extractCompletedAt.mockImplementation((_payload, role: string) => {
      if (role === 'landlord') return '2026-07-12T08:12:51.867Z'
      return null
    })
    mocks.fetchCoTenantSignerForTenancy.mockResolvedValue(null)

    const updates: Record<string, unknown>[] = []
    const admin = {
      from: (table: string) => {
        if (table === 'tenancy_documents') {
          return {
            update: (patch: Record<string, unknown>) => ({
              eq: async () => {
                updates.push(patch)
                return { error: null }
              },
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
      storage: {
        from: () => ({
          upload: async () => {
            throw new Error('PDF download/upload must not run for partial signatures')
          },
        }),
      },
    }

    const result = await syncFullySignedDocusealSubmission({
      admin: admin as never,
      docRow: {
        id: 'doc-1',
        tenancy_id: 'ten-1',
        docuseal_submission_id: '165',
        metadata: null,
        status: 'sent_for_signing',
        landlord_signed_at: null,
        student_signed_at: null,
        co_tenant_signed_at: null,
        file_path: 'ten-1/lease/lease_draft.pdf',
      },
      submissionId: '165',
      submissionPayload: {
        event_type: 'form.completed',
        data: {
          role: 'First Party',
          completed_at: '2026-07-12T08:12:51.867Z',
          submission: { id: 165 },
        },
      },
      metadataExtra: { last_webhook: { event_type: 'form.completed' } },
    })

    expect(result.fullySigned).toBe(false)
    expect(result.nextLandlordAt).toBe('2026-07-12T08:12:51.867Z')
    expect(result.nextStudentAt).toBeNull()
    expect(mocks.downloadSignedSubmissionPdfFromDocuseal).not.toHaveBeenCalled()
    expect(mocks.downloadSignedResidentialTenancyPackagePartsFromDocuseal).not.toHaveBeenCalled()
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({
      status: 'sent_for_signing',
      landlord_signed_at: '2026-07-12T08:12:51.867Z',
      student_signed_at: null,
    })
  })

  it('reinstateBookingAfterDocusealReconcile repairs expired listing booking', async () => {
    const updates: Array<{ table: string; patch: Record<string, unknown> }> = []
    const admin = {
      from: (table: string) => ({
        update: (patch: Record<string, unknown>) => ({
          eq: (col: string, _val: string) => {
            if (table === 'tenancies') {
              return {
                eq: async () => {
                  updates.push({ table, patch })
                  return { error: null }
                },
              }
            }
            return {
              then: (resolve: (v: { error: null }) => void) => {
                updates.push({ table, patch })
                resolve({ error: null })
              },
            }
          },
        }),
      }),
    }

    const result = await reinstateBookingAfterDocusealReconcile({
      admin: admin as never,
      booking: {
        id: 'book_1',
        status: 'expired',
        bond_received_by_landlord_at: null,
        service_tier_final: 'listing',
        listing_agreement_status: 'voided',
        property_id: 'prop_1',
        landlord_id: 'll_1',
        student_id: 'st_1',
        expired_at: '2026-06-28T00:00:00Z',
      },
      tenancy: { id: 'ten_1', status: 'ended' },
    })

    expect(result.bookingStatusAfter).toBe('bond_pending')
    expect(result.changes).toContain('tenancy: ended → active')
    expect(result.changes).toContain('booking: expired → bond_pending')
    expect(mocks.setListingAgreementStatus).toHaveBeenCalledWith(admin, 'book_1', 'ready', null)
    const bookingUpdate = updates.find((u) => u.table === 'bookings')
    expect(bookingUpdate?.patch.status).toBe('bond_pending')
    expect(bookingUpdate?.patch.expired_at).toBeNull()
    expect(typeof bookingUpdate?.patch.bond_window_expires_at).toBe('string')
  })

  it('reinstateBookingAfterDocusealReconcile leaves bond_pending booking untouched', async () => {
    const admin = {
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    }

    const result = await reinstateBookingAfterDocusealReconcile({
      admin: admin as never,
      booking: {
        id: 'book_1',
        status: 'bond_pending',
        bond_received_by_landlord_at: null,
        service_tier_final: 'listing',
        listing_agreement_status: 'ready',
        property_id: 'prop_1',
        landlord_id: 'll_1',
        student_id: 'st_1',
        expired_at: null,
      },
      tenancy: { id: 'ten_1', status: 'active' },
    })

    expect(result.changes).toEqual([])
    expect(result.bookingStatusAfter).toBe('bond_pending')
    expect(mocks.setListingAgreementStatus).not.toHaveBeenCalled()
  })

  it('reinstateBookingAfterDocusealReconcile skips listing_agreement_status for managed tier', async () => {
    const admin = {
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    }

    await reinstateBookingAfterDocusealReconcile({
      admin: admin as never,
      booking: {
        id: 'book_1',
        status: 'expired',
        bond_received_by_landlord_at: '2026-06-01T00:00:00Z',
        service_tier_final: 'managed',
        listing_agreement_status: 'voided',
        property_id: 'prop_1',
        landlord_id: 'll_1',
        student_id: 'st_1',
        expired_at: '2026-06-28T00:00:00Z',
      },
      tenancy: null,
    })

    expect(mocks.setListingAgreementStatus).not.toHaveBeenCalled()
  })

  it('listingBondWindowExpiresAt is seven days ahead', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z')
    expect(listingBondWindowExpiresAt(now)).toBe('2026-07-17T12:00:00.000Z')
  })
})

describe('withdrawn booking guard', () => {
  it('detects cancelled and declined only', () => {
    expect(isWithdrawnBookingStatus('cancelled')).toBe(true)
    expect(isWithdrawnBookingStatus('declined')).toBe(true)
    expect(isWithdrawnBookingStatus('expired')).toBe(false)
  })
})
