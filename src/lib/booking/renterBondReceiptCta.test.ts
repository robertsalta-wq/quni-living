import { describe, expect, it } from 'vitest'
import {
  bookingHasBondReceiptDocument,
  renterBondReceiptDownloadVisible,
} from './renterBondReceiptCta'

describe('renterBondReceiptDownloadVisible', () => {
  it('shows CTA when receipt exists and status allows download', () => {
    expect(
      renterBondReceiptDownloadVisible({ bookingStatus: 'confirmed', hasBondReceipt: true }),
    ).toBe(true)
    expect(renterBondReceiptDownloadVisible({ bookingStatus: 'active', hasBondReceipt: true })).toBe(
      true,
    )
    expect(
      renterBondReceiptDownloadVisible({ bookingStatus: 'completed', hasBondReceipt: true }),
    ).toBe(true)
  })

  it('hides CTA when receipt is absent (audit #5)', () => {
    expect(
      renterBondReceiptDownloadVisible({ bookingStatus: 'confirmed', hasBondReceipt: false }),
    ).toBe(false)
    expect(renterBondReceiptDownloadVisible({ bookingStatus: 'active', hasBondReceipt: false })).toBe(
      false,
    )
  })

  it('hides CTA for bond_pending even if a row somehow exists', () => {
    expect(
      renterBondReceiptDownloadVisible({ bookingStatus: 'bond_pending', hasBondReceipt: true }),
    ).toBe(false)
  })
})

describe('bookingHasBondReceiptDocument', () => {
  it('detects bond_receipt rows', () => {
    expect(bookingHasBondReceiptDocument([{ document_type: 'residential_tenancy' }])).toBe(false)
    expect(
      bookingHasBondReceiptDocument([
        { document_type: 'residential_tenancy' },
        { document_type: 'bond_receipt' },
      ]),
    ).toBe(true)
  })
})
