import { describe, expect, it } from 'vitest'
import { PDFParse } from 'pdf-parse'
import {
  buildCorrectedPayeeAddendumPdf,
  correctedAddendumHasPayee,
  correctedAddendumLines,
} from './correctedPayeeAddendum.js'

const input = {
  bookingReference: 'ffbbdb02',
  propertyLine: 'Unit 406/311 Hume Highway',
  landlordName: 'Quinn Lee',
  renterName: 'Kim Grantham',
  accountName: 'Quinn Lee',
  bsb: '732080',
  accountNumber: '511145',
  bankName: 'Example Bank',
}

describe('corrected payee addendum', () => {
  it('states there is no platform fee and prints the landlord account', () => {
    const text = correctedAddendumLines(input).join('\n')
    expect(text).toContain('No platform fee applies to this agreement.')
    expect(text).toContain('Rent is paid only to the landlord')
    expect(text).toContain('Account name: Quinn Lee')
    expect(text).toContain('BSB: 732-080')
    expect(text).toContain('Account number: 511145')
    expect(text).not.toContain('823175945')
    expect(correctedAddendumHasPayee(input)).toBe(true)
  })

  it('refuses a complete payee when the account is missing', () => {
    expect(correctedAddendumHasPayee({ ...input, accountNumber: '' })).toBe(false)
  })

  it('renders a PDF a person can read', async () => {
    const bytes = await buildCorrectedPayeeAddendumPdf(input)
    const parsed = new PDFParse({ data: Buffer.from(bytes) })
    const text = (await parsed.getText()).text
    expect(text).toContain('No platform fee applies')
    expect(text).toContain('511145')
    expect(text).not.toContain('823175945')
  })
})
