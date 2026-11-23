/**
 * Form 18a Item 9 payment reference.
 *
 * The AcroForm field has no MaxLen. It is one line, 167.46 pt wide and 19.03 pt high.
 * At 10 pt Helvetica the line holds 29 characters of average width (the letter n)
 * or 17 of the widest capital (W). The reference is shortened until it fits that width.
 */
import type { PDFFont } from 'pdf-lib'

export const QLD_FORM_18A_PAYMENT_REFERENCE_FONT_SIZE = 10

/** Measured on docs/qld/form18a-renamed.pdf. No /MaxLen entry. */
export const QLD_FORM_18A_PAYMENT_REFERENCE_FIELD = {
  maxLen: null,
  widthPt: 167.46,
  heightPt: 19.03,
  fontSize: QLD_FORM_18A_PAYMENT_REFERENCE_FONT_SIZE,
  averageCharactersAt10pt: 29,
  widestCapitalCharactersAt10pt: 17,
} as const

const STREET_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bStreet\b/gi, 'St'],
  [/\bRoad\b/gi, 'Rd'],
  [/\bAvenue\b/gi, 'Ave'],
  [/\bDrive\b/gi, 'Dr'],
  [/\bCourt\b/gi, 'Ct'],
  [/\bPlace\b/gi, 'Pl'],
  [/\bParade\b/gi, 'Pde'],
  [/\bCrescent\b/gi, 'Cres'],
  [/\bBoulevard\b/gi, 'Bvd'],
  [/\bLane\b/gi, 'Ln'],
  [/\bTerrace\b/gi, 'Tce'],
  [/\bHighway\b/gi, 'Hwy'],
]

export function qldForm18aPaymentReferenceName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  const initial = parts[0]![0]?.toUpperCase() ?? ''
  const surname = parts[parts.length - 1]!
  return `${initial} ${surname}`.trim()
}

export function qldForm18aShortStreet(addressLine: string): string {
  const street = addressLine.split(',')[0]?.trim() ?? ''
  let short = street
  for (const [pattern, replacement] of STREET_ABBREVIATIONS) {
    short = short.replace(pattern, replacement)
  }
  return short.replace(/\s+/g, ' ').trim()
}

/** "J Example 1 Sample St". Never a document id. */
export function formatQldForm18aPaymentReference(fullName: string, premisesAddressLine: string): string {
  const name = qldForm18aPaymentReferenceName(fullName)
  const street = qldForm18aShortStreet(premisesAddressLine)
  return [name, street].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function fits(text: string, font: PDFFont, widthPt: number): boolean {
  const usable = Math.max(1, widthPt - 2)
  return font.widthOfTextAtSize(text, QLD_FORM_18A_PAYMENT_REFERENCE_FONT_SIZE) < usable
}

/** Drop characters from the end until the single-line widget can hold the text. */
export function fitQldForm18aPaymentReference(text: string, font: PDFFont, widthPt: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (fits(cleaned, font, widthPt)) return cleaned
  let next = cleaned
  while (next.length > 1 && !fits(next, font, widthPt)) {
    next = next.slice(0, -1).trimEnd()
  }
  return next
}
