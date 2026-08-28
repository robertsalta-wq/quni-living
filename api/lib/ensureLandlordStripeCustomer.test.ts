import { describe, expect, it, vi } from 'vitest'
import { ensureLandlordStripeCustomer } from './ensureLandlordStripeCustomer.js'

function adminThatSaves(id: string) {
  return {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: { stripe_customer_id: id }, error: null }),
          }),
        }),
      }),
    }),
  }
}

const profile = {
  id: 'lp1',
  stripe_customer_id: 'cus_V9pRHZGVA1ef2Z',
  email: 'bill@example.com',
  first_name: 'Bill',
  last_name: 'S',
}
const user = { id: 'u1', email: 'bill@example.com' }

describe('ensureLandlordStripeCustomer', () => {
  it('reuses a Customer that still exists', async () => {
    const stripe = {
      customers: {
        retrieve: vi.fn(async () => ({ id: 'cus_V9pRHZGVA1ef2Z' })),
        create: vi.fn(),
      },
    }
    const result = await ensureLandlordStripeCustomer({
      stripe,
      admin: adminThatSaves('unused'),
      profile,
      user,
    })
    expect(result).toEqual({ ok: true, customerId: 'cus_V9pRHZGVA1ef2Z' })
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it('creates and persists a new Customer when Stripe says the stored id is missing', async () => {
    const stripe = {
      customers: {
        retrieve: vi.fn(async () => {
          const err = new Error("No such customer: 'cus_V9pRHZGVA1ef2Z'")
          Object.assign(err, { code: 'resource_missing', type: 'StripeInvalidRequestError' })
          throw err
        }),
        create: vi.fn(async () => ({ id: 'cus_new' })),
      },
    }
    const result = await ensureLandlordStripeCustomer({
      stripe,
      admin: adminThatSaves('cus_new'),
      profile,
      user,
    })
    expect(result).toEqual({ ok: true, customerId: 'cus_new' })
    expect(stripe.customers.create).toHaveBeenCalledOnce()
  })

  it('replaces a deleted Customer', async () => {
    const stripe = {
      customers: {
        retrieve: vi.fn(async () => ({ id: 'cus_old', deleted: true })),
        create: vi.fn(async () => ({ id: 'cus_new' })),
      },
    }
    const result = await ensureLandlordStripeCustomer({
      stripe,
      admin: adminThatSaves('cus_new'),
      profile: { ...profile, stripe_customer_id: 'cus_old' },
      user,
    })
    expect(result).toEqual({ ok: true, customerId: 'cus_new' })
  })
})
