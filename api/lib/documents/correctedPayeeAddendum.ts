import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type CorrectedPayeeAddendumInput = {
  bookingReference: string
  propertyLine: string
  landlordName: string
  renterName: string
  coTenantName?: string | null
  accountName?: string | null
  bsb?: string | null
  accountNumber?: string | null
  bankName?: string | null
}

function clean(value: string | null | undefined, max = 90): string {
  return (value ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function formatPayeeBsb(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length !== 6) return clean(raw, 16)
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

export function coTenantFromBooking(raw: unknown): { fullName: string; email: string } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const fullName = typeof row.full_name === 'string' ? row.full_name.trim() : ''
  const email = typeof row.email === 'string' ? row.email.trim() : ''
  if (fullName.length < 2 || !email) return null
  return { fullName, email }
}

export function correctedAddendumHasPayee(input: CorrectedPayeeAddendumInput): boolean {
  return Boolean(clean(input.accountName) && clean(input.bsb) && clean(input.accountNumber))
}

/** Lines printed on the corrected addendum. Both parties sign it. */
export function correctedAddendumLines(input: CorrectedPayeeAddendumInput): string[] {
  const lines = [
    'Corrected addendum',
    '',
    'This addendum corrects the signed agreement for this booking. It replaces any earlier line that named a platform bank account, a platform fee, or rent paid through Quni Living.',
    '',
    `Booking ${clean(input.bookingReference, 16)}`,
    clean(input.propertyLine, 110),
    `Landlord: ${clean(input.landlordName, 80)}`,
    `Renter: ${clean(input.renterName, 80)}`,
  ]
  const co = clean(input.coTenantName, 80)
  if (co) lines.push(`Co-tenant: ${co}`)
  lines.push(
    '',
    'Quni Living is a technology platform. It is not a real estate agent and it does not provide agency, letting or property management services. It does not act for the landlord, it does not conduct a letting, and it is not a party to this agreement.',
    '',
    'No platform fee applies to this agreement.',
    '',
    'Rent is paid only to the landlord, into the account below. Rent is not paid to Quni Living. Bond is not paid to Quni Living. Where the law requires a bond, it is lodged with the state bond authority, or held by the landlord where an occupancy arrangement allows that.',
    '',
  )
  if (correctedAddendumHasPayee(input)) {
    lines.push(
      'Landlord payee',
      `Account name: ${clean(input.accountName, 80)}`,
      `BSB: ${formatPayeeBsb(input.bsb)}`,
      `Account number: ${clean(input.accountNumber, 20)}`,
    )
    const bank = clean(input.bankName, 60)
    if (bank) lines.push(`Bank: ${bank}`)
  } else {
    lines.push(
      'Payee bank details are not on file for this property. Rent is still paid only to the landlord, and not to Quni Living. Do not send this addendum for signature until the landlord account is saved on the property.',
    )
  }
  lines.push(
    '',
    'This addendum does not change the rent, the term, or who the parties are.',
    '',
    'Landlord signature',
    '{{Addendum Landlord Signature;role=First Party;type=signature}}',
    '',
    'Renter signature',
    '{{Addendum Tenant Signature;role=Second Party;type=signature}}',
  )
  if (co) {
    lines.push('', 'Co-tenant signature', '{{Addendum Co-tenant Signature;role=Co-tenant;type=signature}}')
  }
  return lines
}

function wrap(text: string, width = 92): string[] {
  if (text.length <= width) return [text]
  const words = text.split(' ')
  const rows: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > width) {
      if (current) rows.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) rows.push(current)
  return rows
}

export async function buildCorrectedPayeeAddendumPdf(
  input: CorrectedPayeeAddendumInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.1, 0.1, 0.12)
  let page = doc.addPage([595.28, 841.89])
  let y = 780

  const draw = (text: string, size: number, useBold: boolean) => {
    if (y < 72) {
      page = doc.addPage([595.28, 841.89])
      y = 780
    }
    page.drawText(text, { x: 56, y, size, font: useBold ? bold : font, color: ink })
    y -= size + 6
  }

  for (const line of correctedAddendumLines(input)) {
    if (!line) {
      y -= 8
      continue
    }
    const heading = line === 'Corrected addendum' || line.endsWith('signature') || line === 'Landlord payee'
    for (const row of wrap(line)) draw(row, heading ? 12 : 10, heading || line.startsWith('No platform fee'))
  }

  return doc.save()
}
