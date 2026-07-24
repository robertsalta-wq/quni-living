import { describe, expect, it } from 'vitest'
import { formatStripeCardOnFile, normalizeListingBillingCard } from './landlordListingBilling'

describe('normalizeListingBillingCard', () => {
  it('accepts brand + last4 strings', () => {
    expect(normalizeListingBillingCard({ brand: 'visa', last4: '4242' })).toEqual({
      brand: 'visa',
      last4: '4242',
    })
  })

  it('rejects nullish or non-string brand/last4', () => {
    expect(normalizeListingBillingCard(null)).toBeNull()
    expect(normalizeListingBillingCard({ brand: null, last4: '4242' })).toBeNull()
    expect(normalizeListingBillingCard({ brand: 'visa', last4: null })).toBeNull()
    expect(normalizeListingBillingCard({ brand: '', last4: '4242' })).toBeNull()
    expect(normalizeListingBillingCard({ brand: 'visa', last4: '' })).toBeNull()
    expect(normalizeListingBillingCard({ brand: 1, last4: '4242' })).toBeNull()
  })

  it('trims whitespace', () => {
    expect(normalizeListingBillingCard({ brand: '  visa  ', last4: ' 4242 ' })).toEqual({
      brand: 'visa',
      last4: '4242',
    })
  })
})

describe('formatStripeCardOnFile', () => {
  it('formats known brands', () => {
    expect(formatStripeCardOnFile({ brand: 'visa', last4: '4242' })).toBe('Visa •••• 4242')
    expect(formatStripeCardOnFile({ brand: 'mastercard', last4: '4444' })).toBe('Mastercard •••• 4444')
    expect(formatStripeCardOnFile({ brand: 'amex', last4: '0005' })).toBe('American Express •••• 0005')
  })

  it('title-cases unknown brands without throwing', () => {
    expect(formatStripeCardOnFile({ brand: 'foo', last4: '1111' })).toBe('Foo •••• 1111')
  })

  it('does not throw when brand is nullish — falls back to your saved card', () => {
    expect(formatStripeCardOnFile({ brand: null as unknown as string, last4: '4242' })).toBe(
      'your saved card •••• 4242',
    )
    expect(formatStripeCardOnFile({ brand: undefined as unknown as string, last4: '4242' })).toBe(
      'your saved card •••• 4242',
    )
    expect(formatStripeCardOnFile({ brand: '', last4: '4242' })).toBe('your saved card •••• 4242')
  })

  it('does not throw when card is null/undefined', () => {
    expect(formatStripeCardOnFile(null)).toBe('your saved card')
    expect(formatStripeCardOnFile(undefined)).toBe('your saved card')
  })

  it('omits last4 when missing', () => {
    expect(formatStripeCardOnFile({ brand: 'visa', last4: '' })).toBe('Visa')
  })
})
