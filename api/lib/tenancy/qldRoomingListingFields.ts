/**
 * QLD rooming listing particulars for Form R18 (Stage 2).
 * Classification still lives in qldClassification.ts. Service level and the student tick are not routing inputs.
 */

import { parseQldSharesKitchenOrBathroom } from './qldClassification.js'

export { parseQldSharesKitchenOrBathroom }

export const QLD_ROOMING_SERVICE_LEVEL_1 = 'level_1' as const

export type QldYesNo = '' | 'yes' | 'no'

export type QldNoticeConsentFormState = {
  emailPermitted: QldYesNo
  emailAddress: string
  smsPermitted: QldYesNo
  smsAddress: string
}

export type QldRoomingListingFormState = {
  sharesKitchenOrBathroom: QldYesNo
  studentAccommodation: boolean
  personsAtPremises: string
  rentPaymentMethod1: string
  rentPaymentMethod2: string
  rentPayeeBankName: string
  rentPayeeAccountName: string
  rentPayeeBsb: string
  rentPayeeAccountNumber: string
  rentPaymentReference: string
  rentLastIncreasedOn: string
  providerNotice: QldNoticeConsentFormState
}

export function emptyQldNoticeConsentFormState(): QldNoticeConsentFormState {
  return {
    emailPermitted: '',
    emailAddress: '',
    smsPermitted: '',
    smsAddress: '',
  }
}

export function parseQldRoomingListingFormDraft(raw: unknown): QldRoomingListingFormState {
  const empty = emptyQldRoomingListingFormState()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty
  const o = raw as Record<string, unknown>
  const noticeRaw = o.providerNotice && typeof o.providerNotice === 'object' ? (o.providerNotice as Record<string, unknown>) : {}
  return {
    sharesKitchenOrBathroom: parseQldYesNo(o.sharesKitchenOrBathroom),
    studentAccommodation: Boolean(o.studentAccommodation),
    personsAtPremises: typeof o.personsAtPremises === 'string' ? o.personsAtPremises : '',
    rentPaymentMethod1: typeof o.rentPaymentMethod1 === 'string' ? o.rentPaymentMethod1 : '',
    rentPaymentMethod2: typeof o.rentPaymentMethod2 === 'string' ? o.rentPaymentMethod2 : '',
    rentPayeeBankName: typeof o.rentPayeeBankName === 'string' ? o.rentPayeeBankName : '',
    rentPayeeAccountName: typeof o.rentPayeeAccountName === 'string' ? o.rentPayeeAccountName : '',
    rentPayeeBsb: typeof o.rentPayeeBsb === 'string' ? o.rentPayeeBsb : '',
    rentPayeeAccountNumber: typeof o.rentPayeeAccountNumber === 'string' ? o.rentPayeeAccountNumber : '',
    rentPaymentReference: typeof o.rentPaymentReference === 'string' ? o.rentPaymentReference : '',
    rentLastIncreasedOn: typeof o.rentLastIncreasedOn === 'string' ? o.rentLastIncreasedOn : '',
    providerNotice: {
      emailPermitted: parseQldYesNo(noticeRaw.emailPermitted),
      emailAddress: typeof noticeRaw.emailAddress === 'string' ? noticeRaw.emailAddress : '',
      smsPermitted: parseQldYesNo(noticeRaw.smsPermitted),
      smsAddress: typeof noticeRaw.smsAddress === 'string' ? noticeRaw.smsAddress : '',
    },
  }
}

export function emptyQldRoomingListingFormState(): QldRoomingListingFormState {
  return {
    sharesKitchenOrBathroom: '',
    studentAccommodation: false,
    personsAtPremises: '',
    rentPaymentMethod1: '',
    rentPaymentMethod2: '',
    rentPayeeBankName: '',
    rentPayeeAccountName: '',
    rentPayeeBsb: '',
    rentPayeeAccountNumber: '',
    rentPaymentReference: '',
    rentLastIncreasedOn: '',
    providerNotice: emptyQldNoticeConsentFormState(),
  }
}

export function isQldRoomCardPropertyType(propertyType: string | null | undefined): boolean {
  const pt = typeof propertyType === 'string' ? propertyType.trim() : ''
  return (
    pt === 'private_room_landlord_on_site' ||
    pt === 'private_room_landlord_off_site' ||
    pt === 'shared_room'
  )
}

export function isQldRoomCardListing(
  state: string | null | undefined,
  propertyType: string | null | undefined,
): boolean {
  return (state ?? '').trim().toUpperCase() === 'QLD' && isQldRoomCardPropertyType(propertyType)
}

export function parseQldYesNo(raw: unknown): QldYesNo {
  if (raw === true || raw === 'yes') return 'yes'
  if (raw === false || raw === 'no') return 'no'
  return ''
}

export function qldSharesKitchenOrBathroomError(value: QldYesNo): string | null {
  if (value === '') {
    return 'Say whether the renter shares a kitchen or bathroom with anyone else.'
  }
  return null
}

export function qldRoomDescriptionError(roomDescription: string): string | null {
  if (!roomDescription.trim()) {
    return 'Enter a room description that identifies this room on the agreement.'
  }
  return null
}

export function parseQldPersonsAtPremises(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(99, Math.floor(n))
}

export function qldPersonsAtPremisesError(
  personsAtPremises: number | null,
  personsInRoom: number,
): string | null {
  if (personsAtPremises == null) {
    return 'Enter how many people are allowed to live at the premises.'
  }
  if (personsAtPremises < personsInRoom) {
    return 'People allowed at the premises cannot be fewer than people allowed in this room.'
  }
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function qldNoticeConsentFieldError(
  form: QldNoticeConsentFormState,
  partyLabel: string,
): string | null {
  if (form.emailPermitted === '') {
    return `Say whether ${partyLabel} may be given notices by email.`
  }
  if (form.emailPermitted === 'yes') {
    const email = form.emailAddress.trim()
    if (!email) return `Enter the email address for ${partyLabel} notices.`
    if (!EMAIL_RE.test(email)) return `Enter a valid email address for ${partyLabel} notices.`
  }
  if (form.smsPermitted === '') {
    return `Say whether ${partyLabel} may be given notices by text message.`
  }
  if (form.smsPermitted === 'yes' && !form.smsAddress.trim()) {
    return `Enter the mobile number for ${partyLabel} text-message notices.`
  }
  return null
}

function digitsOnly(raw: string): string {
  return raw.replace(/[\s-]/g, '')
}

export function qldRentPaymentBlockError(form: QldRoomingListingFormState): string | null {
  if (!form.rentPaymentMethod1.trim() || !form.rentPaymentMethod2.trim()) {
    return 'Nominate two ways the resident can pay rent.'
  }
  if (!form.rentPayeeBankName.trim()) return 'Enter the bank for direct credit of rent.'
  if (!form.rentPayeeAccountName.trim()) return 'Enter the account name for direct credit of rent.'
  const bsb = digitsOnly(form.rentPayeeBsb)
  if (!/^\d{6}$/.test(bsb)) return 'Enter a 6-digit BSB for direct credit of rent.'
  const acct = form.rentPayeeAccountNumber.trim()
  if (!/^\d{5,10}$/.test(acct)) return 'Enter an account number of 5 to 10 digits for direct credit of rent.'
  if (!form.rentPaymentReference.trim()) {
    return 'Enter the payment reference the resident should use for rent.'
  }
  return null
}

export function qldRentLastIncreasedOnError(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Enter the last rent-increase date as YYYY-MM-DD, or leave it blank.'
  return null
}

export function qldRoomingListingSaveError(args: {
  sharesKitchenOrBathroom: QldYesNo
  roomDescription: string
  personsAtPremises: string
  personsInRoom: number
  form: QldRoomingListingFormState
}): string | null {
  const sharesErr = qldSharesKitchenOrBathroomError(args.sharesKitchenOrBathroom)
  if (sharesErr) return sharesErr
  const roomErr = qldRoomDescriptionError(args.roomDescription)
  if (roomErr) return roomErr
  const persons = parseQldPersonsAtPremises(args.personsAtPremises)
  const personsErr = qldPersonsAtPremisesError(persons, args.personsInRoom)
  if (personsErr) return personsErr
  const payErr = qldRentPaymentBlockError(args.form)
  if (payErr) return payErr
  const dateErr = qldRentLastIncreasedOnError(args.form.rentLastIncreasedOn)
  if (dateErr) return dateErr
  const noticeErr = qldNoticeConsentFieldError(args.form.providerNotice, 'you (the provider)')
  if (noticeErr) return noticeErr
  return null
}

export type QldRoomingListingColumnPatch = {
  qld_shares_kitchen_or_bathroom: boolean | null
  qld_student_accommodation: boolean
  qld_rooming_service_level: typeof QLD_ROOMING_SERVICE_LEVEL_1 | null
  qld_persons_at_premises: number | null
  qld_rent_payment_method_1: string | null
  qld_rent_payment_method_2: string | null
  qld_rent_payee_bank_name: string | null
  qld_rent_payee_account_name: string | null
  qld_rent_payee_bsb: string | null
  qld_rent_payee_account_number: string | null
  qld_rent_payment_reference: string | null
  qld_rent_last_increased_on: string | null
}

export function qldRoomingListingColumnPatch(args: {
  isQldRoomCard: boolean
  isQldRooming: boolean
  form: QldRoomingListingFormState
}): QldRoomingListingColumnPatch {
  const shares = parseQldSharesKitchenOrBathroom(args.form.sharesKitchenOrBathroom)
  if (!args.isQldRoomCard) {
    return {
      qld_shares_kitchen_or_bathroom: null,
      qld_student_accommodation: false,
      qld_rooming_service_level: null,
      qld_persons_at_premises: null,
      qld_rent_payment_method_1: null,
      qld_rent_payment_method_2: null,
      qld_rent_payee_bank_name: null,
      qld_rent_payee_account_name: null,
      qld_rent_payee_bsb: null,
      qld_rent_payee_account_number: null,
      qld_rent_payment_reference: null,
      qld_rent_last_increased_on: null,
    }
  }
  const date = args.form.rentLastIncreasedOn.trim()
  return {
    qld_shares_kitchen_or_bathroom: shares,
    qld_student_accommodation: args.isQldRooming ? args.form.studentAccommodation : false,
    qld_rooming_service_level: args.isQldRooming ? QLD_ROOMING_SERVICE_LEVEL_1 : null,
    qld_persons_at_premises: args.isQldRooming
      ? parseQldPersonsAtPremises(args.form.personsAtPremises)
      : null,
    qld_rent_payment_method_1: args.isQldRooming ? args.form.rentPaymentMethod1.trim() || null : null,
    qld_rent_payment_method_2: args.isQldRooming ? args.form.rentPaymentMethod2.trim() || null : null,
    qld_rent_payee_bank_name: args.isQldRooming ? args.form.rentPayeeBankName.trim() || null : null,
    qld_rent_payee_account_name: args.isQldRooming ? args.form.rentPayeeAccountName.trim() || null : null,
    qld_rent_payee_bsb: args.isQldRooming ? digitsOnly(args.form.rentPayeeBsb) || null : null,
    qld_rent_payee_account_number: args.isQldRooming
      ? args.form.rentPayeeAccountNumber.trim() || null
      : null,
    qld_rent_payment_reference: args.isQldRooming ? args.form.rentPaymentReference.trim() || null : null,
    qld_rent_last_increased_on: args.isQldRooming && date ? date : null,
  }
}

export function qldRoomingListingFormFromProperty(prop: {
  qld_shares_kitchen_or_bathroom?: boolean | null
  qld_student_accommodation?: boolean | null
  qld_persons_at_premises?: number | null
  qld_rent_payment_method_1?: string | null
  qld_rent_payment_method_2?: string | null
  qld_rent_payee_bank_name?: string | null
  qld_rent_payee_account_name?: string | null
  qld_rent_payee_bsb?: string | null
  qld_rent_payee_account_number?: string | null
  qld_rent_payment_reference?: string | null
  qld_rent_last_increased_on?: string | null
}): QldRoomingListingFormState {
  const date =
    typeof prop.qld_rent_last_increased_on === 'string' ? prop.qld_rent_last_increased_on.slice(0, 10) : ''
  return {
    sharesKitchenOrBathroom: parseQldYesNo(prop.qld_shares_kitchen_or_bathroom),
    studentAccommodation: Boolean(prop.qld_student_accommodation),
    personsAtPremises:
      prop.qld_persons_at_premises != null ? String(prop.qld_persons_at_premises) : '',
    rentPaymentMethod1: typeof prop.qld_rent_payment_method_1 === 'string' ? prop.qld_rent_payment_method_1 : '',
    rentPaymentMethod2: typeof prop.qld_rent_payment_method_2 === 'string' ? prop.qld_rent_payment_method_2 : '',
    rentPayeeBankName: typeof prop.qld_rent_payee_bank_name === 'string' ? prop.qld_rent_payee_bank_name : '',
    rentPayeeAccountName:
      typeof prop.qld_rent_payee_account_name === 'string' ? prop.qld_rent_payee_account_name : '',
    rentPayeeBsb: typeof prop.qld_rent_payee_bsb === 'string' ? prop.qld_rent_payee_bsb : '',
    rentPayeeAccountNumber:
      typeof prop.qld_rent_payee_account_number === 'string' ? prop.qld_rent_payee_account_number : '',
    rentPaymentReference:
      typeof prop.qld_rent_payment_reference === 'string' ? prop.qld_rent_payment_reference : '',
    rentLastIncreasedOn: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    providerNotice: emptyQldNoticeConsentFormState(),
  }
}

export const QLD_SHARES_KITCHEN_OR_BATHROOM_LABEL =
  'Does the renter share a kitchen or bathroom with anyone else?'

export const QLD_SHARES_KITCHEN_OR_BATHROOM_HELPER =
  'Yes if they share a kitchen or bathroom with you or with another resident. No if this room has its own kitchen and bathroom.'

export const QLD_ROOMS_LET_HELPER =
  'Count rooms occupied by or available to residents, including this listing. Do not count the room you sleep in. Three or fewer is the usual s 43 boarder/lodger path. Four or more is rooming accommodation.'

export const QLD_LEVEL_1_LOCKED_COPY =
  'Quni lists Level 1 rooming accommodation only. Rent is for accommodation, not food or personal care. Level 2 and Level 3 are not available.'

export const QLD_STUDENT_ACCOMMODATION_HELPER =
  'Tick if this listing is student accommodation. This prints on Form R18 particulars. It does not change which agreement applies.'

export const QLD_RENT_ACCOMMODATION_ONLY_HELPER =
  'At Level 1, this rent is for accommodation only. Do not include food or personal care.'

export const QLD_ITEM_11_HELPER =
  'Nominate two ways the resident can pay rent, and the account for direct credit. The Act requires at least two ways. These details are for rent paid to you, not Quni fees.'

export const QLD_ITEM_13_2_HELPER =
  'Date rent was last increased for this room. Leave blank if rent for this room has not been increased before. This stays with the room when residents change.'

export const QLD_ITEM_5_PROVIDER_HELPER =
  'The resident may give you notices by email or text message if you say yes and give an address. This is for Form R18 item 5. It is not the same as listing enquiries.'

export const QLD_ITEM_5_RESIDENT_HELPER =
  'The provider may give you notices by email or text message if you say yes and give an address. This is for Form R18 item 5. You can say no to either channel.'

export function isMissingQldRoomingListingColumn(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  if (!(msg.includes('does not exist') || msg.includes('schema cache'))) return false
  return (
    msg.includes('qld_shares_kitchen_or_bathroom') ||
    msg.includes('qld_student_accommodation') ||
    msg.includes('qld_rooming_service_level') ||
    msg.includes('qld_persons_at_premises') ||
    msg.includes('qld_rent_payment_method') ||
    msg.includes('qld_rent_payee') ||
    msg.includes('qld_rent_payment_reference') ||
    msg.includes('qld_rent_last_increased_on')
  )
}
