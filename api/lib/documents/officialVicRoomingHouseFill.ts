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
}

const INK = rgb(0.1, 0.1, 0.12)

function draw(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size = 9) {
  const value = text.replace(/\s+/g, ' ').trim()
  if (!value) return
  page.drawText(value.slice(0, 180), { x, y, size, font, color: INK })
}

function tick(page: PDFPage, font: PDFFont, x: number, y: number) {
  page.drawText('X', { x, y, size: 11, font, color: INK })
}

export function loadOfficialVicRoomingHouseTemplate(): Promise<PDFDocument> {
  return PDFDocument.load(readFileSync(TEMPLATE))
}

export async function fillOfficialVicRoomingHousePdf(
  props: VicRoomingHouseFillProps,
): Promise<{ pdfBytes: Uint8Array }> {
  const doc = await loadOfficialVicRoomingHouseTemplate()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
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
  draw(p2, font, props.startDateLabel, 209, 340)
  draw(p2, font, props.endDateLabel, 377, 340)
  draw(p2, font, props.weeklyRent, 200, 310)
  tick(p2, font, 168, 267)
  draw(p2, font, props.rentDueDay, 180, 247)
  draw(p2, font, props.firstRentDueLabel, 220, 211)

  draw(p3, font, props.bondAmount, 180, 782)
  draw(p3, font, props.bondDueLabel, 200, 747)
  if (props.pay.directDebit) tick(p3, font, 52, 596)
  if (props.pay.bankDeposit) tick(p3, font, 152, 596)
  if (props.pay.cash) tick(p3, font, 250, 596)
  if (props.pay.cheque) tick(p3, font, 318, 596)
  if (props.pay.bpay) tick(p3, font, 474, 596)
  if (props.pay.otherEft) tick(p3, font, 52, 576)
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
    tick(p3, font, 64, 262)
    draw(p3, font, props.operatorEmail, 280, 256, 8)
  } else {
    tick(p3, font, 64, 232)
  }
  if (props.residentAcceptsElectronicService === true) {
    tick(p3, font, 64, 157)
    draw(p3, font, props.resident1Email, 280, 151, 8)
  } else if (props.residentAcceptsElectronicService === false) {
    tick(p3, font, 64, 127)
  }

  draw(p4, font, props.urgentContactName, 200, 771)
  draw(p4, font, props.urgentContactPhone, 160, 749)
  draw(p4, font, props.urgentContactEmail, 160, 727)
  if (props.conditionReport === 'provided') tick(p4, font, 40, 533)
  if (props.conditionReport === 'will_be_provided') tick(p4, font, 40, 510)

  draw(p5, font, '{{Operator Signature;role=First Party;type=signature}}', 200, 728, 8)
  draw(p5, font, '{{Operator Sign Date;role=First Party;type=date}}', 120, 700, 8)
  draw(p5, font, '{{Resident Signature;role=Second Party;type=signature}}', 200, 640, 8)
  draw(p5, font, '{{Resident Sign Date;role=Second Party;type=date}}', 120, 611, 8)
  if (props.resident2Name.trim()) {
    draw(p5, font, '{{Resident 2 Signature;role=Co-tenant;type=signature}}', 200, 579, 8)
    draw(p5, font, '{{Resident 2 Sign Date;role=Co-tenant;type=date}}', 120, 550, 8)
  }

  const pdfBytes = await doc.save()
  return { pdfBytes }
}

export async function buildVicRoomingHouseRulesPdf(args: {
  premisesLine: string
  rules: string
}): Promise<Uint8Array> {
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
  page.drawText('{{Resident House Rules Signature;role=Second Party;type=signature}}', {
    x: 48,
    y: 96,
    size: 9,
    font,
    color: INK,
  })
  page.drawText('{{Resident House Rules Date;role=Second Party;type=date}}', {
    x: 48,
    y: 78,
    size: 9,
    font,
    color: INK,
  })
  return doc.save()
}
