import { describe, expect, it } from 'vitest'
import { isStripeMissingCustomerError, stripeCustomerIsUsable } from './stripeMissingCustomer.js'

describe('isStripeMissingCustomerError', () => {
  it('matches resource_missing and No such customer copy', () => {
    expect(isStripeMissingCustomerError({ code: 'resource_missing' })).toBe(true)
    expect(
      isStripeMissingCustomerError({
        type: 'StripeInvalidRequestError',
        message: "No such customer: 'cus_V9pRHZGVA1ef2Z'",
      }),
    ).toBe(true)
    expect(isStripeMissingCustomerError({ message: "No such customer: 'cus_abc'" })).toBe(true)
  })

  it('does not match other Stripe errors', () => {
    expect(isStripeMissingCustomerError(null)).toBe(false)
    expect(isStripeMissingCustomerError({ code: 'card_declined' })).toBe(false)
    expect(isStripeMissingCustomerError({ message: 'Setup is not complete yet.' })).toBe(false)
  })
})

describe('stripeCustomerIsUsable', () => {
  it('rejects deleted or empty customers', () => {
    expect(stripeCustomerIsUsable(null)).toBe(false)
    expect(stripeCustomerIsUsable({ deleted: true, id: 'cus_x' })).toBe(false)
    expect(stripeCustomerIsUsable({ id: 'pm_x' })).toBe(false)
  })

  it('accepts a live Customer id', () => {
    expect(stripeCustomerIsUsable({ id: 'cus_live' })).toBe(true)
  })
})
