import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  formatQldFormR18PaymentReference,
  qldFormR18PaymentReferenceSurname,
  qldFormR18PaymentReferenceWouldOverflow,
  sanitizeQldFormR18PaymentReference,
} from './qldFormR18PaymentReference.js'

describe('qldFormR18PaymentReference', () => {
  it('uses last name, else the last token of the full name', () => {
    expect(qldFormR18PaymentReferenceSurname('Robert Resident', 'Resident')).toBe('Resident')
    expect(qldFormR18PaymentReferenceSurname('Robert Resident')).toBe('Resident')
    expect(qldFormR18PaymentReferenceSurname('Mary Smith-Jones')).toBe('Smith-Jones')
  })

  it('formats surname plus room with no dash and no address', () => {
    expect(
      formatQldFormR18PaymentReference({
        fullName: 'Robert Resident',
        lastName: 'Resident',
        roomNumber: '1',
      }),
    ).toBe('Resident room 1')
    expect(
      formatQldFormR18PaymentReference({
        fullName: 'Mary Smith-Jones',
        roomNumber: '1A',
      }),
    ).toBe('Smith-Jones room 1A')
  })

  it('keeps hyphens in the surname when sanitising', () => {
    expect(sanitizeQldFormR18PaymentReference('Smith-Jones room 1')).toBe('Smith-Jones room 1')
  })

  it('treats a string wider than the widget as overflow', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const bounds = { width: 206.17, height: 18.389 }
    expect(qldFormR18PaymentReferenceWouldOverflow('Resident room 1', font, bounds)).toBe(false)
    expect(qldFormR18PaymentReferenceWouldOverflow('W'.repeat(80), font, bounds)).toBe(true)
  })
})
