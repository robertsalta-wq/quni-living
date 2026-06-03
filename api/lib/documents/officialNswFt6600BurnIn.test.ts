import { describe, expect, it } from 'vitest'
import { StandardFonts } from 'pdf-lib'
import { PDFDocument } from 'pdf-lib'
import { layoutSingleLineInField } from './officialNswFt6600BurnIn.js'

describe('layoutSingleLineInField', () => {
  it('truncates long lines for narrow fields instead of wrapping', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const rect = { x: 10, y: 100, width: 88, height: 19 }
    const long = 'Phone: +61425775308 · Email: someone@example.com'
    const { line, size } = layoutSingleLineInField(long, font, rect)
    expect(size).toBeGreaterThanOrEqual(5)
    expect(line.length).toBeLessThan(long.length)
    expect(font.widthOfTextAtSize(line, size)).toBeLessThanOrEqual(88 - 6)
  })
})
