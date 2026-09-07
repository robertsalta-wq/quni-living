/**
 * Form R18 Part 3 special terms. Locked copy. Overflow is a hard generator failure.
 */
import type { PDFFont } from 'pdf-lib'

export const QLD_FORM_R18_PART3_SPECIAL_TERMS = [
  'Quni Living',
  '',
  "1. Quni Living is a business name of Quinnvestments Pty Ltd ABN 65 675 990 968. The provider used the Quni Living platform to advertise the room, verify the resident's identity, and produce this agreement.",
  '',
  "2. Quni Living is not the provider, is not a party to this agreement, and is not the provider's agent. Quni Living is not named at item 3 and does not sign this agreement.",
  '',
  '3. The provider remains responsible for complying with the Residential Tenancies and Rooming Accommodation Act 2008 and with this agreement.',
  '',
  '4. The provider pays Quni Living a one-off platform fee. That fee is a matter between the provider and Quni Living. It does not increase the rent payable by the resident, and the resident owes Quni Living nothing under this agreement.',
  '',
  '5. Quni Living is not a party to any dispute between the provider and the resident, does not represent either of them, and takes no part in proceedings before the tribunal.',
  '',
  '6. Quni Living handles personal information in accordance with its privacy policy at quni.com.au/privacy.',
  '',
  '7. These special terms are subject to the Act and to the standard terms in Part 2. Anything in them that is inconsistent with the Act or with a standard term does not apply.',
].join('\n')

export const QLD_FORM_R18_PART3_OVERFLOW_MESSAGE =
  'Form R18 Part 3 special terms do not fit in the Special terms field. The generator refused to produce the document.'

export class QldFormR18Part3OverflowError extends Error {
  constructor(message = QLD_FORM_R18_PART3_OVERFLOW_MESSAGE) {
    super(message)
    this.name = 'QldFormR18Part3OverflowError'
  }
}

export type QldFormR18Part3Bounds = { width: number; height: number }

/**
 * Same wrap and line-height as pdf-lib multiline appearance at 10 pt Helvetica.
 * Any line whose baseline would sit below the widget is overflow.
 */
export function qldFormR18Part3WouldOverflow(
  text: string,
  font: PDFFont,
  bounds: QldFormR18Part3Bounds,
  fontSize = 10,
): boolean {
  const padding = 1
  const width = Math.max(1, bounds.width - padding * 2)
  const height = Math.max(1, bounds.height - padding * 2)
  const glyphHeight = font.heightAtSize(fontSize)
  const lineHeight = glyphHeight + glyphHeight * 0.2
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  let y = height
  for (const paragraph of paragraphs) {
    const chunks = wrapPdfLibStyleLines(paragraph, font, fontSize, width)
    for (const _chunk of chunks) {
      y -= lineHeight
      if (y < 0) return true
    }
  }
  return false
}

function wrapPdfLibStyleLines(input: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (input.length === 0) return ['']
  const lines: string[] = []
  let rest: string | undefined = input
  while (rest !== undefined) {
    const { line, remainder } = splitOutLine(rest, font, fontSize, maxWidth)
    lines.push(line)
    rest = remainder === undefined ? undefined : remainder.trim() || undefined
    if (remainder === undefined) break
    if (remainder === rest && line === rest) {
      lines.push(rest)
      break
    }
  }
  return lines
}

function splitOutLine(
  input: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): { line: string; remainder: string | undefined } {
  let lastWs = input.length
  while (lastWs > 0) {
    const line = input.substring(0, lastWs)
    if (font.widthOfTextAtSize(line, fontSize) < maxWidth) {
      const remainder = input.substring(lastWs) || undefined
      return { line, remainder }
    }
    let next = -1
    for (let i = line.length - 1; i > 0; i--) {
      if (/\s/.test(line[i] ?? '')) {
        next = i
        break
      }
    }
    lastWs = next > 0 ? next : 0
  }
  return { line: input, remainder: undefined }
}

export function assertQldFormR18Part3Fits(
  text: string,
  font: PDFFont,
  bounds: QldFormR18Part3Bounds,
): void {
  if (qldFormR18Part3WouldOverflow(text, font, bounds)) {
    throw new QldFormR18Part3OverflowError()
  }
}
