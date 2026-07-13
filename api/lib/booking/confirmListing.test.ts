import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./listingTransactionalEmails.js', () => ({
  sendListingBookingAcceptedEmails: vi.fn().mockResolvedValue(undefined),
  sendListingAgreementReadyEmails: vi.fn().mockResolvedValue(undefined),
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
  preflightListingTenancyDocument: vi.fn().mockResolvedValue({ ok: true, generator: 'qld-form18a' }),
}))

vi.mock('./listingAgreementStatus.js', () => ({
  setListingAgreementStatus: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../messaging/bookingConversation.js', () => ({
  unlockConversationOnBookingConfirmed: vi.fn().mockResolvedValue(undefined),
}))

import { sendListingAgreementReadyEmails, sendListingBookingAcceptedEmails } from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { preflightListingTenancyDocument } from '../documents/listingTenancyGeneration/index.js'
import { setListingAgreementStatus } from './listingAgreementStatus.js'
import { runListingConfirmBooking } from './confirmListing.js'

const landlord = { id: 'll1', stripe_customer_id: 'cus_ll', stripe_charges_enabled: true }

const baseBooking = {
  id: '00000000-0000-4000-8000-000000000001',
  landlord_id: 'll1',
  student_id: 'st1',
  property_id: 'pr1',
  status: 'pending_confirmation',
  stripe_payment_intent_id: 'pi_hold',
  service_tier_at_request: 'listing',
}

function mockAdmin(opts: {
  booking?: typeof baseBooking & {
    properties?: { state: string; property_type: string; is_registered_rooming_house: boolean }
    move_in_date?: string | null
    start_date?: string | null
  }
  updateRows?: unknown[] | null
  eventError?: Error | null
  feeExempt?: boolean
  payoutRow?: { account_name: string; bsb: string; account_number: string } | null
}) {
  const booking = opts.booking ?? baseBooking
  const updateRows = opts.updateRows ?? [{ id: booking.id }]
  const eventError = opts.eventError ?? null
  const feeExempt = opts.feeExempt ?? false
  const payoutRow = opts.payoutRow ?? null

  const from = vi.fn((table: string) => {
    if (table === 'landlord_profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { fee_exempt: feeExempt }, error: null }),
          }),
        }),
      }
    }
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: booking, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            in: () => ({
              select: async () => ({
                data: updateRows,
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'booking_events') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'evt-1' }, error: eventError }),
          }),
        }),
      }
    }
    if (table === 'property_payout_details') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: payoutRow, error: null }),
          }),
        }),
      }
    }
    return {}
  })

  return { from }
}

function stripeHappy() {
  return {
    customers: {
      retrieve: vi.fn(async () => ({
        deleted: false,
        invoice_settings: { default_payment_method: { id: 'pm_def', card: { brand: 'visa', last4: '4242' } } },
      })),
    },
    paymentIntents: {
      cancel: vi.fn(async () => ({})),
      create: vi.fn(async () => ({
        id: 'pi_fee',
        status: 'succeeded',
        client_secret: 'cs_test',
      })),
    },
  }
}

describe('runListingConfirmBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(preflightListingTenancyDocument).mockResolvedValue({ ok: true, generator: 'qld-form18a' })
    vi.mocked(triggerListingDocumentGeneration).mockResolvedValue({
      ok: true,
      tenancyId: 'ten1',
      documentId: 'doc1',
      docusealSubmissionId: 'sub1',
    })
  })

  it('happy path: preflight, cancel hold, charge $99, bond_pending, doc gen, ready status', async () => {
    const stripe = stripeHappy()
    const admin = mockAdmin({})

    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('bond_pending')
    expect(result.listing_agreement_status).toBe('ready')
    expect(preflightListingTenancyDocument).toHaveBeenCalled()
    expect(sendListingAgreementReadyEmails).toHaveBeenCalledWith(expect.anything(), baseBooking.id)
    expect(sendListingBookingAcceptedEmails).toHaveBeenCalledWith(
      expect.anything(),
      baseBooking.id,
      expect.objectContaining({
        bond_window_expires_at: expect.any(String),
      }),
    )
    expect(setListingAgreementStatus).toHaveBeenCalledWith(
      expect.anything(),
      baseBooking.id,
      'ready',
      null,
    )
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold')
    expect(stripe.paymentIntents.create).toHaveBeenCalled()
    expect(admin.from).toHaveBeenCalledWith('booking_events')
  })

  it('preflight failure blocks charge and bond_pending', async () => {
    vi.mocked(preflightListingTenancyDocument).mockResolvedValueOnce({
      ok: false,
      status: 400,
      error: 'Rent payment details are not configured',
    })

    const stripe = stripeHappy()
    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.body.error).toBe('agreement_preflight_failed')
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
    expect(triggerListingDocumentGeneration).not.toHaveBeenCalled()
    expect(sendListingBookingAcceptedEmails).not.toHaveBeenCalled()
    expect(sendListingAgreementReadyEmails).not.toHaveBeenCalled()
  })

  it('doc-gen ok:false sets failed status, no agreement-ready email', async () => {
    vi.mocked(triggerListingDocumentGeneration).mockResolvedValueOnce({
      ok: false,
      status: 0,
      error: 'fetch failed',
      detail: 'network',
    })

    const stripe = stripeHappy()
    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.listing_agreement_status).toBe('failed')
    expect(setListingAgreementStatus).toHaveBeenCalledWith(
      expect.anything(),
      baseBooking.id,
      'failed',
      expect.stringContaining('fetch failed'),
    )
    expect(sendListingAgreementReadyEmails).not.toHaveBeenCalled()
    expect(sendListingBookingAcceptedEmails).toHaveBeenCalled()
  })

  it('fee-exempt landlord: skips listing fee charge', async () => {
    const stripe = stripeHappy()
    const admin = mockAdmin({ feeExempt: true })

    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.listing_fee_payment_intent_id).toBeNull()
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold')
  })

  it('blocks boarder/lodger Listing accept when payout details are missing', async () => {
    const occupancyBooking = {
      ...baseBooking,
      move_in_date: '2026-07-01',
      properties: {
        state: 'QLD',
        property_type: 'private_room_landlord_on_site',
        is_registered_rooming_house: false,
      },
    }
    const stripe = stripeHappy()
    const admin = mockAdmin({ booking: occupancyBooking, payoutRow: null })

    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.body.error).toBe('listing_payout_details_missing')
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
    expect(preflightListingTenancyDocument).not.toHaveBeenCalled()
  })

  it('confirm Listing triggers document generation with signing at accept (defer_signing=false)', async () => {
    const stripe = stripeHappy()
    const admin = mockAdmin({})

    await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(triggerListingDocumentGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: baseBooking.id,
        deferSigning: false,
      }),
    )
  })

  it('missing default payment method', async () => {
    const stripe = stripeHappy()
    stripe.customers.retrieve = vi.fn(async () => ({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    }))

    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(result.body.error).toBe('listing_billing_incomplete')
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled()
  })

  it('declined charge surfaces structured error without booking update', async () => {
    const stripe = stripeHappy()
    stripe.paymentIntents.create = vi.fn(async () => {
      throw Object.assign(new Error('Your card was declined.'), {
        code: 'card_declined',
        decline_code: 'generic_decline',
        type: 'StripeCardError',
      })
    })

    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(402)
    expect(result.body.error).toBe('charge_failed')
    const insertCalls = admin.from.mock.calls.filter((c) => c[0] === 'booking_events')
    expect(insertCalls.length).toBe(0)
  })

  it('requires_action (authentication_required)', async () => {
    const stripe = stripeHappy()
    stripe.paymentIntents.create = vi.fn(async () => {
      throw Object.assign(new Error('Authentication required'), {
        code: 'authentication_required',
        type: 'StripeCardError',
        payment_intent: {
          id: 'pi_auth',
          client_secret: 'cs_secret',
          status: 'requires_action',
        },
      })
    })

    const admin = mockAdmin({})
    const result = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(402)
    expect(result.body.requires_action).toBe(true)
    expect(result.body.client_secret).toBe('cs_secret')
  })

  it('when update matches no row but booking is already bond_pending, returns idempotent success', async () => {
    const stripe = stripeHappy()
    let maybeSingleCalls = 0
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'landlord_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { fee_exempt: false }, error: null }),
              }),
            }),
          }
        }
        if (table === 'bookings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  maybeSingleCalls += 1
                  if (maybeSingleCalls === 1) {
                    return { data: baseBooking, error: null }
                  }
                  return {
                    data: {
                      ...baseBooking,
                      status: 'bond_pending',
                      bond_window_expires_at: '2099-01-01T00:00:00.000Z',
                      listing_agreement_status: 'ready',
                    },
                    error: null,
                  }
                },
              }),
            }),
            update: () => ({
              eq: () => ({
                in: () => ({
                  select: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'booking_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'evt-1' }, error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const r = await runListingConfirmBooking({
      stripe: stripe as never,
      admin: admin as never,
      landlord,
      bookingId: baseBooking.id,
      origin: '*',
    })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.idempotent).toBe(true)
  })
})
