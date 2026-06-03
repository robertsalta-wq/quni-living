/**
 * Fill the official NSW FT6600 AcroForm PDF (schedule only), then flatten.
 * Signing tags are applied in a separate module after the tag-literal micro-spike.
 *
 * Template: docs/nsw/residential-tenancy-agreement-form-2025-12.pdf
 * Field map: docs/nsw/ft6600-acroform-mapping.md
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'

export const OFFICIAL_NSW_FT6600_TEMPLATE_REL = join(
  'docs',
  'nsw',
  'residential-tenancy-agreement-form-2025-12.pdf',
)

const TEMPLATE_REL = OFFICIAL_NSW_FT6600_TEMPLATE_REL

export async function loadOfficialNswFt6600Template(): Promise<PDFDocument> {
  const templatePath = join(process.cwd(), TEMPLATE_REL)
  const templateBytes = readFileSync(templatePath)
  return PDFDocument.load(templateBytes, { ignoreEncryption: true })
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function formatAuDate(iso: string): string {
  const d = iso.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return iso
  const [y, m, day] = parts
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

function suburbFromAddressLine(addressLine: string): string {
  const t = addressLine.trim()
  if (!t || t === '—') return ''
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean)
  const stateIdx = parts.findIndex((p) => /^(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)$/i.test(p))
  if (stateIdx > 0) return parts[stateIdx - 1] ?? parts[0] ?? ''
  if (parts.length >= 2) return parts[parts.length - 2] ?? ''
  return parts[0] ?? ''
}

function rentDueWeekdayFromCommencement(isoDate: string): string {
  const raw = isoDate.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return 'Monday'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' })
}

type TermChecks = {
  m6: boolean
  m12: boolean
  y2: boolean
  y3: boolean
  y5: boolean
  periodic: boolean
  other: boolean
  otherText: string | null
}

function termCheckState(
  periodic: boolean,
  leaseLengthDescription: string,
  startDate: string,
  endDate: string | null,
): TermChecks {
  if (periodic) {
    return { m6: false, m12: false, y2: false, y3: false, y5: false, periodic: true, other: false, otherText: null }
  }
  const d = leaseLengthDescription.trim().toLowerCase()
  if (/\bperiodic\b/.test(d) || /\bmonth[\s-]*to[\s-]*month\b/.test(d)) {
    return { m6: false, m12: false, y2: false, y3: false, y5: false, periodic: true, other: false, otherText: null }
  }
  if (/\b5\s*years?\b|\b60\s*months?\b/.test(d)) {
    return { m6: false, m12: false, y2: false, y3: false, y5: true, periodic: false, other: false, otherText: null }
  }
  if (/\b3\s*years?\b|\b36\s*months?\b/.test(d)) {
    return { m6: false, m12: false, y2: true, y3: true, y5: false, periodic: false, other: false, otherText: null }
  }
  if (/\b2\s*years?\b|\b24\s*months?\b/.test(d)) {
    return { m6: false, m12: false, y2: true, y3: false, y5: false, periodic: false, other: false, otherText: null }
  }
  if (/\b12\s*months?\b|\b1\s*year\b/.test(d)) {
    return { m6: false, m12: true, y2: false, y3: false, y5: false, periodic: false, other: false, otherText: null }
  }
  if (/\b6\s*months?\b/.test(d)) {
    return { m6: true, m12: false, y2: false, y3: false, y5: false, periodic: false, other: false, otherText: null }
  }
  if (endDate && startDate) {
    const start = new Date(startDate.slice(0, 10))
    const end = new Date(endDate.slice(0, 10))
    const months = Math.round((end.getTime() - start.getTime()) / (30.44 * 86400000))
    if (months <= 8) return { m6: true, m12: false, y2: false, y3: false, y5: false, periodic: false, other: false, otherText: null }
    if (months <= 15) return { m6: false, m12: true, y2: false, y3: false, y5: false, periodic: false, other: false, otherText: null }
    if (months <= 27) return { m6: false, m12: false, y2: true, y3: false, y5: false, periodic: false, other: false, otherText: null }
    if (months <= 45) return { m6: false, m12: false, y2: false, y3: true, y5: false, periodic: false, other: false, otherText: null }
    return { m6: false, m12: false, y2: false, y3: false, y5: true, periodic: false, other: false, otherText: null }
  }
  return {
    m6: false,
    m12: false,
    y2: false,
    y3: false,
    y5: false,
    periodic: false,
    other: true,
    otherText: leaseLengthDescription.trim() || null,
  }
}

function setTextSafe(form: ReturnType<PDFDocument['getForm']>, name: string, value: string | null | undefined) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v) return
  try {
    form.getTextField(name).setText(v)
  } catch {
    /* field absent on revision */
  }
}

function setCheckSafe(form: ReturnType<PDFDocument['getForm']>, name: string, checked: boolean) {
  try {
    const box = form.getCheckBox(name)
    if (checked) box.check()
    else box.uncheck()
  } catch {
    /* field absent on revision */
  }
}

export type OfficialNswFt6600FillResult = {
  pdfBytes: Uint8Array
  filledFieldNames: string[]
  acroFormFieldCountAfterFlatten: number
}

/** Fill schedule AcroForm fields only (caller flattens / tags). */
export function applyOfficialNswFt6600ScheduleFill(
  doc: PDFDocument,
  props: NswResidentialTenancyAgreementProps,
): { filledFieldNames: string[] } {
  const form = doc.getForm()

  const { landlord, tenant, premises, term, rent, bond, landlordAgent, urgentRepairsTradespeople, electronicService } =
    props
  const atSuburb = suburbFromAddressLine(premises.addressLine)
  const checks = termCheckState(term.periodic, term.leaseLengthDescription, term.startDate, term.endDate)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const weeklyRentDisplay = formatMoney(rent.weeklyRent)
  const bondDisplay =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : null
  const inclusions = props.additionalPremisesInclusions.map((s) => s.trim()).filter(Boolean).join('; ')
  const maxOcc =
    props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted)
      ? String(props.maxOccupantsPermitted)
      : null

  const assignments: Array<[string, string]> = []

  const pushText = (field: string, value: string | null | undefined) => {
    const v = typeof value === 'string' ? value.trim() : ''
    if (!v) return
    assignments.push([field, v])
  }

  pushText('Text field 1.1', landlord.fullName)
  pushText('Text field 1.2', atSuburb)
  pushText('Text field 1.5', landlord.phone)
  pushText('Text field 1.8', landlord.addressLine)

  pushText('Text field 2.1', tenant.fullName)
  pushText('Text field 2.4', props.additionalTenantNames[0])
  pushText('Text field 2.5', props.additionalTenantNames[1])
  pushText('Text field 2.6', props.additionalTenantNames[2])
  if (tenant.addressForServiceLine) {
    pushText('Text field 2.8', tenant.addressForServiceLine)
  }
  pushText('Text field 2.12', `Phone: ${tenant.phone} · Email: ${tenant.email}`)

  if (landlordAgent) {
    pushText('Text field 2.13', landlordAgent.name)
    pushText('Text field 2.14', landlordAgent.businessAddress)
    const agentContact = [
      landlordAgent.phone,
      landlordAgent.email ? `Email: ${landlordAgent.email}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    pushText('Text field 2.18', agentContact)
  }

  if (!term.periodic && term.endDate) {
    pushText('Text field 2.25', formatAuDate(term.endDate))
  }

  pushText('Text field 2.26', premises.addressLine)
  pushText('Text field 3.9', premises.addressLine)
  if (inclusions) pushText('Text field 4.0', inclusions)
  else pushText('Text field 4.0', premises.addressLine)

  pushText('Text field 3.7', weeklyRentDisplay)
  pushText('Text field 3.11', rentWeekday)
  pushText('Text field 3.12', formatAuDate(term.startDate))
  pushText('Text field 3.13', rent.paymentMethod)

  if (maxOcc) pushText('Text field 3.17', maxOcc)
  if (urgentRepairsTradespeople.electrician) pushText('Text field 3.18', urgentRepairsTradespeople.electrician)
  if (urgentRepairsTradespeople.plumber) pushText('Text field 3.23', urgentRepairsTradespeople.plumber)
  if (urgentRepairsTradespeople.other) pushText('Text field 4.4', urgentRepairsTradespeople.other)

  if (bondDisplay) pushText('Text field 4.8', bondDisplay)

  setCheckSafe(form, 'Check Box 3.8', checks.m6)
  setCheckSafe(form, 'Check Box 3.14', checks.m12)
  setCheckSafe(form, 'Check Box 3.15', checks.y2)
  setCheckSafe(form, 'Check Box 3.16', checks.y3)
  setCheckSafe(form, 'Check Box 3.20', checks.y5)
  setCheckSafe(form, 'Check Box 3.21', checks.other)
  setCheckSafe(form, 'Check Box 3.22', checks.periodic)

  setCheckSafe(form, 'Check Box 4.3', true)
  setCheckSafe(form, 'Check Box 4.1', false)
  setCheckSafe(form, 'Check Box 4.13', false)
  setCheckSafe(form, 'Check Box 4.19', false)
  setCheckSafe(form, 'Check Box 4.20', electronicService.landlordConsentsToEmailService)
  setCheckSafe(form, 'Check Box 4.22', electronicService.landlordConsentsToEmailService)
  setCheckSafe(form, 'Check Box 4.23', electronicService.tenantConsentsToEmailService)
  setCheckSafe(form, 'Check Box 5.1', electronicService.tenantConsentsToEmailService)

  if (electronicService.landlordConsentsToEmailService) {
    pushText('Text field 5.5', electronicService.landlordEmail)
  }
  if (electronicService.tenantConsentsToEmailService) {
    pushText('Text field 5.8', electronicService.tenantEmail)
  }

  for (const [name, value] of assignments) {
    setTextSafe(form, name, value)
  }

  const filledFieldNames = assignments.map(([n]) => n)
  return { filledFieldNames }
}

/**
 * Load official FT6600 template, fill schedule fields from platform props, flatten AcroForm (no signing tags).
 */
export async function fillOfficialNswFt6600Pdf(
  props: NswResidentialTenancyAgreementProps,
): Promise<OfficialNswFt6600FillResult> {
  const doc = await loadOfficialNswFt6600Template()
  const { filledFieldNames } = applyOfficialNswFt6600ScheduleFill(doc, props)

  doc.getForm().flatten()

  let acroFormFieldCountAfterFlatten = 0
  try {
    acroFormFieldCountAfterFlatten = doc.getForm().getFields().length
  } catch {
    acroFormFieldCountAfterFlatten = 0
  }

  const pdfBytes = await doc.save({ useObjectStreams: false })
  return { pdfBytes, filledFieldNames, acroFormFieldCountAfterFlatten }
}
