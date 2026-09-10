/**
 * Fill official RTA Form R18 v15 Sep25 (docs/qld/form-r18-v15.pdf).
 * Part 3 and Item 11 payment reference are fail-closed: overflow throws.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDict, PDFDocument, PDFName, StandardFonts, type PDFFont, type PDFForm } from 'pdf-lib'
import { QLD_FORM_R18_ACTION_BUTTONS, QLD_FORM_R18_CHECKS as C, QLD_FORM_R18_FIELDS as F } from './qldFormR18Fields.js'
import {
  assertQldFormR18Part3Fits,
  QLD_FORM_R18_PART3_SPECIAL_TERMS,
} from './qldFormR18Part3.js'
import {
  assertQldFormR18PaymentReferenceFits,
  QLD_FORM_R18_PAYMENT_REFERENCE_FONT_SIZE,
  sanitizeQldFormR18PaymentReference,
} from './qldFormR18PaymentReference.js'
import { flattenAndCleanForm, saveNormalizedPdf } from './officialNswFt6600PdfNormalize.js'
import { removeAcroFormFieldsBeforeFlatten } from './officialQldForm18aFill.js'

export const OFFICIAL_QLD_FORM_R18_TEMPLATE_REL = join('docs', 'qld', 'form-r18-v15.pdf')

export type QldFormR18NoticeChannel = {
  permitted: boolean | null
  address: string
}

export type QldFormR18FillProps = {
  providerName: string
  providerStreet: string
  providerSuburbLine: string
  providerPostcode: string
  providerPhone: string
  providerMobile: string
  providerEmail: string
  providerAbn: string
  residentFullName: string
  residentPhone: string
  residentEmail: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactEmail: string
  premisesStreet: string
  premisesSuburbLine: string
  premisesPostcode: string
  roomNumber: string
  inclusions: string
  studentAccommodation: boolean
  termFixed: boolean
  startDateIso: string
  endDateIso: string | null
  weeklyRent: number
  bondAmount: number | null
  rentDueWeekday: string
  method1: string
  method2: string
  bankName: string
  accountName: string
  bsb: string
  accountNumber: string
  paymentReference: string
  lastRentIncreaseIso: string | null
  utilitiesLine: string
  personsInRoom: number
  personsAtPremises: number
  houseRulesProvided: boolean
  providerNoticeEmail: QldFormR18NoticeChannel
  providerNoticeSms: QldFormR18NoticeChannel
  residentNoticeEmail: QldFormR18NoticeChannel
  residentNoticeSms: QldFormR18NoticeChannel
  specialTermsText?: string
}

export type OfficialQldFormR18FillResult = {
  pdfBytes: Uint8Array
  filledFieldNames: string[]
}

function sanitizeDisplayText(value: string | null | undefined): string {
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

function formatBsb(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits
}

function setCheck(form: PDFForm, name: string, checked: boolean) {
  try {
    const box = form.getCheckBox(name)
    if (checked) box.check()
    else box.uncheck()
  } catch {
    /* absent */
  }
}

function setYesNo(form: PDFForm, yes: string, no: string, permitted: boolean | null) {
  if (permitted === true) {
    setCheck(form, yes, true)
    setCheck(form, no, false)
  } else if (permitted === false) {
    setCheck(form, yes, false)
    setCheck(form, no, true)
  } else {
    setCheck(form, yes, false)
    setCheck(form, no, false)
  }
}

function pushTextFit(
  form: PDFForm,
  name: string,
  value: string | null | undefined,
  into: string[],
  font: PDFFont,
  maxSize = 10,
  minSize = 6,
) {
  const v = sanitizeDisplayText(value)
  if (!v) return
  try {
    const field = form.getTextField(name)
    const rect = field.acroField.getWidgets()[0]?.getRectangle()
    let size = maxSize
    if (rect) {
      const maxWidth = Math.max(1, rect.width - 2)
      while (size > minSize && font.widthOfTextAtSize(v, size) > maxWidth) {
        size -= 0.5
      }
    }
    field.setFontSize(size)
    field.setText(v)
    into.push(name)
  } catch {
    /* absent */
  }
}

function pushText(form: PDFForm, name: string, value: string | null | undefined, into: string[]) {
  const v = sanitizeDisplayText(value)
  if (!v) return
  try {
    form.getTextField(name).setText(v)
    into.push(name)
  } catch {
    /* absent */
  }
}

function pushPaymentReference(
  form: PDFForm,
  name: string,
  value: string | null | undefined,
  into: string[],
  font: PDFFont,
) {
  const v = sanitizeQldFormR18PaymentReference(value)
  const field = form.getTextField(name)
  const rect = field.acroField.getWidgets()[0]?.getRectangle()
  if (!rect) {
    throw new Error('Form R18 Item 11 Payment reference widget is missing.')
  }
  assertQldFormR18PaymentReferenceFits(v, font, rect)
  field.setFontSize(QLD_FORM_R18_PAYMENT_REFERENCE_FONT_SIZE)
  field.setText(v)
  into.push(name)
}

export async function loadOfficialQldFormR18Template(): Promise<PDFDocument> {
  return PDFDocument.load(readFileSync(join(process.cwd(), OFFICIAL_QLD_FORM_R18_TEMPLATE_REL)), {
    ignoreEncryption: true,
  })
}

export async function applyOfficialQldFormR18Fill(
  doc: PDFDocument,
  props: QldFormR18FillProps,
): Promise<{ filledFieldNames: string[]; specialTerms: string }> {
  const form = doc.getForm()
  const filled: string[] = []
  const specialTerms = props.specialTermsText ?? QLD_FORM_R18_PART3_SPECIAL_TERMS
  const font = await doc.embedFont(StandardFonts.Helvetica)

  const specialField = form.getTextField(F.Special_terms)
  const specialRect = specialField.acroField.getWidgets()[0]?.getRectangle()
  if (!specialRect) {
    throw new Error('Form R18 Part 3 Special terms widget is missing.')
  }
  assertQldFormR18Part3Fits(specialTerms, font, specialRect)

  pushText(form, F.Provider_name, props.providerName, filled)
  pushText(form, F.Provider_address_1, props.providerStreet, filled)
  pushText(form, F.Provider_address_2, props.providerSuburbLine, filled)
  pushText(form, F.Provider_postcode, props.providerPostcode, filled)
  pushText(form, F.Provider_phone, props.providerPhone, filled)
  pushText(form, F.Provider_mobile, props.providerMobile, filled)
  pushText(form, F.Provider_email, props.providerEmail, filled)
  pushText(form, F.Provider_abn, props.providerAbn, filled)

  pushText(form, F.Resident1_full_name, props.residentFullName, filled)
  pushText(form, F.Resident1_phone, props.residentPhone, filled)
  pushText(form, F.Resident1_email, props.residentEmail, filled)
  pushText(form, F.Resident1_emergency_name, props.emergencyContactName, filled)
  pushText(form, F.Resident1_emergency_phone, props.emergencyContactPhone, filled)
  pushText(form, F.Resident1_emergency_email, props.emergencyContactEmail, filled)

  pushText(form, F.Premises_address_1, props.premisesStreet, filled)
  pushText(form, F.Premises_address_2, props.premisesSuburbLine, filled)
  pushText(form, F.Premises_postcode, props.premisesPostcode, filled)
  pushTextFit(form, F.Room_number, props.roomNumber, filled, font)
  pushText(form, F.Inclusions, props.inclusions, filled)

  setCheck(form, C.level_1, true)
  setCheck(form, C.level_2, false)
  setCheck(form, C.level_3, false)
  setCheck(form, C.student_accommodation, props.studentAccommodation)
  setCheck(form, C.item15_level_1, true)
  setCheck(form, C.item15_level_2, false)
  setCheck(form, C.item15_level_3, false)
  setCheck(form, C.breakfast, false)
  setCheck(form, C.lunch, false)
  setCheck(form, C.dinner, false)

  setCheck(form, C.term_fixed, props.termFixed)
  setCheck(form, C.term_periodic, !props.termFixed)
  pushText(form, F.Start_date, formatAuDate(props.startDateIso), filled)
  if (props.termFixed && props.endDateIso) {
    pushText(form, F.End_date, formatAuDate(props.endDateIso), filled)
  }

  const rent = formatPlainMoney(props.weeklyRent)
  pushText(form, F.Rent_amount, rent, filled)
  pushText(form, F.Accommodation, rent, filled)
  setCheck(form, C.rent_weekly, true)
  setCheck(form, C.rent_fortnightly, false)
  setCheck(form, C.rent_monthly, false)
  pushText(form, F.Rent_due_day, props.rentDueWeekday, filled)
  pushText(form, F.Rent_due_period, 'week', filled)

  pushText(form, F.Method_1, props.method1, filled)
  pushText(form, F.Method_2, props.method2, filled)
  pushText(form, F.Bank_name, props.bankName, filled)
  pushText(form, F.Account_name, props.accountName, filled)
  pushText(form, F.Bsb, formatBsb(props.bsb), filled)
  pushText(form, F.Account_number, props.accountNumber.replace(/\D/g, ''), filled)
  pushPaymentReference(form, F.Payment_reference, props.paymentReference, filled, font)

  setCheck(form, C.rent_can_increase_yes, false)
  setCheck(form, C.rent_can_increase_no, true)
  if (props.lastRentIncreaseIso) {
    pushText(form, F.Last_rent_increase, formatAuDate(props.lastRentIncreaseIso), filled)
  }

  if (props.bondAmount != null && props.bondAmount > 0) {
    pushText(form, F.Bond_amount, formatPlainMoney(props.bondAmount), filled)
  }

  pushText(form, F.Utilities, props.utilitiesLine, filled)
  pushText(form, F.Persons_in_room, String(props.personsInRoom), filled)
  pushText(form, F.Persons_at_premises, String(props.personsAtPremises), filled)

  setCheck(form, C.house_rules_given_yes, props.houseRulesProvided)
  setCheck(form, C.house_rules_given_no, !props.houseRulesProvided)
  setCheck(form, C.bylaws_applicable_yes, false)
  setCheck(form, C.bylaws_applicable_no, true)
  setCheck(form, C.bylaws_copy_yes, false)
  setCheck(form, C.bylaws_copy_no, true)

  setYesNo(
    form,
    C.notice_provider_email_yes,
    C.notice_provider_email_no,
    props.providerNoticeEmail.permitted,
  )
  setYesNo(form, C.notice_provider_sms_yes, C.notice_provider_sms_no, props.providerNoticeSms.permitted)
  setYesNo(form, C.notice_provider_fax_yes, C.notice_provider_fax_no, false)
  if (props.providerNoticeEmail.permitted) {
    pushText(form, F.Notice_provider_email, props.providerNoticeEmail.address, filled)
  }
  if (props.providerNoticeSms.permitted) {
    pushText(form, F.Notice_provider_sms, props.providerNoticeSms.address, filled)
  }

  setYesNo(
    form,
    C.notice_resident_email_yes,
    C.notice_resident_email_no,
    props.residentNoticeEmail.permitted,
  )
  setYesNo(form, C.notice_resident_sms_yes, C.notice_resident_sms_no, props.residentNoticeSms.permitted)
  setYesNo(form, C.notice_resident_fax_yes, C.notice_resident_fax_no, false)
  if (props.residentNoticeEmail.permitted) {
    pushText(form, F.Notice_resident_email, props.residentNoticeEmail.address, filled)
  }
  if (props.residentNoticeSms.permitted) {
    pushText(form, F.Notice_resident_sms, props.residentNoticeSms.address, filled)
  }

  setYesNo(form, C.notice_agent_email_yes, C.notice_agent_email_no, false)
  setYesNo(form, C.notice_agent_sms_yes, C.notice_agent_sms_no, false)
  setYesNo(form, C.notice_agent_fax_yes, C.notice_agent_fax_no, false)
  setYesNo(form, C.notice_representative_email_yes, C.notice_representative_email_no, false)
  setYesNo(form, C.notice_representative_sms_yes, C.notice_representative_sms_no, false)
  setYesNo(form, C.notice_representative_fax_yes, C.notice_representative_fax_no, false)

  pushText(form, F.Sign_provider_name, props.providerName, filled)
  pushText(form, F.Sign_resident_1_name, props.residentFullName, filled)
  form.getTextField(F.Special_terms).setText(specialTerms)
  filled.push(F.Special_terms)
  return { filledFieldNames: [...new Set(filled)], specialTerms }
}

export async function fillOfficialQldFormR18Pdf(props: QldFormR18FillProps): Promise<OfficialQldFormR18FillResult> {
  const doc = await loadOfficialQldFormR18Template()
  const { filledFieldNames } = await applyOfficialQldFormR18Fill(doc, props)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const form = doc.getForm()
  form.updateFieldAppearances(font)
  removeAcroFormFieldsBeforeFlatten(doc, QLD_FORM_R18_ACTION_BUTTONS)
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (acroFormRef) {
    const acroForm = doc.context.lookup(acroFormRef, PDFDict)
    acroForm.delete(PDFName.of('NeedAppearances'))
  }
  flattenAndCleanForm(doc)
  const pdfBytes = await saveNormalizedPdf(doc)
  return { pdfBytes, filledFieldNames }
}
