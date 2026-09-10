/**
 * Form R18 Item 11 payment reference. Short convention so it fits the
 * official widget. Overflow is a hard generator failure, same as Part 3.
 */
import type { PDFFont } from 'pdf-lib'

export const QLD_FORM_R18_PAYMENT_REFERENCE_FONT_SIZE = 10

export const QLD_FORM_R18_PAYMENT_REFERENCE_OVERFLOW_MESSAGE =
  'Form R18 Item 11 payment reference does not fit in the Payment reference field. The generator refused to produce the document.'

export class QldFormR18PaymentReferenceOverflowError extends Error {
  constructor(message = QLD_FORM_R18_PAYMENT_REFERENCE_OVERFLOW_MESSAGE) {
    super(message)
    this.name = 'QldFormR18PaymentReferenceOverflowError'
  }
}

export type QldFormR18PaymentReferenceBounds = { width: number; height: number }

/** Last name, else the last token of the full name. */
export function qldFormR18PaymentReferenceSurname(
  fullName: string,
  lastName?: string | null,
): string {
  const fromLast = typeof lastName === 'string' ? lastName.trim() : ''
  if (fromLast) return fromLast
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)
  return tokens[tokens.length - 1] || 'Resident'
}

/**
 * Surname plus room identifier. No address, no dash. Hyphens in a surname stay.
 */
export function formatQldFormR18PaymentReference(args: {
  fullName: string
  lastName?: string | null
  roomNumber: string
}): string {
  const surname = qldFormR18PaymentReferenceSurname(args.fullName, args.lastName)
  const room = args.roomNumber.trim()
  if (!room) return surname
  return `${surname} room ${room}`
}

export function sanitizeQldFormR18PaymentReference(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Single-line field. Do not wrap: wrapping would pass a string the widget then clips.
 * Same 10 pt Helvetica and 1 pt padding as Part 3.
 */
export function qldFormR18PaymentReferenceWouldOverflow(
  text: string,
  font: PDFFont,
  bounds: QldFormR18PaymentReferenceBounds,
  fontSize = QLD_FORM_R18_PAYMENT_REFERENCE_FONT_SIZE,
): boolean {
  const padding = 1
  const width = Math.max(1, bounds.width - padding * 2)
  return font.widthOfTextAtSize(text, fontSize) >= width
}

export function assertQldFormR18PaymentReferenceFits(
  text: string,
  font: PDFFont,
  bounds: QldFormR18PaymentReferenceBounds,
): void {
  if (!text || qldFormR18PaymentReferenceWouldOverflow(text, font, bounds)) {
    throw new QldFormR18PaymentReferenceOverflowError()
  }
}
