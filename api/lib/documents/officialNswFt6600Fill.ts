/**
 * Fill the official NSW FT6600 AcroForm PDF (schedule only), then flatten.
 * Signing tags are applied in a separate module after the tag-literal micro-spike.
 *
 * Template: docs/nsw/residential-tenancy-agreement-form-2025-12.pdf
 * Field map: docs/nsw/ft6600-acroform-mapping.md
 * Authoritative hints: scripts/test-official-form-spike/field-desc-pairs.json
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts } from 'pdf-lib'
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

/** Matches react-pdf `agreementMadeOnFromGeneratedAt`. */
function agreementMadeOnFromGeneratedAt(generatedAt: string): string {
  const idx = generatedAt.indexOf(',')
  if (idx > 0) return generatedAt.slice(0, idx).trim()
  return generatedAt.trim()
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

type AuAddressParts = {
  street: string
  suburb: string
  state: string
  postcode: string
}

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

export type OfficialNswFt6600ScheduleFillResult = {
  filledFieldNames: string[]
  assignments: Array<[string, string]>
}

/**
 * Prepare filled schedule: text via AcroForm setText (flatten bakes into boxes).
 * Do not burn-in before flatten — flatten paints empty widget backgrounds over pre-flatten drawText.
 */
export async function prepareOfficialNswFt6600ScheduleForFlatten(
  doc: PDFDocument,
  props: NswResidentialTenancyAgreementProps,
): Promise<OfficialNswFt6600ScheduleFillResult> {
  const form = doc.getForm()
  const { filledFieldNames, assignments } = applyOfficialNswFt6600ScheduleFill(doc, props)
  for (const [name, value] of assignments) {
    const v = value.trim()
    if (!v) continue
    try {
      form.getTextField(name).setText(v)
    } catch {
      /* field absent on revision */
    }
  }
  const font = await doc.embedFont(StandardFonts.Helvetica)
  try {
    form.updateFieldAppearances(font)
  } catch {
    /* some revisions omit appearance streams */
  }
  return { filledFieldNames, assignments }
}

/** Fill schedule AcroForm fields only (caller flattens / tags). */
export function applyOfficialNswFt6600ScheduleFill(
  doc: PDFDocument,
  props: NswResidentialTenancyAgreementProps,
): OfficialNswFt6600ScheduleFillResult {
  const form = doc.getForm()

  const { landlord, tenant, premises, term, rent, bond, landlordAgent, urgentRepairsTradespeople, electronicService } =
    props
  const madeOn = agreementMadeOnFromGeneratedAt(props.generatedAt)
  const atSuburb = suburbFromAddressLine(premises.addressLine)
  const landlordAddr = parseAustralianAddressLine(landlord.addressLine)
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

  // § Agreement header — first slot is “made on” date in the printed form; tooltips call it address line 1.
  pushText('Text field 1.1', madeOn)
  pushText('Text field 1.2', atSuburb)
  pushText('Text field 1.3', landlord.fullName)
  pushText('Text field 1.5', landlord.phone)
  pushText('Text field 1.8', landlord.addressLine)
  if (landlordAddr.suburb) pushText('Text field 1.11', landlordAddr.suburb)
  if (landlordAddr.state) pushText('Text field 1.12', landlordAddr.state)
  if (landlordAddr.postcode) pushText('Text field 1.13', landlordAddr.postcode)
  if (landlord.companyName) pushText('Text field 1.14', landlord.companyName)

  // § Tenants (PDF page 1) — 2.3–2.5 are corporation suburb/state/postcode; names use 2.6/2.7.
  pushText('Text field 2.6', tenant.fullName)
  const coTenants = props.additionalTenantNames.map((s) => s?.trim()).filter(Boolean)
  if (coTenants.length > 0) pushText('Text field 2.7', coTenants.join('; '))

  if (tenant.addressForServiceLine) {
    const tenantService = parseAustralianAddressLine(tenant.addressForServiceLine)
    if (tenantService.street) pushText('Text field 2.8', tenantService.street)
    else pushText('Text field 2.8', tenant.addressForServiceLine)
    if (tenantService.suburb) pushText('Text field 2.9', tenantService.suburb)
    if (tenantService.state) pushText('Text field 2.10', tenantService.state)
    if (tenantService.postcode) pushText('Text field 2.11', tenantService.postcode)
    pushText('Text field 2.12', tenant.phone)
    if (tenant.email) pushText('Text field 2.13', tenant.email)
  } else {
    pushText('Text field 2.8', `Phone: ${tenant.phone} · Email: ${tenant.email}`)
  }

  if (landlordAgent) {
    const agentAddr = parseAustralianAddressLine(landlordAgent.businessAddress)
    pushText('Text field 2.13', landlordAgent.name)
    pushText('Text field 2.14', landlordAgent.businessAddress)
    if (agentAddr.suburb) pushText('Text field 2.15', agentAddr.suburb)
    if (agentAddr.state) pushText('Text field 2.16', agentAddr.state)
    if (agentAddr.postcode) pushText('Text field 2.17', agentAddr.postcode)
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

  // § Rent — frequency text fields sit beside “Paid weekly/fortnightly”; amount uses 3.7 when weekly.
  const freq = rent.rentFrequency ?? 'weekly'
  if (freq === 'weekly') {
    pushText('Text field 3.7', weeklyRentDisplay)
  } else if (freq === 'fortnightly') {
    pushText('Text field 3.9', weeklyRentDisplay)
  } else {
    pushText('Text field 3.10', weeklyRentDisplay)
  }

  const paymentMethod = rent.paymentMethod.trim()
  const paymentLower = paymentMethod.toLowerCase()
  const paymentLine = [
    paymentMethod,
    `Day rent due: ${rentWeekday}`,
    `First payment: ${formatAuDate(term.startDate)}`,
  ]
    .filter(Boolean)
    .join(' · ')
  // 3.13 is ~98px wide (wraps badly); 3.11/3.12 are full-width payment detail lines.
  if (/\bcentrepay\b/.test(paymentLower)) {
    pushText('Text field 3.12', paymentLine)
  } else {
    pushText('Text field 3.11', paymentLine)
  }

  if (maxOcc) pushText('Text field 3.17', maxOcc)

  const electrician = urgentRepairsTradespeople.electrician?.trim()
  if (electrician) {
    const phoneMatch = electrician.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText('Text field 3.18', electrician.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText('Text field 3.19', phoneMatch[0].trim())
    } else {
      pushText('Text field 3.18', electrician)
    }
  }

  const plumber = urgentRepairsTradespeople.plumber?.trim()
  if (plumber) {
    const phoneMatch = plumber.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText('Text field 3.23', plumber.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText('Text field 4.0', phoneMatch[0].trim())
    } else {
      pushText('Text field 3.23', plumber)
    }
  }

  if (urgentRepairsTradespeople.other) {
    const other = urgentRepairsTradespeople.other.trim()
    const phoneMatch = other.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText('Text field 4.4', other.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText('Text field 4.5', phoneMatch[0].trim())
    } else {
      pushText('Text field 4.4', other)
    }
  }

  // Inclusions (Check Box 3.1 is Btn-only); note in “other repairs” area only when no other repairs text.
  if (inclusions && !urgentRepairsTradespeople.other) {
    pushText('Text field 4.4', `Premises include: ${inclusions}`)
  }

  // § Bond (PDF page 3) — amount in wide 4.7; recipient name in 4.8.
  if (bondDisplay) {
    pushText('Text field 4.7', bondDisplay)
    pushText('Text field 4.8', landlord.fullName)
  }

  setCheckSafe(form, 'Check Box 3.8', checks.m6)
  setCheckSafe(form, 'Check Box 3.14', checks.m12)
  setCheckSafe(form, 'Check Box 3.15', checks.y2)
  setCheckSafe(form, 'Check Box 3.16', checks.y3)
  setCheckSafe(form, 'Check Box 3.20', checks.y5)
  setCheckSafe(form, 'Check Box 3.21', checks.other)
  setCheckSafe(form, 'Check Box 3.22', checks.periodic)

  setCheckSafe(form, 'Check Box 4.1', false)
  setCheckSafe(form, 'Check Box 4.2', false)
  setCheckSafe(form, 'Check Box 4.3', true)
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

  // Text is set on AcroForm fields in prepareOfficialNswFt6600ScheduleForFlatten (then flatten bakes values).

  const filledFieldNames = assignments.map(([n]) => n)
  return { filledFieldNames, assignments }
}

/**
 * Load official FT6600 template, fill schedule fields from platform props, flatten AcroForm (no signing tags).
 */
export async function fillOfficialNswFt6600Pdf(
  props: NswResidentialTenancyAgreementProps,
): Promise<OfficialNswFt6600FillResult> {
  const doc = await loadOfficialNswFt6600Template()
  const { filledFieldNames } = await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)

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
