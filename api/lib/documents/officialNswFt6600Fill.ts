/**
 * Fill the official NSW FT6600 AcroForm PDF (schedule only), then flatten.
 * Field binding uses position-derived semantic slots (officialNswFt6600SlotMap.ts), not tooltips.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, PDFName, StandardFonts, type PDFForm } from 'pdf-lib'
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'
import {
  acroNameForSlot,
  FT6600_ACRO_TO_SLOT,
  FT6600_RENT_FREQUENCY_CHECKBOX_SLOTS,
  FT6600_SLOT_TO_ACRO,
  FT6600_TERM_CHECKBOX_SLOTS,
  type Ft6600SlotId,
} from './officialNswFt6600SlotMap.js'

export { FT6600_ACRO_TO_SLOT, FT6600_SLOT_TO_ACRO }

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

type TermSlot =
  | 'term_6_months_cb'
  | 'term_12_months_cb'
  | 'term_2_years_cb'
  | 'term_5_years_cb'
  | 'term_other_cb'
  | 'term_periodic_cb'

function resolveTermSlot(
  periodic: boolean,
  leaseLengthDescription: string,
  startDate: string,
  endDate: string | null,
): TermSlot {
  if (periodic) return 'term_periodic_cb'
  const d = leaseLengthDescription.trim().toLowerCase()
  if (/\bperiodic\b/.test(d) || /\bmonth[\s-]*to[\s-]*month\b/.test(d) || /\bflexible\b/i.test(d)) {
    return 'term_periodic_cb'
  }
  if (/\b5\s*years?\b|\b60\s*months?\b/.test(d)) return 'term_5_years_cb'
  if (/\b3\s*years?\b|\b36\s*months?\b/.test(d)) return 'term_2_years_cb'
  if (/\b2\s*years?\b|\b24\s*months?\b/.test(d)) return 'term_2_years_cb'
  if (/\b12\s*months?\b|\b1\s*year\b/.test(d)) return 'term_12_months_cb'
  if (/\b6\s*months?\b/.test(d)) return 'term_6_months_cb'
  if (endDate && startDate) {
    const start = new Date(startDate.slice(0, 10))
    const end = new Date(endDate.slice(0, 10))
    const months = Math.round((end.getTime() - start.getTime()) / (30.44 * 86400000))
    if (months <= 8) return 'term_6_months_cb'
    if (months <= 15) return 'term_12_months_cb'
    if (months <= 27) return 'term_2_years_cb'
    if (months <= 45) return 'term_2_years_cb'
    return 'term_5_years_cb'
  }
  return 'term_other_cb'
}

function setCheckboxWidgetStates(form: PDFForm, acroName: string, onIndices: Set<number>): void {
  try {
    const field = form.getCheckBox(acroName)
    const widgets = field.acroField.getWidgets()
    widgets.forEach((widget, i) => {
      widget.setAppearanceState(PDFName.of(onIndices.has(i) ? 'On' : 'Off'))
    })
    if (onIndices.size === 0) field.uncheck()
    else if (onIndices.size === widgets.length) field.check()
    else if (onIndices.size === 1 && widgets.length === 1) onIndices.has(0) ? field.check() : field.uncheck()
    else field.uncheck()
  } catch {
    /* field absent on revision */
  }
}

function uncheckAllWidgets(form: PDFForm, acroName: string): void {
  setCheckboxWidgetStates(form, acroName, new Set())
}

function setCheckInGroup(form: PDFForm, slots: Ft6600SlotId[], active: Ft6600SlotId | null): void {
  const seen = new Set<string>()
  for (const slot of slots) {
    const acro = acroNameForSlot(slot)
    if (seen.has(acro)) continue
    seen.add(acro)
    uncheckAllWidgets(form, acro)
  }
  if (!active) return
  const acro = acroNameForSlot(active)
  try {
    form.getCheckBox(acro).check()
  } catch {
    /* absent */
  }
}

type FillState = {
  textBySlot: Partial<Record<Ft6600SlotId, string>>
  checkSlots: Set<Ft6600SlotId>
}

function pushText(state: FillState, slot: Ft6600SlotId, value: string | null | undefined): void {
  const v = sanitizeDisplayText(value)
  if (!v) return
  state.textBySlot[slot] = v
}

function pushCheck(state: FillState, slot: Ft6600SlotId): void {
  state.checkSlots.add(slot)
}

function applyFillStateToForm(form: PDFForm, state: FillState): Array<[string, string]> {
  const assignments: Array<[string, string]> = []

  for (const [slot, value] of Object.entries(state.textBySlot) as Array<[Ft6600SlotId, string]>) {
    const name = acroNameForSlot(slot)
    assignments.push([name, value])
    try {
      form.getTextField(name).setText(value)
    } catch {
      /* absent */
    }
  }

  for (const slot of state.checkSlots) {
    const name = acroNameForSlot(slot)
    try {
      form.getCheckBox(name).check()
    } catch {
      /* absent */
    }
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
  const form = doc.getForm()
  const { filledFieldNames, assignments } = applyOfficialNswFt6600ScheduleFill(doc, props)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  try {
    form.updateFieldAppearances(font)
  } catch {
    /* some revisions omit appearance streams */
  }
  return { filledFieldNames, assignments }
}

export function applyOfficialNswFt6600ScheduleFill(
  doc: PDFDocument,
  props: NswResidentialTenancyAgreementProps,
): OfficialNswFt6600ScheduleFillResult {
  const form = doc.getForm()
  const state = buildFt6600FillState(props)

  for (const slot of FT6600_TERM_CHECKBOX_SLOTS) {
    const acro = acroNameForSlot(slot)
    uncheckAllWidgets(form, acro)
  }
  const termSlot = resolveTermSlot(
    props.term.periodic,
    props.term.leaseLengthDescription,
    props.term.startDate,
    props.term.endDate,
  )
  setCheckInGroup(form, FT6600_TERM_CHECKBOX_SLOTS, termSlot)

  for (const slot of FT6600_RENT_FREQUENCY_CHECKBOX_SLOTS) {
    uncheckAllWidgets(form, acroNameForSlot(slot))
  }
  uncheckAllWidgets(form, acroNameForSlot('rent_paid_bank_cb'))

  const assignments = applyFillStateToForm(form, state)

  const freq = props.rent.rentFrequency ?? 'weekly'
  if (freq === 'weekly') {
    try {
      form.getCheckBox(acroNameForSlot('rent_paid_week_cb')).check()
    } catch {
      /* absent */
    }
  }

  const paymentLower = sanitizeDisplayText(props.rent.paymentMethod).toLowerCase()
  if (/\bcentrepay\b/.test(paymentLower)) {
    /* centrepay line only */
  } else {
    try {
      form.getCheckBox(acroNameForSlot('rent_paid_bank_cb')).check()
    } catch {
      /* absent */
    }
  }

  uncheckAllWidgets(form, acroNameForSlot('strata_owners_corp_yes_cb'))
  try {
    form.getCheckBox(acroNameForSlot('strata_owners_corp_no_cb')).check()
  } catch {
    /* absent */
  }

  setCheckboxWidgetStates(form, acroNameForSlot('strata_bylaws_yes_cb'), new Set([1]))

  uncheckAllWidgets(form, acroNameForSlot('smoke_hardwired_cb'))
  uncheckAllWidgets(form, acroNameForSlot('smoke_battery_cb'))
  uncheckAllWidgets(form, acroNameForSlot('smoke_battery_replaceable_yes_cb'))
  uncheckAllWidgets(form, acroNameForSlot('smoke_hardwired_backup_yes_cb'))

  uncheckAllWidgets(form, acroNameForSlot('landlord_eservice_yes_cb'))
  uncheckAllWidgets(form, acroNameForSlot('landlord_eservice_no_cb'))
  if (props.electronicService.landlordConsentsToEmailService) {
    setCheckboxWidgetStates(form, acroNameForSlot('landlord_eservice_yes_cb'), new Set([0]))
  }

  uncheckAllWidgets(form, acroNameForSlot('tenant_eservice_yes_cb'))
  uncheckAllWidgets(form, acroNameForSlot('tenant_eservice_no_cb'))
  if (props.electronicService.tenantConsentsToEmailService) {
    setCheckboxWidgetStates(form, acroNameForSlot('tenant_eservice_yes_cb'), new Set([0]))
  }

  uncheckAllWidgets(form, acroNameForSlot('gas_embedded_no_cb'))

  const filledFieldNames = [...new Set(assignments.map(([n]) => n))]
  return { filledFieldNames, assignments }
}

function buildFt6600FillState(props: NswResidentialTenancyAgreementProps): FillState {
  const state: FillState = { textBySlot: {}, checkSlots: new Set() }

  const { landlord, tenant, premises, term, rent, bond, landlordAgent, urgentRepairsTradespeople, electronicService } =
    props
  const madeOn = agreementMadeOnFromGeneratedAt(props.generatedAt)
  const atSuburb = suburbFromAddressLine(premises.addressLine)
  const landlordAddr = parseAustralianAddressLine(landlord.addressLine)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const inclusions = props.additionalPremisesInclusions.map((s) => s.trim()).filter(Boolean).join('; ')
  const maxOcc =
    props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted)
      ? String(props.maxOccupantsPermitted)
      : null

  const landlordName = sanitizeDisplayText(landlord.fullName)
  const landlordPhone = sanitizeDisplayText(landlord.phone)

  pushText(state, 'agreement_made_on', madeOn)
  pushText(state, 'agreement_at', atSuburb)
  pushText(state, 'landlord_name_1', landlordName)
  pushText(state, 'landlord_contact', landlordPhone)
  if (!landlordAgent && landlordPhone) {
    pushText(state, 'landlord_phone_no_agent', landlordPhone)
  }
  if (landlordAddr.street) pushText(state, 'landlord_service_street', landlordAddr.street)
  if (landlordAddr.suburb) pushText(state, 'landlord_service_suburb', landlordAddr.suburb)
  if (landlordAddr.state) pushText(state, 'landlord_service_state', landlordAddr.state)
  if (landlordAddr.postcode) pushText(state, 'landlord_service_postcode', landlordAddr.postcode)

  if (landlord.companyName) {
    pushText(state, 'corp_name', sanitizeDisplayText(landlord.companyName))
    pushText(state, 'corp_suburb', landlordAddr.suburb)
    pushText(state, 'corp_state', landlordAddr.state)
    pushText(state, 'corp_postcode', landlordAddr.postcode)
  }

  pushText(state, 'tenant_name_1', sanitizeDisplayText(tenant.fullName))
  const coTenants = props.additionalTenantNames.map((s) => sanitizeDisplayText(s)).filter(Boolean)
  if (coTenants[0]) pushText(state, 'tenant_name_2', coTenants[0])
  if (coTenants.length > 1) pushText(state, 'tenant_name_3_or_other', coTenants.slice(1).join('; '))

  if (tenant.addressForServiceLine) {
    const tenantService = parseAustralianAddressLine(tenant.addressForServiceLine)
    if (tenantService.street) pushText(state, 'tenant_service_street', tenantService.street)
    if (tenantService.suburb) pushText(state, 'tenant_service_suburb', tenantService.suburb)
    if (tenantService.state) pushText(state, 'tenant_service_state', tenantService.state)
    if (tenantService.postcode) pushText(state, 'tenant_service_postcode', tenantService.postcode)
  }

  const tenantContact = [
    tenant.phone ? `Phone: ${sanitizeDisplayText(tenant.phone)}` : '',
    tenant.email ? `Email: ${sanitizeDisplayText(tenant.email)}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  if (tenantContact) pushText(state, 'tenant_contact', tenantContact)

  if (landlordAgent) {
    const agentAddr = parseAustralianAddressLine(landlordAgent.businessAddress)
    pushText(state, 'landlord_agent_name', sanitizeDisplayText(landlordAgent.name))
    const agentContact = [
      sanitizeDisplayText(landlordAgent.phone),
      landlordAgent.email ? `Email: ${sanitizeDisplayText(landlordAgent.email)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const agentAddressLine = sanitizeDisplayText(landlordAgent.businessAddress)
    pushText(
      state,
      'landlord_agent_address',
      agentContact ? `${agentAddressLine} · ${agentContact}` : agentAddressLine,
    )
    if (agentAddr.suburb) pushText(state, 'landlord_agent_suburb', agentAddr.suburb)
    if (agentAddr.state) pushText(state, 'landlord_agent_state', agentAddr.state)
    if (agentAddr.postcode) pushText(state, 'landlord_agent_postcode', agentAddr.postcode)
  }

  pushText(state, 'term_start_date', formatAuDate(term.startDate))
  pushText(state, 'rent_first_payment_date', formatAuDate(term.startDate))
  if (!term.periodic && term.endDate) {
    pushText(state, 'term_end_date', formatAuDate(term.endDate))
  }

  pushText(state, 'premises_address', sanitizeDisplayText(premises.addressLine))
  if (inclusions) pushCheck(state, 'premises_inclusions_cb')

  const rentAmountPlain = formatPlainMoney(rent.weeklyRent)
  const freq = rent.rentFrequency ?? 'weekly'
  if (freq === 'weekly') {
    pushText(state, 'rent_weekly_amount', rentAmountPlain)
  } else if (freq === 'fortnightly') {
    pushText(state, 'rent_fortnightly_amount', rentAmountPlain)
  } else {
    pushText(state, 'rent_other_frequency_amount', rentAmountPlain)
  }

  const paymentMethod = sanitizeDisplayText(rent.paymentMethod)
  const paymentLower = paymentMethod.toLowerCase()
  if (/\bcentrepay\b/.test(paymentLower)) {
    pushText(state, 'rent_centrepay_details', paymentMethod)
  } else {
    pushText(state, 'rent_payment_details', paymentMethod)
  }

  pushText(state, 'rent_due_day_text', rentWeekday)

  if (maxOcc) pushText(state, 'max_occupants', maxOcc)

  const electrician = sanitizeDisplayText(urgentRepairsTradespeople.electrician ?? '')
  if (electrician) {
    const phoneMatch = electrician.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText(state, 'urgent_electrician_name', electrician.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText(state, 'urgent_electrician_phone', phoneMatch[0].trim())
    } else {
      pushText(state, 'urgent_electrician_name', electrician)
    }
  }

  const plumber = sanitizeDisplayText(urgentRepairsTradespeople.plumber ?? '')
  if (plumber) {
    const phoneMatch = plumber.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText(state, 'urgent_plumber_name', plumber.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText(state, 'urgent_plumber_phone', phoneMatch[0].trim())
    } else {
      pushText(state, 'urgent_plumber_name', plumber)
    }
  }

  if (urgentRepairsTradespeople.other) {
    const other = sanitizeDisplayText(urgentRepairsTradespeople.other)
    const phoneMatch = other.match(/(\+?\d[\d\s-]{7,}\d)/)
    if (phoneMatch) {
      pushText(state, 'urgent_other_name', other.replace(phoneMatch[0], '').replace(/[-–]\s*$/, '').trim())
      pushText(state, 'urgent_other_phone', phoneMatch[0].trim())
    } else {
      pushText(state, 'urgent_other_name', other)
    }
  }

  if (bond.amount != null && Number.isFinite(bond.amount)) {
    pushText(state, 'bond_amount', formatPlainMoney(bond.amount))
    pushText(state, 'bond_paid_to_rbo_text', 'X')
  }

  const billsIncluded = props.billsIncluded === true
  pushText(state, 'water_usage_separate_text', billsIncluded ? 'No' : 'Yes')
  pushText(state, 'electricity_embedded_text', 'No')

  pushText(state, 'landlord_email_for_service', sanitizeDisplayText(electronicService.landlordEmail))
  pushText(state, 'tenant_email_for_service', sanitizeDisplayText(electronicService.tenantEmail))

  return state
}

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
