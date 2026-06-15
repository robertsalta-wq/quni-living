/**
 * Production fill for VIC CAV Form 1 on the frozen blank PDF (M2 overlay).
 * Coordinate authority: docs/vic/vic-form1-coordinate-map.json
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import type { QldGeneralTenancyAgreementProps } from '../../documents/rtaTypes.js'
import { layoutSingleLineInField } from './officialNswFt6600BurnIn.js'

export const OFFICIAL_VIC_FORM1_BLANK_REL = join('docs', 'vic', 'form-1-blank.pdf')
export const OFFICIAL_VIC_FORM1_COORDINATE_MAP_REL = join('docs', 'vic', 'vic-form1-coordinate-map.json')

const QUNI_RENT_PORTAL_URL = 'https://quni.com.au'

type MapFieldType = 'text' | 'date' | 'multiline' | 'checkbox' | 'signature'

export type VicForm1MapField = {
  id: string
  page: number
  type: MapFieldType
  rect_pdf: [number, number, number, number]
  lines?: number
}

export type VicForm1CoordinateMap = {
  sourcePdfSha256: string
  fillPadding: { left: number; bottom: number }
  fields: VicForm1MapField[]
}

export type VicForm1FieldAssignment = {
  text?: string
  checked?: boolean
}

export type VicForm1FillPlan = {
  assignments: Map<string, VicForm1FieldAssignment>
  gaps: string[]
}

export type VicForm1FillResult = {
  pdfBytes: Uint8Array
  filledFieldIds: string[]
  gaps: string[]
}

type Rect = { x: number; y: number; width: number; height: number }

function sha256Hex(buf: Buffer | Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex')
}

function rectFromPdf(rectPdf: [number, number, number, number]): Rect {
  const [x0, y0, x1, y1] = rectPdf
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

function formatPlainMoney(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAuDate(iso: string): string {
  const d = iso.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return iso
  const [y, m, day] = parts
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

function agreementMadeOnFromGeneratedAt(generatedAt: string): string {
  const idx = generatedAt.indexOf(',')
  if (idx > 0) return generatedAt.slice(0, idx).trim()
  return generatedAt.trim()
}

function rentDueWeekdayFromCommencement(isoDate: string): string {
  const raw = isoDate.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return 'Monday'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

function formatBsbDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw.trim()
}

function item8RentPaymentDetails(
  preference: QldGeneralTenancyAgreementProps['rentPaymentPreference'],
  bank: QldGeneralTenancyAgreementProps['rentPaymentBankDetails'],
): string {
  const acct = bank?.accountNumber?.trim()
  const bsb = bank?.bsb?.trim() ? formatBsbDisplay(bank.bsb) : ''
  const name = bank?.accountName?.trim() ?? ''
  const bankLine =
    acct && bsb && name
      ? `Direct deposit - Account name: ${name}; BSB: ${bsb}; Account number: ${acct}.`
      : 'Direct deposit (bank deposit) - account details to be provided by the rental provider.'

  if (preference === 'quni_platform') {
    return `${bankLine} Recurring rent may also be paid via the Quni Living platform (${QUNI_RENT_PORTAL_URL}) using the payment facility activated in the renter's Quni account.`
  }
  return bankLine
}

type AuAddressParts = { street: string; suburb: string; state: string; postcode: string }

function parseAustralianAddressLine(addressLine: string): AuAddressParts {
  const t = addressLine.trim()
  if (!t) return { street: '', suburb: '', state: '', postcode: '' }
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean)
  const stateIdx = parts.findIndex((p) => /^(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)$/i.test(p))
  if (stateIdx >= 0) {
    const state = parts[stateIdx] ?? ''
    const suburb = stateIdx > 0 ? (parts[stateIdx - 1] ?? '') : ''
    const after = parts[stateIdx + 1]
    const postcode = after && /^\d{4}$/.test(after) ? after : ''
    const street = parts.slice(0, Math.max(0, stateIdx - 1)).join(', ')
    return { street, suburb, state, postcode }
  }
  if (parts.length >= 3) {
    const postcode = /^\d{4}$/.test(parts[parts.length - 1] ?? '') ? parts[parts.length - 1]! : ''
    const suburb = parts[parts.length - 2] ?? ''
    const street = parts.slice(0, postcode ? -2 : -1).join(', ')
    return { street, suburb, state: postcode ? '' : (parts[parts.length - 1] ?? ''), postcode }
  }
  return { street: t, suburb: '', state: '', postcode: '' }
}

function addressStreetLine(addressLine: string): string {
  const p = parseAustralianAddressLine(addressLine)
  const bits = [p.street, p.suburb, p.state].filter(Boolean)
  return bits.join(', ')
}

function splitTradeLine(raw: string | null | undefined): { name: string; phone: string } {
  const line = (raw ?? '').trim()
  if (!line) return { name: '', phone: '' }
  const phoneMatch = line.match(/(\+?\d[\d\s-]{7,}\d)/)
  if (phoneMatch) {
    return {
      name: line.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim(),
      phone: phoneMatch[0].trim(),
    }
  }
  return { name: line, phone: '' }
}

function composeFurtherDetails(props: QldGeneralTenancyAgreementProps): string {
  const parts: string[] = []
  for (const c of props.specialConditions) {
    const t = c.trim()
    if (t) parts.push(t)
  }
  if (props.bookingNotes?.trim()) parts.push(props.bookingNotes.trim())
  return parts.join('\n')
}

function gap(gaps: string[], id: string, reason: string) {
  gaps.push(`${id}: ${reason}`)
}

export function loadVicForm1CoordinateMap(root = process.cwd()): VicForm1CoordinateMap {
  const raw = JSON.parse(readFileSync(join(root, OFFICIAL_VIC_FORM1_COORDINATE_MAP_REL), 'utf8')) as VicForm1CoordinateMap
  return raw
}

export async function loadOfficialVicForm1BlankTemplate(root = process.cwd()): Promise<PDFDocument> {
  const map = loadVicForm1CoordinateMap(root)
  const blankPath = join(root, OFFICIAL_VIC_FORM1_BLANK_REL)
  const bytes = readFileSync(blankPath)
  const sha = sha256Hex(bytes)
  if (sha !== map.sourcePdfSha256) {
    throw new Error(
      `VIC Form 1 blank PDF sha256 mismatch (got ${sha}, map expects ${map.sourcePdfSha256})`,
    )
  }
  return PDFDocument.load(bytes, { ignoreEncryption: true })
}

/** Map semantic field ids → text or checkbox assignments from the shared props bag. */
export function buildVicForm1FillPlan(props: QldGeneralTenancyAgreementProps): VicForm1FillPlan {
  const assignments = new Map<string, VicForm1FieldAssignment>()
  const gaps: string[] = []

  const setText = (id: string, value: string | null | undefined) => {
    const v = typeof value === 'string' ? value.trim() : ''
    if (v) assignments.set(id, { text: v })
  }

  const setChecked = (id: string, checked: boolean) => {
    if (checked) assignments.set(id, { checked: true })
  }

  const landlordName =
    props.landlord.companyName?.trim() ||
    props.landlord.fullName.trim() ||
    ''
  const landlordNameLine =
    props.landlord.companyName?.trim() && props.landlord.fullName.trim()
      ? `${props.landlord.fullName.trim()} (${props.landlord.companyName.trim()})`
      : landlordName

  setText('agreement.date', agreementMadeOnFromGeneratedAt(props.generatedAt))
  setText('premises.address', addressStreetLine(props.premises.addressLine))
  setText('premises.postcode', props.premisesPostcode)
  setText('rentalProvider.nameOrCompany', landlordNameLine)
  gap(gaps, 'rentalProvider.acn', 'no landlord ACN on QldGeneralTenancyAgreementProps')
  setText('rentalProvider.address', addressStreetLine(props.landlord.addressLine))
  setText('rentalProvider.postcode', props.landlordPostcode)
  setText('rentalProvider.phone', props.landlord.phone)
  setText('rentalProvider.email', props.landlord.email)

  if (props.landlordAgent) {
    setText('agent.fullName', props.landlordAgent.name)
    setText('agent.address', addressStreetLine(props.landlordAgent.businessAddress))
    gap(gaps, 'agent.postcode', 'landlord agent has no separate postcode field on props')
    setText('agent.phone', props.landlordAgent.phone)
    gap(gaps, 'agent.acn', 'landlord agent has no ACN on props')
    setText('agent.email', props.landlordAgent.email ?? '')
  } else {
    for (const id of [
      'agent.fullName',
      'agent.address',
      'agent.postcode',
      'agent.phone',
      'agent.acn',
      'agent.email',
    ]) {
      gap(gaps, id, 'landlordAgent is null')
    }
  }

  setText('renter1.fullName', props.tenant.fullName)
  setText('renter1.currentAddress', addressStreetLine(props.tenant.addressForServiceLine ?? ''))
  const tenantAddr = parseAustralianAddressLine(props.tenant.addressForServiceLine ?? '')
  setText('renter1.postcode', tenantAddr.postcode)
  setText('renter1.phone', props.tenant.phone)
  setText('renter1.email', props.tenant.email)

  const coTenant = props.additionalTenantNames[0]?.trim() ?? ''
  if (coTenant) {
    setText('renter2.fullName', coTenant)
    for (const id of ['renter2.currentAddress', 'renter2.postcode', 'renter2.phone', 'renter2.email']) {
      gap(gaps, id, 'no co-tenant contact fields on props (name only)')
    }
  } else {
    for (const id of [
      'renter2.fullName',
      'renter2.currentAddress',
      'renter2.postcode',
      'renter2.phone',
      'renter2.email',
    ]) {
      gap(gaps, id, 'no additionalTenantNames[0]')
    }
  }

  for (const prefix of ['renter3', 'renter4']) {
    for (const suffix of ['fullName', 'currentAddress', 'postcode', 'phone', 'email']) {
      gap(gaps, `${prefix}.${suffix}`, 'renters 3–4 not captured on props')
    }
  }

  setChecked('term.fixedTerm', !props.term.periodic)
  setText('term.fixedStartDate', formatAuDate(props.term.startDate))
  if (!props.term.periodic && props.term.endDate) {
    setText('term.fixedEndDate', formatAuDate(props.term.endDate))
  }
  setChecked('term.periodic', props.term.periodic)
  if (props.term.periodic) {
    setText('term.periodicStartDate', formatAuDate(props.term.startDate))
  }

  setText('rent.amount', formatPlainMoney(props.rent.weeklyRent))
  setChecked('rent.perWeek', props.rent.rentFrequency === 'weekly')
  setChecked('rent.perFortnight', props.rent.rentFrequency === 'fortnightly')
  setChecked('rent.perCalendarMonth', props.rent.rentFrequency === 'monthly')
  setText('rent.dayPaid', rentDueWeekdayFromCommencement(props.term.startDate))
  setText('rent.firstPaymentDate', formatAuDate(props.term.startDate))

  if (props.bond.amount != null && Number.isFinite(props.bond.amount)) {
    setText('bond.amount', formatPlainMoney(props.bond.amount))
    setText('bond.dueDate', formatAuDate(props.term.startDate))
  }

  setChecked('payment.bankDeposit', true)
  setChecked('payment.otherElectronic', props.rentPaymentPreference === 'quni_platform')
  if (props.rentPaymentPreference === 'quni_platform') {
    setText('payment.otherElectronicDetails', 'Quni Living platform')
  }
  setText('payment.details', item8RentPaymentDetails(props.rentPaymentPreference, props.rentPaymentBankDetails))

  setChecked('electronic.rentalProviderYes', props.electronicService.landlordConsentsToEmailService)
  setChecked('electronic.rentalProviderNo', !props.electronicService.landlordConsentsToEmailService)
  if (props.electronicService.landlordConsentsToEmailService) {
    setText('electronic.rentalProviderContact', props.electronicService.landlordEmail)
  }

  setChecked('electronic.renter1Yes', props.electronicService.tenantConsentsToEmailService)
  setChecked('electronic.renter1No', !props.electronicService.tenantConsentsToEmailService)
  if (props.electronicService.tenantConsentsToEmailService) {
    setText('electronic.renter1Contact', props.electronicService.tenantEmail)
  }

  for (const prefix of ['renter2', 'renter3', 'renter4']) {
    for (const suffix of ['Yes', 'No', 'Contact']) {
      gap(gaps, `electronic.${prefix}${suffix}`, 'per-renter electronic service beyond renter 1 not on props')
    }
  }

  const urgent = splitTradeLine(props.urgentRepairsTradespeople.electrician)
  setText('emergency.contactName', urgent.name || props.landlord.fullName)
  setText('emergency.phone', urgent.phone || props.landlord.phone)
  setText('emergency.email', props.landlord.email)

  setChecked('ownersCorp.no', true)
  setChecked('ownersCorp.yes', false)
  setChecked('conditionReport.provided', false)
  setChecked('conditionReport.willBeProvided', true)

  const further = composeFurtherDetails(props)
  if (further) setText('additionalTerms.furtherDetails', further)

  for (const id of [
    'signature.rentalProvider1',
    'signature.rentalProvider1Date',
    'signature.rentalProvider2',
    'signature.rentalProvider2Date',
    'signature.renter1',
    'signature.renter1Date',
    'signature.renter2',
    'signature.renter2Date',
    'signature.renter3',
    'signature.renter3Date',
    'signature.renter4',
    'signature.renter4Date',
  ]) {
    gap(gaps, id, 'signing anchors are out of scope for fill-only pass')
  }

  return { assignments, gaps }
}

const MIN_FONT_SIZE = 5

function layoutMultilineTopAligned(
  text: string,
  font: PDFFont,
  rect: Rect,
  padding: { left: number; bottom: number },
  maxLines?: number,
): { size: number; lines: string[]; x: number; startY: number; lineHeight: number } {
  const raw = text.replace(/\r\n/g, '\n').trim()
  const paragraphs = raw.split('\n')
  const maxWidth = Math.max(12, rect.width - padding.left * 2)
  let size = 8

  while (size >= MIN_FONT_SIZE) {
    const lines: string[] = []
    for (const para of paragraphs) {
      const words = para.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
      if (words.length === 0) {
        lines.push('')
        continue
      }
      let current = ''
      for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          current = next
        } else {
          if (current) lines.push(current)
          current = word
        }
      }
      if (current) lines.push(current)
    }

    const capped = maxLines != null ? lines.slice(0, maxLines) : lines
    const lineHeight = size + 2
    const blockHeight = capped.length * lineHeight
    if (blockHeight <= rect.height - padding.bottom) {
      const startY = rect.y + rect.height - padding.bottom - size
      return { size, lines: capped, x: rect.x + padding.left, startY, lineHeight }
    }
    size -= 0.5
  }

  const single = layoutSingleLineInField(raw.replace(/\n/g, ' '), font, {
    x: rect.x + padding.left,
    y: rect.y + padding.bottom,
    width: rect.width - padding.left * 2,
    height: rect.height - padding.bottom,
  })
  return {
    size: single.size,
    lines: [single.line],
    x: single.x,
    startY: single.y,
    lineHeight: single.size + 2,
  }
}

function drawSingleLine(
  page: PDFPage,
  font: PDFFont,
  rect: Rect,
  text: string,
  padding: { left: number; bottom: number },
) {
  const padded: Rect = {
    x: rect.x + padding.left,
    y: rect.y + padding.bottom,
    width: rect.width - padding.left * 2,
    height: rect.height - padding.bottom,
  }
  const { size, line, x, y } = layoutSingleLineInField(text, font, padded)
  page.drawText(line, { x, y, size, font, color: rgb(0, 0, 0) })
}

function drawMultiline(
  page: PDFPage,
  font: PDFFont,
  rect: Rect,
  text: string,
  padding: { left: number; bottom: number },
  maxLines?: number,
) {
  const { size, lines, x, startY, lineHeight } = layoutMultilineTopAligned(
    text,
    font,
    rect,
    padding,
    maxLines,
  )
  let y = startY
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
}

function drawCheckbox(page: PDFPage, font: PDFFont, rect: Rect) {
  const size = Math.min(rect.width, rect.height) * 0.75
  const glyph = 'X'
  const textWidth = font.widthOfTextAtSize(glyph, size)
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  page.drawText(glyph, {
    x: cx - textWidth / 2,
    y: cy - size * 0.35,
    size,
    font,
    color: rgb(0, 0, 0),
  })
}

/** Draw schedule values onto an already-loaded blank PDF (does not save). */
export async function applyOfficialVicForm1FillToDocument(
  doc: PDFDocument,
  props: QldGeneralTenancyAgreementProps,
  opts?: { root?: string },
): Promise<Omit<VicForm1FillResult, 'pdfBytes'>> {
  const root = opts?.root ?? process.cwd()
  const map = loadVicForm1CoordinateMap(root)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const plan = buildVicForm1FillPlan(props)
  const filledFieldIds: string[] = []
  const padding = map.fillPadding ?? { left: 3, bottom: 3 }

  for (const field of map.fields) {
    if (field.type === 'signature') continue

    const assignment = plan.assignments.get(field.id)
    if (!assignment) continue

    const page = pages[field.page - 1]
    if (!page) continue
    const rect = rectFromPdf(field.rect_pdf)

    if (field.type === 'checkbox') {
      if (assignment.checked) {
        drawCheckbox(page, font, rect)
        filledFieldIds.push(field.id)
      }
      continue
    }

    const text = assignment.text?.trim()
    if (!text) continue

    if (field.type === 'multiline') {
      drawMultiline(page, font, rect, text, padding, field.lines)
      filledFieldIds.push(field.id)
    } else {
      drawSingleLine(page, font, rect, text, padding)
      filledFieldIds.push(field.id)
    }
  }

  return { filledFieldIds, gaps: plan.gaps }
}

export async function fillOfficialVicForm1Pdf(
  props: QldGeneralTenancyAgreementProps,
  opts?: { root?: string },
): Promise<VicForm1FillResult> {
  const root = opts?.root ?? process.cwd()
  const doc = await loadOfficialVicForm1BlankTemplate(root)
  const { filledFieldIds, gaps } = await applyOfficialVicForm1FillToDocument(doc, props, { root })
  const pdfBytes = await doc.save()
  return { pdfBytes, filledFieldIds, gaps }
}
