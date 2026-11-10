import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  TAX_INVOICE_ABN,
  TAX_INVOICE_LEGAL_NAME,
  TAX_INVOICE_TRADING_AS,
  formatAudFromCents,
  LEASE_MONTH_EX_GST_CENTS,
} from '../../../src/lib/pricing/leaseCharge.js'

export type LeaseTaxInvoiceInput = {
  invoiceDateIso: string
  bookingReference: string
  roomLine: string
  /** Months on the lease charge before credit. */
  months: number
  creditMonths: number
  exGstCents: number
  gstCents: number
  totalCents: number
  /** Flexible lease, or a fixed lease that has rolled on. */
  repeatsEveryThreeMonths?: boolean
}

function money(cents: number): string {
  return formatAudFromCents(cents)
}

/** One-page tax invoice. Amounts are the net charged after room credit. */
export async function buildLeaseTaxInvoicePdf(input: LeaseTaxInvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.1, 0.1, 0.12)
  let y = 780

  const safe = (value: string, max = 90) =>
    value.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

  const draw = (text: string, size: number, useBold = false) => {
    page.drawText(safe(text, 96), { x: 56, y, size, font: useBold ? bold : font, color: ink })
    y -= size + 8
  }

  draw('Tax invoice', 22, true)
  y -= 6
  draw(`${TAX_INVOICE_LEGAL_NAME} t/a ${TAX_INVOICE_TRADING_AS}`, 12, true)
  draw(`ABN ${TAX_INVOICE_ABN}`, 11)
  draw(`Date: ${safe(input.invoiceDateIso, 20)}`, 11)
  draw(`Booking: ${safe(input.bookingReference, 40)}`, 11)
  draw(`Room: ${safe(input.roomLine, 80)}`, 11)
  y -= 10
  const monthRate = money(LEASE_MONTH_EX_GST_CENTS)
  const grossEx = input.months * LEASE_MONTH_EX_GST_CENTS
  draw(`${input.months} months x ${monthRate}`, 12, true)
  draw(money(grossEx), 12)
  if (input.creditMonths > 0) {
    const creditEx = input.creditMonths * LEASE_MONTH_EX_GST_CENTS
    draw(`Room credit: ${input.creditMonths} months`, 12)
    draw(`-${money(creditEx)}`, 12)
  }
  y -= 6
  draw(`Subtotal (ex GST): ${money(input.exGstCents)}`, 12)
  draw(`GST (10%): ${money(input.gstCents)}`, 12)
  draw(`Total (incl. GST): ${money(input.totalCents)}`, 14, true)
  y -= 12
  draw('Renters pay Quni Living nothing. This invoice is for the landlord lease fee only.', 10)
  if (input.repeatsEveryThreeMonths) {
    draw('This charge repeats every 3 months until the tenancy ends.', 10)
  }
  draw('Room credit is not a cash refund.', 10)

  return doc.save()
}
