import { describe, expect, it } from 'vitest'
import {
  LEASE_MONTH_EX_GST_CENTS,
  LEASE_QUARTER_EX_GST_CENTS,
  amountsAfterCredit,
  formatAudFromCents,
  quoteForLeaseLength,
  unusedWholeMonths,
} from './leaseCharge'

describe('lease charge price', () => {
  it('maps the lease menu to months including GST', () => {
    expect(quoteForLeaseLength('3 months')).toMatchObject({
      months: 3,
      exGstCents: 1500,
      gstCents: 150,
      inclGstCents: 1650,
      cadence: 'once',
    })
    expect(quoteForLeaseLength('6 months')?.inclGstCents).toBe(3300)
    expect(quoteForLeaseLength('12 months')?.inclGstCents).toBe(6600)
    expect(quoteForLeaseLength('2 years')?.inclGstCents).toBe(13200)
    expect(quoteForLeaseLength('Flexible')).toMatchObject({
      months: 3,
      exGstCents: LEASE_QUARTER_EX_GST_CENTS,
      inclGstCents: 1650,
      cadence: 'every_3_months',
    })
  })

  it('uses $5 ex GST as the only month rate', () => {
    const six = quoteForLeaseLength('6 months')
    expect(six?.exGstCents).toBe(6 * LEASE_MONTH_EX_GST_CENTS)
    expect(quoteForLeaseLength('not a lease')).toBeNull()
  })

  it('spends whole unused months before charging the next lease', () => {
    expect(amountsAfterCredit(6, 2)).toMatchObject({
      creditMonths: 2,
      exGstCents: 2000,
      gstCents: 200,
      chargedCents: 2200,
    })
    expect(amountsAfterCredit(3, 4).chargedCents).toBe(0)
    expect(amountsAfterCredit(3, 4).creditMonths).toBe(3)
  })

  it('credits only whole unused months', () => {
    expect(unusedWholeMonths(6, '2026-01-01', '2026-03-15')).toBe(3)
    expect(unusedWholeMonths(6, '2026-01-01', '2026-01-01')).toBe(6)
    expect(unusedWholeMonths(6, '2026-01-01', '2027-01-01')).toBe(0)
  })

  it('formats inclusive totals', () => {
    expect(formatAudFromCents(1650)).toBe('$16.50')
    expect(formatAudFromCents(3300)).toBe('$33.00')
    expect(formatAudFromCents(6600)).toBe('$66.00')
    expect(formatAudFromCents(13200)).toBe('$132.00')
  })
})
