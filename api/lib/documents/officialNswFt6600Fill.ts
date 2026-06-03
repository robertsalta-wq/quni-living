/**
 * Fill NSW FT6600 schedule via unique semantic AcroForm names (docs/nsw/ft6600-renamed.pdf).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDict, PDFDocument, PDFName, StandardFonts, type PDFForm } from 'pdf-lib'
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'
import { FT6600_RENAMED_FIELDS as F } from './ft6600RenamedFields.js'
import {
  flattenAndCleanForm,
  saveNormalizedPdf,
} from './officialNswFt6600PdfNormalize.js'

export { FT6600_RENAMED_FIELDS } from './ft6600RenamedFields.js'

export const OFFICIAL_NSW_FT6600_TEMPLATE_REL = join('docs', 'nsw', 'ft6600-renamed.pdf')

const TEMPLATE_REL = OFFICIAL_NSW_FT6600_TEMPLATE_REL

const TERM_CHECKBOXES = [
  F.term_6_months_cb,
  F.term_12_months_cb,
  F.term_2_years_cb,
  F.term_3_years_cb,
  F.term_5_years_cb,
  F.term_other_cb,
  F.term_periodic_cb,
] as const

const RENT_FREQ_CHECKBOXES = [
  F.rent_paid_week_cb,
  F.rent_paid_fortnight_cb,
  F.rent_paid_other_freq_cb,
] as const

const RENT_METHOD_CHECKBOXES = [
  F.rent_paid_bank_cb,
  F.rent_paid_centrepay_cb,
  F.rent_paid_other_method_cb,
] as const

export async function loadOfficialNswFt6600Template(): Promise<PDFDocument> {
  const templatePath = join(process.cwd(), TEMPLATE_REL)
  return PDFDocument.load(readFileSync(templatePath), { ignoreEncryption: true })
}

function formatPlainMoney(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function sanitizeDisplayText(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\s*—\s*/g, ' ')
    .trim()
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

type TermCheckbox = (typeof TERM_CHECKBOXES)[number]

function resolveTermCheckbox(
  periodic: boolean,
  leaseLengthDescription: string,
  startDate: string,
  endDate: string | null,
): TermCheckbox {
  if (periodic) return F.term_periodic_cb
  const d = leaseLengthDescription.trim().toLowerCase()
  if (/\bperiodic\b/.test(d) || /\bmonth[\s-]*to[\s-]*month\b/.test(d) || /\bflexible\b/i.test(d)) {
    return F.term_periodic_cb
  }
  if (/\b5\s*years?\b|\b60\s*months?\b/.test(d)) return F.term_5_years_cb
  if (/\b3\s*years?\b|\b36\s*months?\b/.test(d)) return F.term_3_years_cb
  if (/\b2\s*years?\b|\b24\s*months?\b/.test(d)) return F.term_2_years_cb
  if (/\b12\s*months?\b|\b1\s*year\b/.test(d)) return F.term_12_months_cb
  if (/\b6\s*months?\b/.test(d)) return F.term_6_months_cb
  if (endDate && startDate) {
    const start = new Date(startDate.slice(0, 10))
    const end = new Date(endDate.slice(0, 10))
    const months = Math.round((end.getTime() - start.getTime()) / (30.44 * 86400000))
    if (months <= 8) return F.term_6_months_cb
    if (months <= 15) return F.term_12_months_cb
    if (months <= 27) return F.term_2_years_cb
    if (months <= 39) return F.term_3_years_cb
    return F.term_5_years_cb
  }
  return F.term_other_cb
}

function setCheck(form: PDFForm, name: string, checked: boolean) {
  try {
    const box = form.getCheckBox(name)
    if (checked) box.check()
    else box.uncheck()
  } catch {
    /* absent on revision */
  }
}

function uncheckAll(form: PDFForm, names: readonly string[]) {
  for (const name of names) setCheck(form, name, false)
}

type FillAssignments = {
  text: Map<string, string>
  checks: Set<string>
}

function pushText(map: Map<string, string>, field: string, value: string | null | undefined) {
  const v = sanitizeDisplayText(value)
  if (v) map.set(field, v)
}

function applyAssignments(form: PDFForm, state: FillAssignments): Array<[string, string]> {
  const assignments: Array<[string, string]> = []
  for (const [name, value] of state.text) {
    assignments.push([name, value])
    try {
      form.getTextField(name).setText(value)
    } catch {
      /* absent */
    }
  }
  for (const name of state.checks) {
    setCheck(form, name, true)
  }
  return assignments
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

export async function prepareOfficialNswFt6600ScheduleForFlatten(
  doc: PDFDocument,
  props: NswResidentialTenancyAgreementProps,
): Promise<OfficialNswFt6600ScheduleFillResult> {
  const { filledFieldNames, assignments } = applyOfficialNswFt6600ScheduleFill(doc, props)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.getForm().updateFieldAppearances(font)
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (acroFormRef) {
    const acroForm = doc.context.lookup(acroFormRef, PDFDict)
    acroForm.delete(PDFName.of('NeedAppearances'))
  }
  return { filledFieldNames, assignments }
}

export function applyOfficialNswFt6600ScheduleFill(
  doc: PDFDocument,
  props: NswResidentialTenancyAgreementProps,
): OfficialNswFt6600ScheduleFillResult {
  const form = doc.getForm()
  const state = buildFillAssignments(props)

  uncheckAll(form, TERM_CHECKBOXES)
  const termCb = resolveTermCheckbox(
    props.term.periodic,
    props.term.leaseLengthDescription,
    props.term.startDate,
    props.term.endDate,
  )
  setCheck(form, termCb, true)

  uncheckAll(form, RENT_FREQ_CHECKBOXES)
  uncheckAll(form, RENT_METHOD_CHECKBOXES)
  const freq = props.rent.rentFrequency ?? 'weekly'
  if (freq === 'weekly') setCheck(form, F.rent_paid_week_cb, true)
  else if (freq === 'fortnightly') setCheck(form, F.rent_paid_fortnight_cb, true)
  else setCheck(form, F.rent_paid_other_freq_cb, true)

  const paymentLower = sanitizeDisplayText(props.rent.paymentMethod).toLowerCase()
  if (/\bcentrepay\b/.test(paymentLower)) setCheck(form, F.rent_paid_centrepay_cb, true)
  else setCheck(form, F.rent_paid_bank_cb, true)

  uncheckAll(form, [F.water_usage_yes_cb, F.water_usage_no_cb])
  uncheckAll(form, [F.electricity_embedded_yes_cb, F.electricity_embedded_no_cb])
  uncheckAll(form, [F.gas_embedded_yes_cb, F.gas_embedded_no_cb])
  uncheckAll(form, [F.bond_paid_to_landlord_cb, F.bond_paid_to_agent_cb, F.bond_paid_to_rbo_cb])
  uncheckAll(form, [F.smoke_hardwired_cb, F.smoke_battery_cb])
  uncheckAll(form, [
    F.smoke_battery_replaceable_yes_cb,
    F.smoke_battery_replaceable_no_cb,
    F.smoke_hardwired_backup_replaceable_yes_cb,
    F.smoke_hardwired_backup_replaceable_no_cb,
  ])
  uncheckAll(form, [F.smoke_owners_corp_responsible_yes_cb, F.smoke_owners_corp_responsible_no_cb])
  uncheckAll(form, [F.strata_bylaws_yes_cb, F.strata_bylaws_no_cb])

  setCheck(form, F.smoke_owners_corp_responsible_no_cb, true)
  setCheck(form, F.strata_bylaws_no_cb, true)

  uncheckAll(form, [F.landlord_eservice_yes_cb, F.landlord_eservice_no_cb])
  if (
    props.electronicService.landlordConsentsToEmailService ||
    sanitizeDisplayText(props.electronicService.landlordEmail)
  ) {
    setCheck(form, F.landlord_eservice_yes_cb, true)
  }
  uncheckAll(form, [F.tenant_eservice_yes_cb, F.tenant_eservice_no_cb])
  if (
    props.electronicService.tenantConsentsToEmailService ||
    sanitizeDisplayText(props.electronicService.tenantEmail)
  ) {
    setCheck(form, F.tenant_eservice_yes_cb, true)
  }

  const assignments = applyAssignments(form, state)
  return { filledFieldNames: [...new Set(assignments.map(([n]) => n))], assignments }
}

function buildFillAssignments(props: NswResidentialTenancyAgreementProps): FillAssignments {
  const text = new Map<string, string>()
  const checks = new Set<string>()

  const { landlord, tenant, premises, term, rent, bond, landlordAgent, urgentRepairsTradespeople, electronicService } =
    props
  const madeOn = agreementMadeOnFromGeneratedAt(props.generatedAt)
  const serviceTier = props.serviceTier === 'managed' ? 'managed' : 'listing'
  const atSuburb =
    serviceTier === 'managed' && props.landlordAgent
      ? suburbFromAddressLine(props.landlordAgent.businessAddress)
      : suburbFromAddressLine(landlord.addressLine)
  const landlordAddr = parseAustralianAddressLine(landlord.addressLine)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const inclusions = props.additionalPremisesInclusions.map((s) => s.trim()).filter(Boolean).join('; ')
  const maxOcc =
    props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted)
      ? String(props.maxOccupantsPermitted)
      : null

  const landlordPhone = sanitizeDisplayText(landlord.phone)

  pushText(text, F.agreement_made_on, madeOn)
  pushText(text, F.agreement_at, atSuburb)
  pushText(text, F.landlord_name_1, landlord.fullName)
  pushText(text, F.landlord_contact, landlordPhone)
  if (!landlordAgent && landlordPhone) pushText(text, F.landlord_phone_no_agent, landlordPhone)
  if (landlordAddr.street) pushText(text, F.landlord_service_street, landlordAddr.street)
  if (landlordAddr.suburb) pushText(text, F.landlord_service_suburb, landlordAddr.suburb)
  if (landlordAddr.state) pushText(text, F.landlord_service_state, landlordAddr.state)
  if (landlordAddr.postcode) pushText(text, F.landlord_service_postcode, landlordAddr.postcode)

  if (landlord.companyName) {
    pushText(text, F.corp_name, landlord.companyName)
    if (landlordAddr.street) pushText(text, F.corp_address, landlordAddr.street)
    pushText(text, F.corp_suburb, landlordAddr.suburb)
    pushText(text, F.corp_state, landlordAddr.state)
    pushText(text, F.corp_postcode, landlordAddr.postcode)
  }

  pushText(text, F.tenant_name_1, tenant.fullName)
  const coTenants = props.additionalTenantNames.map((s) => sanitizeDisplayText(s)).filter(Boolean)
  if (coTenants[0]) pushText(text, F.tenant_name_2, coTenants[0])
  if (coTenants[1]) pushText(text, F.tenant_name_3, coTenants[1])
  if (coTenants.length > 2) pushText(text, F.tenant_all_others, coTenants.slice(2).join('; '))

  if (tenant.addressForServiceLine) {
    const tenantService = parseAustralianAddressLine(tenant.addressForServiceLine)
    if (tenantService.street) pushText(text, F.tenant_service_street, tenantService.street)
    if (tenantService.suburb) pushText(text, F.tenant_service_suburb, tenantService.suburb)
    if (tenantService.state) pushText(text, F.tenant_service_state, tenantService.state)
    if (tenantService.postcode) pushText(text, F.tenant_service_postcode, tenantService.postcode)
  }

  const tenantContact = [
    tenant.phone ? `Phone: ${sanitizeDisplayText(tenant.phone)}` : '',
    tenant.email ? `Email: ${sanitizeDisplayText(tenant.email)}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  if (tenantContact) pushText(text, F.tenant_contact, tenantContact)

  if (landlordAgent) {
    const agentAddr = parseAustralianAddressLine(landlordAgent.businessAddress)
    pushText(text, F.landlord_agent_name, landlordAgent.name)
    const agentContact = [
      sanitizeDisplayText(landlordAgent.phone),
      landlordAgent.email ? `Email: ${sanitizeDisplayText(landlordAgent.email)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const agentAddressLine = sanitizeDisplayText(landlordAgent.businessAddress)
    pushText(text, F.landlord_agent_address, agentContact ? `${agentAddressLine} · ${agentContact}` : agentAddressLine)
    if (agentAddr.suburb) pushText(text, F.landlord_agent_suburb, agentAddr.suburb)
    if (agentAddr.state) pushText(text, F.landlord_agent_state, agentAddr.state)
    if (agentAddr.postcode) pushText(text, F.landlord_agent_postcode, agentAddr.postcode)
    if (agentContact) pushText(text, F.landlord_agent_contact, agentContact)
  }

  pushText(text, F.term_start_date, formatAuDate(term.startDate))
  pushText(text, F.rent_first_payment_date, formatAuDate(term.startDate))
  if (!term.periodic && term.endDate) pushText(text, F.term_end_date, formatAuDate(term.endDate))
  pushText(text, F.premises_address, premises.addressLine)
  if (inclusions) pushText(text, F.premises_inclusions, inclusions)

  const rentAmountPlain = formatPlainMoney(rent.weeklyRent)
  pushText(text, F.rent_amount, rentAmountPlain)

  const freq = rent.rentFrequency ?? 'weekly'
  if (freq !== 'weekly' && freq !== 'fortnightly') {
    pushText(text, F.rent_other_frequency_text, freq)
  }

  const paymentMethod = sanitizeDisplayText(rent.paymentMethod)
  pushText(text, F.rent_payment_details, paymentMethod)
  pushText(text, F.rent_due_day_text, rentWeekday)
  if (maxOcc) pushText(text, F.max_occupants, maxOcc)

  const splitTrade = (raw: string | null, nameKey: string, phoneKey: string) => {
    const line = sanitizeDisplayText(raw ?? '')
    if (!line) return
    const phoneMatch = line.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText(text, nameKey, line.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText(text, phoneKey, phoneMatch[0].trim())
    } else {
      pushText(text, nameKey, line)
    }
  }
  splitTrade(urgentRepairsTradespeople.electrician, F.urgent_electrician_name, F.urgent_electrician_phone)
  splitTrade(urgentRepairsTradespeople.plumber, F.urgent_plumber_name, F.urgent_plumber_phone)
  splitTrade(urgentRepairsTradespeople.other, F.urgent_other_name, F.urgent_other_phone)

  if (bond.amount != null && Number.isFinite(bond.amount)) {
    pushText(text, F.bond_amount, formatPlainMoney(bond.amount))
    checks.add(F.bond_paid_to_rbo_cb)
  }

  const billsIncluded = props.billsIncluded === true
  checks.add(billsIncluded ? F.water_usage_no_cb : F.water_usage_yes_cb)
  checks.add(F.electricity_embedded_no_cb)
  checks.add(F.gas_embedded_no_cb)

  pushText(text, F.landlord_email_for_service, electronicService.landlordEmail)
  pushText(text, F.tenant_email_for_service, electronicService.tenantEmail)

  return { text, checks }
}

export async function fillOfficialNswFt6600Pdf(
  props: NswResidentialTenancyAgreementProps,
): Promise<OfficialNswFt6600FillResult> {
  const doc = await loadOfficialNswFt6600Template()
  const { filledFieldNames } = await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
  flattenAndCleanForm(doc)
  const acroFormFieldCountAfterFlatten = 0
  const pdfBytes = await saveNormalizedPdf(doc)
  return { pdfBytes, filledFieldNames, acroFormFieldCountAfterFlatten }
}
