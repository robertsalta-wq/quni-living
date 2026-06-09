/**
 * Fill QLD RTA Form 18a via docs/qld/form18a-renamed.pdf (official layout, AcroForm by name).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  type PDFForm,
} from 'pdf-lib'
import type { QldGeneralTenancyAgreementProps } from '../../documents/rtaTypes.js'
import {
  QLD_FORM18A_ACTION_BUTTONS,
  QLD_FORM18A_RENAMED_FIELDS as F,
} from './qldForm18aRenamedFields.js'
import { item9RentPaymentMethodPair } from './qldForm18aRentPayment.js'
import {
  burnInOfficialQldForm18aShrinkFields,
  QLD_FORM18A_SHRINK_TO_FIT_TEXT_FIELDS,
} from './officialQldForm18aBurnIn.js'
import {
  composeQldForm18aSpecialTermsText,
  resolveUtilitiesScheduleOverflow,
} from './qldForm18aScheduleOverflow.js'
import {
  flattenAndCleanForm,
  saveNormalizedPdf,
} from './officialNswFt6600PdfNormalize.js'

export { QLD_FORM18A_RENAMED_FIELDS } from './qldForm18aRenamedFields.js'

export const OFFICIAL_QLD_FORM18A_TEMPLATE_REL = join('docs', 'qld', 'form18a-renamed.pdf')

const TEMPLATE_REL = OFFICIAL_QLD_FORM18A_TEMPLATE_REL

const RENT_PERIOD_CHECKBOXES = [
  F.rent_period_weekly,
  F.rent_period_fortnightly,
  F.rent_period_monthly,
] as const

const TERM_CHECKBOXES = [F.term_fixed, F.term_periodic] as const

type YesNoPair = { yes: string; no: string }

const NOTICE_LESSOR_PAIRS: YesNoPair[] = [
  { yes: F.notice_lessor_email_yes, no: F.notice_lessor_email_no },
  { yes: F.notice_lessor_text_yes, no: F.notice_lessor_text_no },
  { yes: F.notice_lessor_fax_yes, no: F.notice_lessor_fax_no },
]

const NOTICE_TENANT_PAIRS: YesNoPair[] = [
  { yes: F.notice_tenant_email_yes, no: F.notice_tenant_email_no },
  { yes: F.notice_tenant_text_yes, no: F.notice_tenant_text_no },
  { yes: F.notice_tenant_fax_yes, no: F.notice_tenant_fax_no },
]

const NOTICE_AGENT_PAIRS: YesNoPair[] = [
  { yes: F.notice_agent_email_yes, no: F.notice_agent_email_no },
  { yes: F.notice_agent_text_yes, no: F.notice_agent_text_no },
  { yes: F.notice_agent_fax_yes, no: F.notice_agent_fax_no },
]

export async function loadOfficialQldForm18aTemplate(): Promise<PDFDocument> {
  const templatePath = join(process.cwd(), TEMPLATE_REL)
  return PDFDocument.load(readFileSync(templatePath), { ignoreEncryption: true })
}

export function sanitizeDisplayText(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\s*-\s*/g, ' ')
    .trim()
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

function rentFrequencyNoun(freq: 'weekly' | 'fortnightly' | 'monthly'): string {
  if (freq === 'fortnightly') return 'fortnight'
  if (freq === 'monthly') return 'month'
  return 'week'
}

function splitTradeLine(raw: string | null): { name: string; phone: string } {
  const line = sanitizeDisplayText(raw ?? '')
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

function setYesNoPair(form: PDFForm, pair: YesNoPair, yes: boolean) {
  setCheck(form, pair.yes, yes)
  setCheck(form, pair.no, !yes)
}

type FillAssignments = {
  text: Map<string, string>
  checks: Set<string>
}

function pushText(map: Map<string, string>, field: string, value: string | null | undefined) {
  const v = sanitizeDisplayText(value)
  if (v) map.set(field, v)
}

const SHRINK_TO_FIT_FIELD_SET = new Set<string>(QLD_FORM18A_SHRINK_TO_FIT_TEXT_FIELDS)

function applyAssignments(form: PDFForm, state: FillAssignments): Array<[string, string]> {
  const assignments: Array<[string, string]> = []
  for (const [name, value] of state.text) {
    assignments.push([name, value])
    if (SHRINK_TO_FIT_FIELD_SET.has(name)) continue
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

/**
 * Remove action-button widget annotations and AcroForm entries before flatten
 * so button graphics are not baked into page content.
 */
export function removeAcroFormFieldsBeforeFlatten(doc: PDFDocument, fieldNames: readonly string[]): number {
  const ctx = doc.context
  const wanted = new Set(fieldNames)
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (!acroFormRef) return 0
  const acroForm = ctx.lookup(acroFormRef, PDFDict)
  const fieldsArr = acroForm.lookup(PDFName.of('Fields'), PDFArray)

  const fieldRefsToRemove = new Set<string>()
  const widgetRefsToRemove = new Set<string>()

  const collectWidgetRefs = (dict: PDFDict, fieldRefKey: string) => {
    const subtype = dict.get(PDFName.of('Subtype'))?.toString()
    if (subtype === '/Widget') {
      widgetRefsToRemove.add(fieldRefKey)
      return
    }
    const kids = dict.lookup(PDFName.of('Kids'), PDFArray)
    if (!kids) return
    for (let k = 0; k < kids.size(); k++) {
      const kidRef = kids.get(k)
      collectWidgetRefs(ctx.lookup(kidRef, PDFDict), kidRef.toString())
    }
  }

  for (let i = 0; i < fieldsArr.size(); i++) {
    const fieldRef = fieldsArr.get(i)
    const fieldDict = ctx.lookup(fieldRef, PDFDict)
    const t = fieldDict.get(PDFName.of('T'))
    if (!(t instanceof PDFString)) continue
    const name = t.decodeText()
    if (!wanted.has(name)) continue
    fieldRefsToRemove.add(fieldRef.toString())
    collectWidgetRefs(fieldDict, fieldRef.toString())
  }

  let annotsRemoved = 0
  for (const page of doc.getPages()) {
    const annots = page.node.Annots?.()
    if (!annots) continue
    const kept = PDFArray.withContext(ctx)
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i)
      if (widgetRefsToRemove.has(ref.toString())) {
        annotsRemoved++
        continue
      }
      kept.push(ref)
    }
    if (kept.size() === 0) {
      page.node.delete(PDFName.of('Annots'))
    } else if (kept.size() < annots.size()) {
      page.node.set(PDFName.of('Annots'), kept)
    }
  }

  const newFields = PDFArray.withContext(ctx)
  for (let i = 0; i < fieldsArr.size(); i++) {
    const ref = fieldsArr.get(i)
    if (!fieldRefsToRemove.has(ref.toString())) newFields.push(ref)
  }
  acroForm.set(PDFName.of('Fields'), newFields)

  return annotsRemoved
}

function buildFillAssignments(props: QldGeneralTenancyAgreementProps): FillAssignments {
  const text = new Map<string, string>()
  const checks = new Set<string>()

  const {
    landlord,
    tenant,
    premises,
    term,
    rent,
    bond,
    landlordAgent,
    urgentRepairsTradespeople,
    electronicService,
    premisesInclusionsLine,
    lastRentIncreaseDate,
    landlordPostcode,
    premisesPostcode,
    rentPaymentBankDetails,
    rentPaymentPreference,
  } = props

  const landlordAddr = parseAustralianAddressLine(landlord.addressLine)
  const premisesAddr = parseAustralianAddressLine(premises.addressLine)
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate)
  const freq = rent.rentFrequency ?? 'weekly'
  const periodWord = rentFrequencyNoun(freq)
  const item9 = item9RentPaymentMethodPair(rentPaymentPreference)

  pushText(text, F.Lessor_name_trading_name, landlord.fullName)
  pushText(text, F.Lessor_address, landlordAddr.street || landlord.addressLine)
  pushText(
    text,
    F.Lessor_address2,
    [landlordAddr.suburb, landlordAddr.state].filter(Boolean).join(', '),
  )
  pushText(text, F.Lessor_postcode, landlordPostcode.trim() || landlordAddr.postcode)
  pushText(text, F.Lessor_phone_number, landlord.phone)
  pushText(text, F.Lessor_email_address, landlord.email)

  pushText(text, F.Tenant1_full_name_s, tenant.fullName)
  pushText(text, F.Tenant1_phone_number, tenant.phone)
  pushText(text, F.Tenant1_email, tenant.email)
  if (tenant.emergencyContactName) pushText(text, F.Emengency_contact_full_name_s1, tenant.emergencyContactName)
  if (tenant.emergencyContactPhone) pushText(text, F.Emengency_contact_phone1, tenant.emergencyContactPhone)

  const tenant2 = props.additionalTenantNames[0]?.trim()
  const tenant3 = props.additionalTenantNames[1]?.trim()
  if (tenant2) pushText(text, F.Tenant2_full_name_s, tenant2)
  if (tenant3) pushText(text, F.Tenant3_full_name_s, tenant3)

  if (landlordAgent) {
    const agentAddr = parseAustralianAddressLine(landlordAgent.businessAddress)
    pushText(text, F.Lessor_s_agent_full_name_trading_name, landlordAgent.name)
    pushText(text, F.Lessor_s_agent_address_line1, agentAddr.street || landlordAgent.businessAddress)
    pushText(
      text,
      F.Lessor_s_agent_address_line2,
      [agentAddr.suburb, agentAddr.state].filter(Boolean).join(', '),
    )
    pushText(text, F.Lessor_s_agent_phone_number, landlordAgent.phone)
    if (landlordAgent.email) pushText(text, F.Lessor_s_agent_email, landlordAgent.email)
  }

  pushText(text, F.Lessors_email, electronicService.landlordEmail)
  pushText(text, F.Tenant_s_email, electronicService.tenantEmail)
  if (landlordAgent?.email) pushText(text, F.Agents_email, landlordAgent.email)

  pushText(text, F.Address_of_the_rental_premises1, premisesAddr.street || premises.addressLine)
  pushText(
    text,
    F.Address_of_the_rental_premises2,
    [premisesAddr.suburb, premisesAddr.state].filter(Boolean).join(', '),
  )
  pushText(text, F.Postcode, premisesPostcode.trim() || premisesAddr.postcode)

  const incLine =
    premisesInclusionsLine && premisesInclusionsLine.trim() ? premisesInclusionsLine.trim() : '-'
  pushText(text, F.Inclusions_provided1, incLine)
  pushText(text, F.Details_of_current_repair_orders_for_the_rental_premises_or_inclusions2, 'None stated')

  pushText(text, F.Start_date_dd_mm_yyyy, formatAuDate(term.startDate))
  if (!term.periodic && term.endDate) {
    pushText(text, F.End_date_dd_mm_yyyy, formatAuDate(term.endDate))
  }

  pushText(text, F.Rent_amount, formatPlainMoney(rent.weeklyRent))
  pushText(text, F.Day_the_rent_must_be_paid_on, rentWeekday)
  pushText(text, F.week_fortnight_or_month, periodWord)

  pushText(text, F.Method1, item9.method1)
  pushText(text, F.Method2, item9.method2)
  if (rentPaymentBankDetails) {
    pushText(text, F.BSB_number, rentPaymentBankDetails.bsb)
    pushText(text, F.Bank_building_society_credit_union, rentPaymentBankDetails.bankName)
    pushText(text, F.Account_number, rentPaymentBankDetails.accountNumber)
    pushText(text, F.Account_name, rentPaymentBankDetails.accountName)
    pushText(
      text,
      F.Payment_reference,
      `Booking ${props.documentId.slice(0, 8)}`,
    )
  }

  pushText(text, F.Place_of_rent_payment, 'As agreed - electronic transfer')
  if (lastRentIncreaseDate) {
    pushText(text, F.Day_of_last_rent_increase_dd_mm_yyyy, formatAuDate(lastRentIncreaseDate))
  }

  if (bond.amount != null && Number.isFinite(bond.amount)) {
    pushText(text, F.Rental_bond_amount, formatPlainMoney(bond.amount))
  }

  const utilities = props.utilitiesResolution
  const tenantPaysOtherServices = utilities
    ? utilities.services.other.tenantMustPay
    : false
  if (tenantPaysOtherServices) {
    pushText(
      text,
      F.Type_of_services_the_tenant_must_pay_for,
      'As summarised in the Quni Platform Addendum',
    )
  }

  if (props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted)) {
    pushText(text, F.Number_of_persons_allowed_to_reside_at_the_premises, String(props.maxOccupantsPermitted))
  }

  const elec = splitTradeLine(urgentRepairsTradespeople.electrician)
  const plumb = splitTradeLine(urgentRepairsTradespeople.plumber)
  const other = splitTradeLine(urgentRepairsTradespeople.other)
  if (elec.name) pushText(text, F.Nominated_electrical_repairer, elec.name)
  if (elec.phone) pushText(text, F.Phone_number2, elec.phone)
  if (plumb.name) pushText(text, F.Nominated_plumbing_repairer, plumb.name)
  if (plumb.phone) pushText(text, F.Phone_number3, plumb.phone)
  if (other.name) pushText(text, F.Nominated_other_repairer, other.name)
  if (other.phone) pushText(text, F.Phone_number4, other.phone)

  if (
    !elec.name &&
    !plumb.name &&
    !other.name
  ) {
    pushText(text, F.Name, `${landlord.fullName} - ${landlord.phone}`)
    pushText(text, F.Phone_number5, landlord.phone)
  }

  pushText(text, F.Type_of_pets_approved1, 'None unless agreed in writing by the lessor')

  pushText(text, F.Lessor_agent_name_trading_name, landlord.fullName)
  pushText(text, F.Name_of_tenant1, tenant.fullName)
  if (tenant2) pushText(text, F.Name_of_tenant2, tenant2)
  if (tenant3) pushText(text, F.Name_of_tenant3, tenant3)

  checks.add(term.periodic ? F.term_periodic : F.term_fixed)

  if (freq === 'weekly') checks.add(F.rent_period_weekly)
  else if (freq === 'fortnightly') checks.add(F.rent_period_fortnightly)
  else checks.add(F.rent_period_monthly)

  for (const pair of NOTICE_LESSOR_PAIRS) {
    const isEmail = pair.yes === F.notice_lessor_email_yes
    setYesNoPairChecks(checks, pair, isEmail ? electronicService.landlordConsentsToEmailService : false)
  }
  for (const pair of NOTICE_TENANT_PAIRS) {
    const isEmail = pair.yes === F.notice_tenant_email_yes
    setYesNoPairChecks(checks, pair, isEmail ? electronicService.tenantConsentsToEmailService : false)
  }
  for (const pair of NOTICE_AGENT_PAIRS) {
    setYesNoPairChecks(checks, pair, false)
  }

  if (utilities) {
    const elec = utilities.services.electricity
    const gas = utilities.services.gas
    const water = utilities.services.water
    const phone = utilities.services.phone
    const other = utilities.services.other

    checks.add(elec.tenantMustPay ? F.services_electricity_yes : F.services_electricity_no)
    checks.add(gas.tenantMustPay ? F.services_gas_yes : F.services_gas_no)
    checks.add(phone.tenantMustPay ? F.services_phone_yes : F.services_phone_no)
    checks.add(other.tenantMustPay ? F.services_other_yes : F.services_other_no)
    checks.add(water.tenantMustPay ? F.water_charge_yes : F.water_charge_no)

  } else {
    checks.add(F.water_charge_no)
    checks.add(F.services_electricity_no)
    checks.add(F.services_gas_no)
    checks.add(F.services_phone_no)
    if (tenantPaysOtherServices) checks.add(F.services_other_yes)
    else checks.add(F.services_other_no)
  }

  checks.add(F.bylaws_applicable_no)
  checks.add(F.bylaws_copy_given_no)
  checks.add(F.repairers_first_contact_yes)

  return { text, checks }
}

function yesNoFromChecks(checks: Set<string>, pair: YesNoPair): boolean {
  return checks.has(pair.yes)
}

function setYesNoPairChecks(checks: Set<string>, pair: YesNoPair, yes: boolean) {
  if (yes) {
    checks.add(pair.yes)
  } else {
    checks.add(pair.no)
  }
}

export type OfficialQldForm18aFillResult = {
  pdfBytes: Uint8Array
  filledFieldNames: string[]
  acroFormFieldCountAfterFlatten: number
  actionButtonsRemoved: number
}

export type OfficialQldForm18aScheduleFillResult = {
  filledFieldNames: string[]
  assignments: Array<[string, string]>
}

export async function applyOfficialQldForm18aScheduleFill(
  doc: PDFDocument,
  props: QldGeneralTenancyAgreementProps,
): Promise<OfficialQldForm18aScheduleFillResult> {
  const form = doc.getForm()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const state = buildFillAssignments(props)

  let utilitiesOverflowLines: string[] = []
  if (props.utilitiesResolution) {
    const overflow = resolveUtilitiesScheduleOverflow(form, font, props.utilitiesResolution)
    utilitiesOverflowLines = overflow.specialTermsLines
    for (const [name, value] of overflow.scheduleAssignments) {
      state.text.set(name, value)
    }
  }

  const specialTermsText = composeQldForm18aSpecialTermsText({
    utilitiesOverflowLines,
    specialConditions: props.specialConditions,
    bookingNotes: props.bookingNotes,
  })
  state.text.set(F.Special_terms, specialTermsText)

  uncheckAll(form, TERM_CHECKBOXES)
  uncheckAll(form, RENT_PERIOD_CHECKBOXES)
  for (const pair of [...NOTICE_LESSOR_PAIRS, ...NOTICE_TENANT_PAIRS, ...NOTICE_AGENT_PAIRS]) {
    uncheckAll(form, [pair.yes, pair.no])
  }
  uncheckAll(form, [F.water_charge_yes, F.water_charge_no])
  uncheckAll(form, [F.bylaws_applicable_yes, F.bylaws_applicable_no])
  uncheckAll(form, [F.bylaws_copy_given_yes, F.bylaws_copy_given_no])
  uncheckAll(form, [
    F.services_electricity_yes,
    F.services_electricity_no,
    F.services_gas_yes,
    F.services_gas_no,
    F.services_phone_yes,
    F.services_phone_no,
    F.services_other_yes,
    F.services_other_no,
  ])
  uncheckAll(form, [F.repairers_first_contact_yes, F.repairers_first_contact_no])

  if (state.checks.has(F.term_periodic)) setCheck(form, F.term_periodic, true)
  else setCheck(form, F.term_fixed, true)

  for (const name of RENT_PERIOD_CHECKBOXES) {
    setCheck(form, name, state.checks.has(name))
  }

  for (const pair of NOTICE_LESSOR_PAIRS) {
    const yes = state.checks.has(pair.yes)
    setYesNoPair(form, pair, yes)
  }
  for (const pair of NOTICE_TENANT_PAIRS) {
    const yes = state.checks.has(pair.yes)
    setYesNoPair(form, pair, yes)
  }
  for (const pair of NOTICE_AGENT_PAIRS) {
    setYesNoPair(form, pair, false)
  }

  const waterPair = { yes: F.water_charge_yes, no: F.water_charge_no }
  const elecPair = { yes: F.services_electricity_yes, no: F.services_electricity_no }
  const gasPair = { yes: F.services_gas_yes, no: F.services_gas_no }
  const phonePair = { yes: F.services_phone_yes, no: F.services_phone_no }
  const otherPair = { yes: F.services_other_yes, no: F.services_other_no }

  setYesNoPair(form, waterPair, yesNoFromChecks(state.checks, waterPair))
  setYesNoPair(form, { yes: F.bylaws_applicable_yes, no: F.bylaws_applicable_no }, false)
  setYesNoPair(form, { yes: F.bylaws_copy_given_yes, no: F.bylaws_copy_given_no }, false)
  setYesNoPair(form, elecPair, yesNoFromChecks(state.checks, elecPair))
  setYesNoPair(form, gasPair, yesNoFromChecks(state.checks, gasPair))
  setYesNoPair(form, phonePair, yesNoFromChecks(state.checks, phonePair))
  setYesNoPair(form, otherPair, yesNoFromChecks(state.checks, otherPair))
  setYesNoPair(form, { yes: F.repairers_first_contact_yes, no: F.repairers_first_contact_no }, true)

  const assignments = applyAssignments(form, state)
  return { filledFieldNames: [...new Set(assignments.map(([n]) => n))], assignments }
}

export async function prepareOfficialQldForm18aScheduleForFlatten(
  doc: PDFDocument,
  props: QldGeneralTenancyAgreementProps,
): Promise<OfficialQldForm18aScheduleFillResult> {
  const result = await applyOfficialQldForm18aScheduleFill(doc, props)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.getForm().updateFieldAppearances(font)
  burnInOfficialQldForm18aShrinkFields(doc, result.assignments, font)
  removeAcroFormFieldsBeforeFlatten(doc, QLD_FORM18A_SHRINK_TO_FIT_TEXT_FIELDS)
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (acroFormRef) {
    const acroForm = doc.context.lookup(acroFormRef, PDFDict)
    acroForm.delete(PDFName.of('NeedAppearances'))
  }
  return result
}

export async function fillOfficialQldForm18aPdf(
  props: QldGeneralTenancyAgreementProps,
): Promise<OfficialQldForm18aFillResult> {
  const doc = await loadOfficialQldForm18aTemplate()
  const { filledFieldNames } = await prepareOfficialQldForm18aScheduleForFlatten(doc, props)
  const actionButtonsRemoved = removeAcroFormFieldsBeforeFlatten(doc, QLD_FORM18A_ACTION_BUTTONS)
  flattenAndCleanForm(doc)
  const acroFormFieldCountAfterFlatten = 0
  const pdfBytes = await saveNormalizedPdf(doc)
  return { pdfBytes, filledFieldNames, acroFormFieldCountAfterFlatten, actionButtonsRemoved }
}
