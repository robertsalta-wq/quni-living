/**
 * Fill the frozen CAV rooming house agreement.
 * LibreOffice did not keep the Word form fields, so values are drawn on the blank lines.
 * Prescribed sentences are not rewritten.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import {
  vicRoomingPaymentDetailsLine,
  type VicRoomingConditionReport,
  type VicRoomingPayMethods,
} from '../tenancy/vicRoomingHouse.js'

export const VIC_ROOMING_HOUSE_FORM_REFERENCE = {
  title: 'Rooming house agreement',
  citation: 'Residential Tenancies Amendment Act 2018 Section 93A(2(b)',
  regulation: 'Residential Tenancies Regulations 2021 Regulation 38',
  coreModified: '2026-05-07T05:18:00Z',
  sourceSha256: 'f746b28342c4e6d74f43b824d57f2f78a55421c3545f84369903f43eb91d79e1',
  blankSha256: '6c4b5150f7c93f01b75124d1d4823a6993d523a63e96c37a2a0d069ed5d7ba8e',
  pageCount: 9,
} as const

const TEMPLATE = join(process.cwd(), 'docs/vic/rooming-house-agreement-blank.pdf')

export type VicRoomingHouseFillProps = {
  agreementDateLabel: string
  roomNumber: string
  streetAddress: string
  suburb: string
  postcode: string
  itemsLetWithRoom: string
  operatorName: string
  operatorAddress: string
  operatorPostcode: string
  operatorPhone: string
  operatorAbn: string
  operatorEmail: string
  resident1Name: string
  resident1Address: string
  resident1Postcode: string
  resident1Phone: string
  resident1Email: string
  resident2Name: string
  resident2Address: string
  resident2Postcode: string
  resident2Phone: string
  resident2Email: string
  startDateLabel: string
  endDateLabel: string
  weeklyRent: string
  rentDueDay: string
  firstRentDueLabel: string
  bondAmount: string
  bondDueLabel: string
  pay: VicRoomingPayMethods
  bankAccountName: string
  bankBsb: string
  bankAccountNumber: string
  operatorAcceptsElectronicService: boolean
  residentAcceptsElectronicService: boolean | null
  urgentContactName: string
  urgentContactPhone: string
  urgentContactEmail: string
  conditionReport: VicRoomingConditionReport
  /** Real agreements keep DocuSeal text tags. The public sample leaves the boxes empty. */
  signingTags?: boolean
}

const INK = rgb(0.1, 0.1, 0.12)
const PAPER = rgb(1, 1, 1)

type Box = { x: number; y: number; w: number; h: number }

/** Boxes measured from the frozen blank. y is the bottom edge, in PDF points. */
const BOX = {
  startDate: { x: 255.2, y: 349.9, w: 108, h: 17.6 },
  endDate: { x: 419.2, y: 349.9, w: 108.8, h: 17.6 },
  week: { x: 172, y: 265.9, w: 9.6, h: 8.8 },
  directDebit: { x: 55.2, y: 594.7, w: 9.6, h: 9.6 },
  bankDeposit: { x: 156, y: 594.7, w: 9.6, h: 9.6 },
  cash: { x: 253.6, y: 594.7, w: 10.4, h: 9.6 },
  cheque: { x: 321.6, y: 594.7, w: 10.4, h: 9.6 },
  bpay: { x: 477.6, y: 594.7, w: 9.6, h: 9.6 },
  otherEft: { x: 55.2, y: 575.5, w: 9.6, h: 8.8 },
  operatorServiceYes: { x: 66.4, y: 257.1, w: 10.4, h: 9.6 },
  operatorServiceNo: { x: 71.2, y: 230.7, w: 10.4, h: 9.6 },
  operatorServiceEmail: { x: 298.8, y: 244.8, w: 230.4, h: 31.4 },
  residentServiceYes: { x: 66.4, y: 152.3, w: 10.4, h: 8.8 },
  residentServiceNo: { x: 71.2, y: 125.9, w: 10.4, h: 8.8 },
  residentServiceEmail: { x: 298.8, y: 139.4, w: 230.4, h: 31.9 },
  urgentPhone: { x: 170.4, y: 744.3, w: 131.2, h: 16.8 },
  urgentEmail: { x: 170.4, y: 721.9, w: 392, h: 17.6 },
  conditionProvided: { x: 40.8, y: 532.3, w: 10.4, h: 8.8 },
  conditionWill: { x: 40.8, y: 509.1, w: 10.4, h: 8.8 },
  operatorSignature: { x: 150.4, y: 717.1, w: 234.4, h: 29.6 },
  operatorSignDate: { x: 150.4, y: 695.5, w: 114.4, h: 16.8 },
  residentSignature: { x: 150.4, y: 629.1, w: 234.4, h: 28.8 },
  residentSignDate: { x: 150.4, y: 606.7, w: 114.4, h: 17.6 },
  resident2Signature: { x: 150.4, y: 568.3, w: 234.4, h: 28 },
  resident2SignDate: { x: 150.4, y: 545.9, w: 114.4, h: 16.8 },
} as const satisfies Record<string, Box>

function draw(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size = 9) {
  const value = text.replace(/\s+/g, ' ').trim()
  if (!value) return
  page.drawText(value.slice(0, 180), { x, y, size, font, color: INK })
}

function drawInBox(page: PDFPage, font: PDFFont, text: string, box: Box, size = 9) {
  const value = text.replace(/\s+/g, ' ').trim()
  if (!value) return
  const y = box.y + Math.max(3, (box.h - size) / 2)
  page.drawText(value.slice(0, 180), { x: box.x + 4, y, size, font, color: INK })
}

function tickBox(page: PDFPage, font: PDFFont, box: Box) {
  const size = 8
  const glyph = font.widthOfTextAtSize('X', size)
  const x = box.x + (box.w - glyph) / 2
  const y = box.y + (box.h - size * 0.72) / 2
  page.drawText('X', { x, y, size, font, color: INK })
}

function signingTag(label: string, role: string, type: 'signature' | 'date', box: Box): string {
  const width = Math.round(box.w - 6)
  const height = Math.round(box.h - 4)
  return `{{${label};role=${role};type=${type};width=${width};height=${height}}}`
}

/** White so the draft boxes stay empty. DocuSeal still reads the tag and uses its width and height. */
function drawSigningTag(page: PDFPage, font: PDFFont, tag: string, box: Box) {
  page.drawText(tag, { x: box.x + 3, y: box.y + 3, size: 6, font, color: PAPER })
}

/** The frozen form wraps OFFICIAL onto a second line. Cover that and draw the same word once. */
function repairOfficialFooter(page: PDFPage, font: PDFFont) {
  page.drawRectangle({ x: 505, y: 0, width: 91, height: 32, color: PAPER })
  const word = 'OFFICIAL'
  const size = 11
  const width = font.widthOfTextAtSize(word, size)
  page.drawText(word, { x: 586 - width, y: 17.6, size, font, color: rgb(0, 0, 0) })
}

export function loadOfficialVicRoomingHouseTemplate(): Promise<PDFDocument> {
  return PDFDocument.load(readFileSync(TEMPLATE))
}

export async function fillOfficialVicRoomingHousePdf(
  props: VicRoomingHouseFillProps,
): Promise<{ pdfBytes: Uint8Array }> {
  const doc = await loadOfficialVicRoomingHouseTemplate()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const footerFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = doc.getPages()
  for (const page of pages) repairOfficialFooter(page, footerFont)
  const placeTags = props.signingTags !== false
  const p1 = pages[0]
  const p2 = pages[1]
  const p3 = pages[2]
  const p4 = pages[3]
  const p5 = pages[4]

  draw(p1, font, props.agreementDateLabel, 48, 590)
  draw(p1, font, props.roomNumber, 125, 493)
  draw(p1, font, props.streetAddress, 255, 493)
  draw(p1, font, props.suburb, 95, 477)
  draw(p1, font, props.postcode, 455, 477)
  draw(p1, font, props.itemsLetWithRoom, 43, 430, 8)
  draw(p1, font, props.operatorName, 160, 112)
  draw(p1, font, props.operatorAddress, 180, 90)
  draw(p1, font, props.operatorPostcode, 510, 90)

  draw(p2, font, props.operatorPhone, 160, 801)
  draw(p2, font, props.operatorAbn, 180, 779)
  draw(p2, font, props.operatorEmail, 160, 757)
  draw(p2, font, props.resident1Name, 180, 563)
  draw(p2, font, props.resident1Address, 160, 541)
  draw(p2, font, props.resident1Postcode, 510, 541)
  draw(p2, font, props.resident1Phone, 160, 519)
  draw(p2, font, props.resident1Email, 160, 497)
  if (props.resident2Name.trim()) {
    draw(p2, font, props.resident2Name, 180, 475)
    draw(p2, font, props.resident2Address, 160, 452)
    draw(p2, font, props.resident2Postcode, 510, 452)
    draw(p2, font, props.resident2Phone, 160, 430)
    draw(p2, font, props.resident2Email, 160, 408)
  }
  drawInBox(p2, font, props.startDateLabel, BOX.startDate)
  drawInBox(p2, font, props.endDateLabel, BOX.endDate)
  draw(p2, font, props.weeklyRent, 200, 310)
  tickBox(p2, font, BOX.week)
  draw(p2, font, props.rentDueDay, 180, 247)
  draw(p2, font, props.firstRentDueLabel, 220, 211)

  draw(p3, font, props.bondAmount, 180, 782)
  draw(p3, font, props.bondDueLabel, 200, 747)
  if (props.pay.directDebit) tickBox(p3, font, BOX.directDebit)
  if (props.pay.bankDeposit) tickBox(p3, font, BOX.bankDeposit)
  if (props.pay.cash) tickBox(p3, font, BOX.cash)
  if (props.pay.cheque) tickBox(p3, font, BOX.cheque)
  if (props.pay.bpay) tickBox(p3, font, BOX.bpay)
  if (props.pay.otherEft) tickBox(p3, font, BOX.otherEft)
  draw(
    p3,
    font,
    vicRoomingPaymentDetailsLine(props.pay, {
      accountName: props.bankAccountName,
      bsb: props.bankBsb,
      accountNumber: props.bankAccountNumber,
    }),
    43,
    520,
    8,
  )
  if (props.operatorAcceptsElectronicService) {
    tickBox(p3, font, BOX.operatorServiceYes)
    drawInBox(p3, font, props.operatorEmail, BOX.operatorServiceEmail, 8)
  } else {
    tickBox(p3, font, BOX.operatorServiceNo)
  }
  if (props.residentAcceptsElectronicService === true) {
    tickBox(p3, font, BOX.residentServiceYes)
    drawInBox(p3, font, props.resident1Email, BOX.residentServiceEmail, 8)
  } else if (props.residentAcceptsElectronicService === false) {
    tickBox(p3, font, BOX.residentServiceNo)
  }

  draw(p4, font, props.urgentContactName, 200, 771)
  drawInBox(p4, font, props.urgentContactPhone, BOX.urgentPhone)
  drawInBox(p4, font, props.urgentContactEmail, BOX.urgentEmail)
  if (props.conditionReport === 'provided') tickBox(p4, font, BOX.conditionProvided)
  if (props.conditionReport === 'will_be_provided') tickBox(p4, font, BOX.conditionWill)

  if (placeTags) {
    drawSigningTag(p5, font, signingTag('Operator Signature', 'First Party', 'signature', BOX.operatorSignature), BOX.operatorSignature)
    drawSigningTag(p5, font, signingTag('Operator Sign Date', 'First Party', 'date', BOX.operatorSignDate), BOX.operatorSignDate)
    drawSigningTag(p5, font, signingTag('Resident Signature', 'Second Party', 'signature', BOX.residentSignature), BOX.residentSignature)
    drawSigningTag(p5, font, signingTag('Resident Sign Date', 'Second Party', 'date', BOX.residentSignDate), BOX.residentSignDate)
    if (props.resident2Name.trim()) {
      drawSigningTag(
        p5,
        font,
        signingTag('Resident 2 Signature', 'Co-tenant', 'signature', BOX.resident2Signature),
        BOX.resident2Signature,
      )
      drawSigningTag(
        p5,
        font,
        signingTag('Resident 2 Sign Date', 'Co-tenant', 'date', BOX.resident2SignDate),
        BOX.resident2SignDate,
      )
    }
  }

  const pdfBytes = await doc.save()
  return { pdfBytes }
}

export async function buildVicRoomingHouseRulesPdf(args: {
  premisesLine: string
  rules: string
  signer?: { role: 'Second Party' | 'Co-tenant'; signatureName: string; dateName: string }
}): Promise<Uint8Array> {
  const signer = args.signer ?? {
    role: 'Second Party' as const,
    signatureName: 'Resident House Rules Signature',
    dateName: 'Resident House Rules Date',
  }
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595.3, 841.89])
  page.drawText('Rooming house rules', { x: 48, y: 780, size: 16, font: bold, color: INK })
  page.drawText(args.premisesLine.slice(0, 140), { x: 48, y: 756, size: 10, font, color: INK })
  const words = args.rules.replace(/\s+/g, ' ').trim().split(' ')
  let line = ''
  let y = 720
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, 10) > 500) {
      page.drawText(line, { x: 48, y, size: 10, font, color: INK })
      line = word
      y -= 14
      if (y < 160) break
    } else {
      line = next
    }
  }
  if (line && y >= 160) page.drawText(line, { x: 48, y, size: 10, font, color: INK })
  page.drawText('I have been given these house rules.', { x: 48, y: 120, size: 10, font, color: INK })
  page.drawLine({ start: { x: 48, y: 94 }, end: { x: 260, y: 94 }, thickness: 0.6, color: INK })
  page.drawLine({ start: { x: 48, y: 76 }, end: { x: 180, y: 76 }, thickness: 0.6, color: INK })
  page.drawText(
    `{{${signer.signatureName};role=${signer.role};type=signature;width=180;height=28}}`,
    { x: 48, y: 96, size: 6, font, color: PAPER },
  )
  page.drawText(`{{${signer.dateName};role=${signer.role};type=date;width=120;height=16}}`, {
    x: 48,
    y: 78,
    size: 6,
    font,
    color: PAPER,
  })
  return doc.save()
}
