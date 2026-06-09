import { describe, expect, it } from 'vitest'
import { item9RentPaymentMethodPair } from './qldForm18aRentPayment.js'

describe('item9RentPaymentMethodPair', () => {
  it('bank_transfer describes EFT and over-the-counter', () => {
    const p = item9RentPaymentMethodPair('bank_transfer')
    expect(p.method1).toMatch(/Electronic funds transfer/i)
    expect(p.method2).toMatch(/Over-the-counter/i)
  })

  it('quni_platform describes platform and direct credit', () => {
    const p = item9RentPaymentMethodPair('quni_platform')
    expect(p.method1).toMatch(/Quni Living platform/i)
    expect(p.method2).toMatch(/Direct credit/i)
  })
})
