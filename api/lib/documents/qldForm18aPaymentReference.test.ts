import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import {
  QLD_FORM_18A_PAYMENT_REFERENCE_FIELD,
  fitQldForm18aPaymentReference,
  formatQldForm18aPaymentReference,
} from './qldForm18aPaymentReference.js'

const WIDTH = QLD_FORM_18A_PAYMENT_REFERENCE_FIELD.widthPt

async function helvetica() {
  const doc = await PDFDocument.create()
  return doc.embedFont(StandardFonts.Helvetica)
}

describe('qldForm18aPaymentReference', () => {
  it('keeps a short reference and drops trailing words before cutting a word', async () => {
    const font = await helvetica()
    const full = formatQldForm18aPaymentReference(
      'Christopher Worthington-Smythe',
      '128 Mount Cotton Road, Upper Mount Gravatt, QLD, 4122',
    )
    expect(full).toBe('C Worthington-Smythe 128 Mount Cotton Rd')
    const fitted = fitQldForm18aPaymentReference(full, font, WIDTH)
    expect(fitted.endsWith(' ')).toBe(false)
    expect(fitted.split(' ').every((word) => full.split(' ').includes(word))).toBe(true)
    expect(font.widthOfTextAtSize(fitted, 10)).toBeLessThan(WIDTH - 2)
  })

  it('fits three long name and street pairs on one line', async () => {
    const font = await helvetica()
    const cases = [
      ['Alexandria Bartholomew', '45 Buckingham Palace Boulevard, Paddington, QLD, 4064', 'A Bartholomew 45 Buckingham'],
      ["Mary-Jane O'Sullivan-MacDonald", '12A Wollongong Street, South Brisbane, QLD, 4101', "M O'Sullivan-MacDonald 12A"],
      ['Jean-Luc Featherstonehaugh', '301 Upper Mount Gravatt Service Road, Mount Gravatt, QLD, 4122', 'J Featherstonehaugh 301 Upper'],
    ] as const
    for (const [name, address, expected] of cases) {
      const full = formatQldForm18aPaymentReference(name, address)
      const fitted = fitQldForm18aPaymentReference(full, font, WIDTH)
      expect(fitted).toBe(expected)
      expect(full.startsWith(`${fitted} `)).toBe(true)
      expect(font.widthOfTextAtSize(fitted, 10)).toBeLessThan(WIDTH - 2)
    }
  })

  it('shortens one oversized word on grapheme boundaries', async () => {
    const font = await helvetica()
    const word = 'W'.repeat(40)
    const fitted = fitQldForm18aPaymentReference(word, font, WIDTH)
    expect(fitted.length).toBeGreaterThan(0)
    expect(fitted.length).toBeLessThan(word.length)
    expect(word.startsWith(fitted)).toBe(true)
    expect(font.widthOfTextAtSize(fitted, 10)).toBeLessThan(WIDTH - 2)
    expect(font.widthOfTextAtSize(`${fitted}W`, 10)).toBeGreaterThanOrEqual(WIDTH - 2)
  })
})
