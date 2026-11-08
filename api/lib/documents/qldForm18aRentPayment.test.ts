import { describe, expect, it } from 'vitest'
import { buildRtaRentPaymentMethodLine } from '../platformConfig.js'
import { item9RentPaymentMethodPair } from './qldForm18aRentPayment.js'

describe('buildRtaRentPaymentMethodLine', () => {
  it('prints the landlord account and no Quni payment method', () => {
    const line = buildRtaRentPaymentMethodLine({
      bsb: '062000',
      accountNumber: '11223344',
      accountName: 'Quinn Lee',
      bankName: 'Commonwealth Bank',
    })
    expect(line).toContain('Quinn Lee')
    expect(line).toContain('062-000')
    expect(line).toContain('11223344')
    expect(line).not.toContain('Quni')
  })
})

describe('item9RentPaymentMethodPair', () => {
  it('bank_transfer describes EFT and over-the-counter', () => {
    const p = item9RentPaymentMethodPair('bank_transfer')
    expect(p.method1).toMatch(/Electronic funds transfer/i)
    expect(p.method2).toMatch(/Over-the-counter/i)
  })

  it('does not offer a Quni payment method', () => {
    const p = item9RentPaymentMethodPair('quni_platform')
    expect(p.method1).toMatch(/Electronic funds transfer/i)
    expect(`${p.method1} ${p.method2}`).not.toMatch(/Quni Living platform/i)
  })
})
