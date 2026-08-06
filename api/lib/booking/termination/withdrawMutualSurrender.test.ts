import { describe, expect, it, vi } from 'vitest'

describe('runWithdrawMutualSurrender', () => {
  it('rejects when booking is already terminated', async () => {
    const { runWithdrawMutualSurrender } = await import('./withdrawMutualSurrender.js')
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                id: 'b1',
                landlord_id: 'l1',
                student_id: 's1',
                property_id: 'p1',
                status: 'terminated',
                service_tier_final: 'listing',
                termination_type: 'mutual_surrender',
                termination_effective_date: '2026-08-01',
                termination_acknowledged_at: '2026-08-01T00:00:00Z',
                bond_received_by_landlord_at: '2026-07-01T00:00:00Z',
              },
              error: null,
            })),
          })),
        })),
      })),
    }

    const r = await runWithdrawMutualSurrender({
      admin: admin as never,
      landlordProfileId: 'l1',
      bookingId: 'b1',
    })
    expect(r).toMatchObject({ ok: false, code: 'already_terminated' })
  })

  it('rejects when not terminating mutual surrender', async () => {
    const { runWithdrawMutualSurrender } = await import('./withdrawMutualSurrender.js')
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                id: 'b1',
                landlord_id: 'l1',
                student_id: 's1',
                property_id: 'p1',
                status: 'active',
                service_tier_final: 'listing',
                termination_type: null,
                termination_effective_date: null,
                termination_acknowledged_at: null,
                bond_received_by_landlord_at: '2026-07-01T00:00:00Z',
              },
              error: null,
            })),
          })),
        })),
      })),
    }

    const r = await runWithdrawMutualSurrender({
      admin: admin as never,
      landlordProfileId: 'l1',
      bookingId: 'b1',
    })
    expect(r).toMatchObject({ ok: false, code: 'not_terminating' })
  })

  it('restores active and clears termination fields', async () => {
    vi.resetModules()
    const recordBookingEvent = vi.fn(async () => ({ ok: true, id: 'e1' }))
    const emitDocumentVoided = vi.fn(async () => ({ ok: true, id: 'e2' }))
    const tryArchive = vi.fn(async () => undefined)

    vi.doMock('../events/recordBookingEvent.js', () => ({ recordBookingEvent }))
    vi.doMock('../events/emitDocusealDocumentEvents.js', () => ({ emitDocumentVoided }))
    vi.doMock('../unwindListingAgreement.js', () => ({
      tryArchiveDocusealSubmissionBestEffort: tryArchive,
    }))

    const { runWithdrawMutualSurrender } = await import('./withdrawMutualSurrender.js')

    const bookingUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(async () => ({
            data: [{ id: 'b1', status: 'active' }],
            error: null,
          })),
        })),
      })),
    }))

    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'bookings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: 'b1',
                    landlord_id: 'l1',
                    student_id: 's1',
                    property_id: 'p1',
                    status: 'terminating',
                    service_tier_final: 'listing',
                    termination_type: 'mutual_surrender',
                    termination_effective_date: '2026-08-20',
                    termination_acknowledged_at: null,
                    bond_received_by_landlord_at: '2026-07-01T00:00:00Z',
                  },
                  error: null,
                })),
              })),
            })),
            update: bookingUpdate,
          }
        }
        if (table === 'booking_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({
                        data: {
                          metadata: { status_before_termination: 'active' },
                        },
                        error: null,
                      })),
                    })),
                  })),
                })),
              })),
            })),
          }
        }
        if (table === 'tenancies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: 't1' },
                  error: null,
                })),
              })),
            })),
          }
        }
        if (table === 'tenancy_documents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({
                  data: [
                    {
                      id: 'd1',
                      status: 'sent_for_signing',
                      metadata: {},
                      docuseal_submission_id: '99',
                    },
                  ],
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    const r = await runWithdrawMutualSurrender({
      admin: admin as never,
      landlordProfileId: 'l1',
      bookingId: 'b1',
    })

    expect(r).toEqual({ ok: true, bookingId: 'b1', restoredStatus: 'active' })
    expect(tryArchive).toHaveBeenCalled()
    expect(bookingUpdate).toHaveBeenCalled()
    expect(recordBookingEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'booking.termination_withdrawn',
        metadata: expect.objectContaining({ restored_status: 'active' }),
      }),
    )
  })
})
