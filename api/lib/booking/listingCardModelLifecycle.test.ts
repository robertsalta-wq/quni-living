/**
 * Listing card-model lifecycle guard.
 *
 * Drives real handlers (confirmListing → lease-signed sim → markBondReceived) and asserts
 * bookingReviewActionModel copy + status after each stage. Sign-then-bond order (771acf77).
 *
 * Coverage: status-transition / writer class (#57).
 * NOT covered: #55 landlord page-gate (primaryActionKind forcing bond_pending copy at confirmed)
 * — that lands in a follow-up via a pure landlord-primary-action extract.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./listingTransactionalEmails.js', () => ({
  sendListingBookingAcceptedEmails: vi.fn().mockResolvedValue(undefined),
  sendListingAgreementReadyEmails: vi.fn().mockResolvedValue(undefined),
  sendListingBondReceivedEmails: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./triggerListingDocumentGeneration.js', () => ({
  triggerListingDocumentGeneration: vi.fn().mockResolvedValue({
    ok: true,
    tenancyId: 'ten1',
    documentId: 'doc1',
    docusealSubmissionId: 'sub1',
  }),
}))

vi.mock('../documents/listingTenancyGeneration/index.js', () => ({
  preflightListingTenancyDocument: vi.fn().mockResolvedValue({ ok: true, generator: 'nsw-ft6600' }),
}))

vi.mock('./listingAgreementStatus.js', () => ({
  setListingAgreementStatus: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../messaging/bookingConversation.js', () => ({
  unlockConversationOnBookingConfirmed: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./declineCompetingBookings.js', () => ({
  declineCompetingBookings: vi.fn().mockResolvedValue({ declined: 0 }),
}))

vi.mock('./coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: vi.fn().mockResolvedValue(null),
}))

vi.mock('./maybeAdvanceListingBookingToActive.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./maybeAdvanceListingBookingToActive.js')>()
  return {
    ...mod,
    maybeAdvanceListingBookingToActive: vi.fn(mod.maybeAdvanceListingBookingToActive),
  }
})

import {
  resolveLandlordBookingReviewActionCopy,
  resolveRenterBookingReviewActionCopy,
} from '../../../src/lib/booking/bookingReviewActionModel'
import { runListingConfirmBooking } from './confirmListing.js'
import { runMarkBondReceivedLandlord } from './markBondReceived.js'
import { maybeAdvanceListingBookingToActive } from './maybeAdvanceListingBookingToActive.js'
import { preflightListingTenancyDocument } from '../documents/listingTenancyGeneration/index.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'

const BOOKING_ID = '00000000-0000-4000-8000-000000000071'
const LL_ID = 'll-lifecycle'
const ST_ID = 'st-lifecycle'
const PROP_ID = 'pr-lifecycle'
const TENANCY_ID = 'ten-lifecycle'
const STUDENT_NAME = 'Sahil Harriram'
const HOST_NAME = 'Quinn Host'

type LeaseDoc = {
  status: string
  landlord_signed_at: string | null
  student_signed_at: string | null
  co_tenant_signed_at: string | null
  document_type: string
  created_at: string
}

type Store = {
  booking: Record<string, unknown>
  tenancyId: string | null
  leaseDocs: LeaseDoc[]
}

function cardSnapshot(status: string) {
  const landlord = resolveLandlordBookingReviewActionCopy({
    status: status as never,
    studentDisplayName: STUDENT_NAME,
    askedAtLabel: null,
    bondDeadlineLabel: '23 Jul 2026',
    hasActionRequired: status === 'pending_confirmation',
  })
  const renter = resolveRenterBookingReviewActionCopy({
    status: status as never,
    landlordDisplayName: HOST_NAME,
    askedAtLabel: null,
    sentAtLabel: '16 Jul',
    bondDeadlineLabel: '23 Jul 2026',
    obligationSub: null,
  })
  return { landlord, renter }
}

function assertNoLeftoverStuckTitles(landlordTitle: string, renterTitle: string) {
  expect(landlordTitle).not.toMatch(/Confirm the bond/i)
  expect(landlordTitle).not.toMatch(/Chase the signature/i)
  expect(renterTitle).not.toMatch(/Sign your agreement/i)
  expect(renterTitle).not.toMatch(/Pay your bond/i)
}

/**
 * Single coherent admin mock for confirm → mark-bond → advance.
 */
function createLifecycleAdmin(store: Store) {
  const from = vi.fn((table: string) => {
    if (table === 'landlord_profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { fee_exempt: true }, error: null }),
          }),
        }),
      }
    }

    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ...store.booking }, error: null }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: (col1: string, val1: unknown) => {
            // .eq('id', id).in('status', [...]).select()
            // .eq('id', id).eq('status', x).select()
            if (col1 !== 'id') {
              return {
                select: async () => ({ data: [], error: null }),
              }
            }
            return {
              in: (_c: string, statuses: string[]) => ({
                select: async () => {
                  const st = String(store.booking.status ?? '')
                  if (!statuses.includes(st)) return { data: [], error: null }
                  store.booking = { ...store.booking, ...patch }
                  return { data: [{ ...store.booking }], error: null }
                },
              }),
              eq: (col2: string, val2: unknown) => ({
                select: async () => {
                  if (col2 === 'status' && String(store.booking.status) !== String(val2)) {
                    return { data: [], error: null }
                  }
                  store.booking = { ...store.booking, ...patch }
                  return { data: [{ ...store.booking }], error: null }
                },
              }),
            }
          },
        }),
      }
    }

    if (table === 'booking_events') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'evt-lifecycle' }, error: null }),
          }),
        }),
      }
    }

    if (table === 'property_payout_details') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }
    }

    if (table === 'tenancies') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: store.tenancyId ? { id: store.tenancyId } : null,
              error: null,
            }),
          }),
        }),
      }
    }

    if (table === 'tenancy_documents') {
      // markBond listingLeaseSigningAlreadyInitiated: select().eq() → promise-like { data, error }
      // maybeAdvance: select().eq().in().order().limit()
      const listResult = {
        data: store.leaseDocs.map((d) => ({
          status: d.status,
          landlord_signed_at: d.landlord_signed_at,
          student_signed_at: d.student_signed_at,
          co_tenant_signed_at: d.co_tenant_signed_at,
          created_at: d.created_at,
          document_type: d.document_type,
        })),
        error: null,
      }
      return {
        select: () => ({
          eq: () => {
            const chain = {
              in: () => ({
                order: () => ({
                  limit: async () => listResult,
                }),
              }),
              then: (resolve: (v: unknown) => unknown) => Promise.resolve(listResult).then(resolve),
            }
            return chain
          },
        }),
      }
    }

    if (table === 'platform_config' || table === 'student_profiles') {
      return {
        select: () => ({
          in: async () => ({ data: [], error: null }),
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }
    }

    return {}
  })

  return { from }
}

function initialStore(): Store {
  return {
    booking: {
      id: BOOKING_ID,
      landlord_id: LL_ID,
      student_id: ST_ID,
      property_id: PROP_ID,
      status: 'pending_confirmation',
      stripe_payment_intent_id: null,
      service_tier_at_request: 'listing',
      service_tier_final: null,
      bond_received_by_landlord_at: null,
      confirmed_at: null,
      bond_window_expires_at: null,
      move_in_date: '2026-08-01',
      start_date: '2026-08-01',
      // Non-occupancy so payout gate is skipped
      properties: {
        state: 'NSW',
        property_type: 'entire_place',
        is_registered_rooming_house: false,
      },
    },
    tenancyId: null,
    leaseDocs: [],
  }
}

function stripeStub() {
  return {
    customers: {
      retrieve: vi.fn(async () => ({
        deleted: false,
        invoice_settings: { default_payment_method: { id: 'pm_def' } },
      })),
    },
    paymentIntents: {
      cancel: vi.fn(async () => ({})),
      create: vi.fn(async () => ({ id: 'pi_fee', status: 'succeeded', client_secret: 'cs' })),
    },
  }
}

const landlord = {
  id: LL_ID,
  stripe_customer_id: 'cus_ll',
  stripe_charges_enabled: true,
}

describe('Listing card-model lifecycle (status-transition class)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(preflightListingTenancyDocument).mockResolvedValue({ ok: true, generator: 'nsw-ft6600' })
    vi.mocked(triggerListingDocumentGeneration).mockResolvedValue({
      ok: true,
      tenancyId: TENANCY_ID,
      documentId: 'doc1',
      docusealSubmissionId: 'sub1',
    })
    vi.mocked(maybeAdvanceListingBookingToActive).mockImplementation(async (...args) => {
      const mod = await vi.importActual<typeof import('./maybeAdvanceListingBookingToActive.js')>(
        './maybeAdvanceListingBookingToActive.js',
      )
      return mod.maybeAdvanceListingBookingToActive(...args)
    })
  })

  it('sign-then-bond (771acf77 order): confirm → signed while bond_pending → mark bond → active + active cards', async () => {
    const store = initialStore()
    const admin = createLifecycleAdmin(store)

    // Stage: pending_confirmation cards
    {
      const { landlord: ll, renter } = cardSnapshot('pending_confirmation')
      expect(ll.title).toMatch(/^Respond to /)
      expect(renter.title).toBe('Request sent')
      expect(store.booking.status).toBe('pending_confirmation')
    }

    const confirm = await runListingConfirmBooking({
      stripe: stripeStub() as never,
      admin: admin as never,
      landlord,
      bookingId: BOOKING_ID,
      origin: '*',
    })
    expect(confirm.ok).toBe(true)
    if (!confirm.ok) return
    expect(confirm.status).toBe('bond_pending')
    expect(store.booking.status).toBe('bond_pending')

    // Stage: bond_pending cards
    {
      const { landlord: ll, renter } = cardSnapshot(String(store.booking.status))
      expect(ll.title).toBe('Confirm the bond')
      expect(renter.title).toBe('Pay your bond')
    }

    // Simulate DocuSeal full sign WHILE still bond_pending (771acf77 ordering)
    store.tenancyId = TENANCY_ID
    store.leaseDocs = [
      {
        status: 'signed',
        landlord_signed_at: '2026-07-13T00:00:00.000Z',
        student_signed_at: '2026-07-13T00:00:00.000Z',
        co_tenant_signed_at: null,
        document_type: 'residential_tenancy',
        created_at: '2026-07-13T00:00:00.000Z',
      },
    ]

    // Status unchanged — still bond cards (not active yet)
    {
      expect(store.booking.status).toBe('bond_pending')
      const { landlord: ll, renter } = cardSnapshot('bond_pending')
      expect(ll.title).toBe('Confirm the bond')
      expect(renter.title).toBe('Pay your bond')
    }

    const mark = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: LL_ID,
      bookingId: BOOKING_ID,
    })
    expect(mark.ok).toBe(true)
    if (!mark.ok) return
    expect(mark.booking.status).toBe('active')
    expect(store.booking.status).toBe('active')
    expect(maybeAdvanceListingBookingToActive).toHaveBeenCalled()

    const { landlord: ll, renter } = cardSnapshot(String(store.booking.status))
    expect(ll.title).toBe('Tenancy is active')
    expect(renter.title).toBe("You're all set")
    assertNoLeftoverStuckTitles(ll.title, renter.title)
  })

  it('FAILS the active assertion when maybeAdvanceListingBookingToActive is mocked away (proves #57 value)', async () => {
    vi.mocked(maybeAdvanceListingBookingToActive).mockResolvedValue({
      advanced: false,
      reason: 'not_fully_signed',
    })

    const store = initialStore()
    const admin = createLifecycleAdmin(store)

    const confirm = await runListingConfirmBooking({
      stripe: stripeStub() as never,
      admin: admin as never,
      landlord,
      bookingId: BOOKING_ID,
      origin: '*',
    })
    expect(confirm.ok).toBe(true)

    store.tenancyId = TENANCY_ID
    store.leaseDocs = [
      {
        status: 'signed',
        landlord_signed_at: '2026-07-13T00:00:00.000Z',
        student_signed_at: '2026-07-13T00:00:00.000Z',
        co_tenant_signed_at: null,
        document_type: 'residential_tenancy',
        created_at: '2026-07-13T00:00:00.000Z',
      },
    ]

    const mark = await runMarkBondReceivedLandlord({
      admin: admin as never,
      landlordProfileId: LL_ID,
      bookingId: BOOKING_ID,
    })
    expect(mark.ok).toBe(true)
    if (!mark.ok) return

    // Without the helper advancing, mark-bond leaves confirmed — stuck signature cards.
    expect(mark.booking.status).toBe('confirmed')
    expect(store.booking.status).toBe('confirmed')
    const { landlord: ll, renter } = cardSnapshot(String(store.booking.status))
    expect(ll.title).toBe('Chase the signature')
    expect(renter.title).toBe('Sign your agreement')
  })
})

describe.skip('Managed card-model lifecycle (queued)', () => {
  // Stage list from orient — not implemented this PR:
  // pending_confirmation → confirmed → active (release-deposits)
  // Landlord: Respond to {name} → Chase the signature → Tenancy is active
  // Renter: Request sent → Sign your agreement → You're all set
  it.todo('walks Managed confirm → deposit release → active and asserts card copy')
})

describe.skip('Boarding Listing card-model lifecycle (queued)', () => {
  // Stage list + #55 page-gate class (landlord primaryActionKind / mark-bond override):
  // pending_confirmation → bond_pending → confirmed (sign) → active
  // Plus boarding mark-bond CTA path; page-gate extract is the next PR.
  it.todo('walks boarding Listing lifecycle including mark-bond CTA path')
  it.todo('asserts landlord card does not force Confirm the bond after bond_received at confirmed (#55)')
})
