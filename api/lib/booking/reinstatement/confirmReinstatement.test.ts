import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findBondPendingExpiredRefundMarker: vi.fn(),
  loadLatestLeaseDocForBooking: vi.fn(),
  fetchDocusealSubmission: vi.fn(),
  isSubmissionFullySignedOnDocuseal: vi.fn(),
  isCoTenantRequiredForTenancy: vi.fn(),
  syncFullySignedDocusealSubmission: vi.fn(),
  reinstateBookingAfterDocusealReconcile: vi.fn(),
  resetTenancyDocumentForNewSigningRound: vi.fn(),
  triggerListingDocumentGeneration: vi.fn(),
  recordBookingEvent: vi.fn(),
  sendReinstatementConfirmedEmails: vi.fn(),
  sendReinstatementBlockedUnavailableEmails: vi.fn(),
  isPropertyBlockedForReinstatement: vi.fn(),
}))

vi.mock('../../docuseal/reconcileFromDocuseal.js', () => ({
  findBondPendingExpiredRefundMarker: mocks.findBondPendingExpiredRefundMarker,
  loadLatestLeaseDocForBooking: mocks.loadLatestLeaseDocForBooking,
  fetchDocusealSubmission: mocks.fetchDocusealSubmission,
  isSubmissionFullySignedOnDocuseal: mocks.isSubmissionFullySignedOnDocuseal,
  isCoTenantRequiredForTenancy: mocks.isCoTenantRequiredForTenancy,
  syncFullySignedDocusealSubmission: mocks.syncFullySignedDocusealSubmission,
  reinstateBookingAfterDocusealReconcile: mocks.reinstateBookingAfterDocusealReconcile,
  isWithdrawnBookingStatus: (s: string) => s === 'cancelled' || s === 'declined',
}))

vi.mock('../resetTenancyDocumentForNewSigningRound.js', () => ({
  resetTenancyDocumentForNewSigningRound: mocks.resetTenancyDocumentForNewSigningRound,
}))

vi.mock('../triggerListingDocumentGeneration.js', () => ({
  triggerListingDocumentGeneration: mocks.triggerListingDocumentGeneration,
}))

vi.mock('../events/recordBookingEvent.js', () => ({
  recordBookingEvent: mocks.recordBookingEvent,
}))

vi.mock('./emails.js', () => ({
  sendReinstatementConfirmedEmails: mocks.sendReinstatementConfirmedEmails,
  sendReinstatementBlockedUnavailableEmails: mocks.sendReinstatementBlockedUnavailableEmails,
}))

vi.mock('./availability.js', () => ({
  isPropertyBlockedForReinstatement: mocks.isPropertyBlockedForReinstatement,
}))

import { confirmReinstatement } from './confirmReinstatement.js'

function party(overrides: Record<string, unknown> = {}) {
  return {
    role: 'tenant' as const,
    authUserId: 'user-tenant',
    landlordProfileId: null,
    studentProfileId: 'st1',
    booking: {
      id: 'b1',
      status: 'expired',
      landlord_id: 'll1',
      student_id: 'st1',
      property_id: 'p1',
      service_tier_final: 'listing',
      expired_at: new Date(Date.now() - 86400000).toISOString(),
      bond_received_by_landlord_at: null,
      listing_agreement_status: 'voided',
      move_in_date: '2026-08-01',
      start_date: null,
      end_date: null,
      ...overrides,
    },
  }
}

function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req1',
    booking_id: 'b1',
    requested_by: 'user-landlord',
    requested_by_role: 'landlord',
    requested_at: new Date().toISOString(),
    grace_window_expires_at: new Date(Date.now() + 86400000 * 10).toISOString(),
    status: 'pending_confirmation',
    requested_fee_action: 'reinstate_free_flagged',
    confirmed_by: null,
    confirmed_at: null,
    fee_action: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function mockAdmin(requestRow: Record<string, unknown>) {
  const state = { row: { ...requestRow } }
  return {
    from: vi.fn((table: string) => {
      if (table === 'booking_reinstatement_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.row, error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => {
                    state.row = { ...state.row, ...patch }
                    return { data: state.row, error: null }
                  },
                }),
              }),
            }),
          }),
        }
      }
      return {}
    }),
    _state: state,
  } as any
}

describe('confirmReinstatement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findBondPendingExpiredRefundMarker.mockResolvedValue({ found: true, metadata: { refund: 1 } })
    mocks.loadLatestLeaseDocForBooking.mockResolvedValue({
      tenancy: { id: 't1', status: 'ended' },
      doc: {
        id: 'd1',
        tenancy_id: 't1',
        docuseal_submission_id: 'sub1',
        metadata: {},
        status: 'archived',
        landlord_signed_at: null,
        student_signed_at: null,
        co_tenant_signed_at: null,
        file_path: null,
      },
    })
    mocks.fetchDocusealSubmission.mockResolvedValue({ status: 'archived' })
    mocks.isSubmissionFullySignedOnDocuseal.mockReturnValue(false)
    mocks.isCoTenantRequiredForTenancy.mockResolvedValue(false)
    mocks.reinstateBookingAfterDocusealReconcile.mockResolvedValue({
      changes: ['booking: expired → bond_pending'],
      bookingStatusBefore: 'expired',
      bookingStatusAfter: 'bond_pending',
    })
    mocks.resetTenancyDocumentForNewSigningRound.mockResolvedValue({
      ok: true,
      reset: true,
      documentId: 'd1',
      previousStatus: 'archived',
    })
    mocks.triggerListingDocumentGeneration.mockResolvedValue({ ok: true })
    mocks.isPropertyBlockedForReinstatement.mockResolvedValue({ blocked: false })
    mocks.recordBookingEvent.mockResolvedValue(undefined)
  })

  it('blocks self-confirm', async () => {
    const admin = mockAdmin(pendingRequest({ requested_by: 'user-tenant' }))
    const result = await confirmReinstatement({
      admin,
      party: party(),
      requestId: 'req1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('self_confirm')
  })

  it('blocked_unavailable marks request and does not reinstate', async () => {
    mocks.isPropertyBlockedForReinstatement.mockResolvedValue({ blocked: true })
    const admin = mockAdmin(pendingRequest())
    const result = await confirmReinstatement({
      admin,
      party: party(),
      requestId: 'req1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('blocked_unavailable')
    expect(mocks.reinstateBookingAfterDocusealReconcile).not.toHaveBeenCalled()
    expect(mocks.sendReinstatementBlockedUnavailableEmails).toHaveBeenCalled()
  })

  it('unsigned path reinstates and auto-regenerates', async () => {
    const admin = mockAdmin(pendingRequest())
    const result = await confirmReinstatement({
      admin,
      party: party(),
      requestId: 'req1',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.signing_needs_resend).toBe(true)
    expect(result.signing_resend_failed).toBe(false)
    expect(result.fee_action).toBe('reinstate_free_flagged')
    expect(mocks.syncFullySignedDocusealSubmission).not.toHaveBeenCalled()
    expect(mocks.resetTenancyDocumentForNewSigningRound).toHaveBeenCalled()
    expect(mocks.triggerListingDocumentGeneration).toHaveBeenCalled()
    expect(mocks.recordBookingEvent).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ eventType: 'booking.reinstated_self_serve' }),
    )
  })

  it('signed path syncs then reinstates without regenerate', async () => {
    mocks.isSubmissionFullySignedOnDocuseal.mockReturnValue(true)
    mocks.syncFullySignedDocusealSubmission.mockResolvedValue({ signedPath: 'x.pdf' })
    const admin = mockAdmin(pendingRequest())
    const result = await confirmReinstatement({
      admin,
      party: party(),
      requestId: 'req1',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.signing_needs_resend).toBe(false)
    expect(mocks.syncFullySignedDocusealSubmission).toHaveBeenCalled()
    expect(mocks.resetTenancyDocumentForNewSigningRound).not.toHaveBeenCalled()
  })
})
