/**
 * QLD rooming listing particulars for Form R18 (Stage 2).
 * Classification still lives in qldClassification.ts. The student tick is not a routing input.
 * Service level is Level 1 at fill time. No column.
 */

import { parseQldSharesKitchenOrBathroom } from './qldClassification.js'

export { parseQldSharesKitchenOrBathroom }

/** Hardcoded at Form R18 fill. Not stored. */
export const QLD_ROOMING_SERVICE_LEVEL_1 = 'level_1' as const

/** Item 11 method 1. Locked so s 98(2)(b) is satisfied by direct credit to property_payout_details. */
export const QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT = 'Direct credit'

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
  rentPaymentMethod2: string
  rentPaymentMethod2Costs: string
  rentPaymentMethod2FinancialBenefit: string
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
    rentPaymentMethod2: typeof o.rentPaymentMethod2 === 'string' ? o.rentPaymentMethod2 : '',
    rentPaymentMethod2Costs: typeof o.rentPaymentMethod2Costs === 'string' ? o.rentPaymentMethod2Costs : '',
    rentPaymentMethod2FinancialBenefit:
      typeof o.rentPaymentMethod2FinancialBenefit === 'string' ? o.rentPaymentMethod2FinancialBenefit : '',
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
    rentPaymentMethod2: '',
    rentPaymentMethod2Costs: '',
    rentPaymentMethod2FinancialBenefit: '',
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

export function qldRentPaymentBlockError(form: QldRoomingListingFormState): string | null {
  if (!form.rentPaymentMethod2.trim()) {
    return 'Nominate a second way the resident can pay rent.'
  }
  if (!form.rentPaymentMethod2Costs.trim()) {
    return 'Say what this second way costs the resident, or write None.'
  }
  if (!form.rentPaymentMethod2FinancialBenefit.trim()) {
    return 'Declare any financial benefit you receive from this second way to pay, or write None.'
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
  qld_persons_at_premises: number | null
  qld_rent_payment_method_1: string | null
  qld_rent_payment_method_2: string | null
  qld_rent_payment_method_2_costs: string | null
  qld_rent_payment_method_2_financial_benefit: string | null
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
      qld_persons_at_premises: null,
      qld_rent_payment_method_1: null,
      qld_rent_payment_method_2: null,
      qld_rent_payment_method_2_costs: null,
      qld_rent_payment_method_2_financial_benefit: null,
      qld_rent_last_increased_on: null,
    }
  }
  const date = args.form.rentLastIncreasedOn.trim()
  return {
    qld_shares_kitchen_or_bathroom: shares,
    qld_student_accommodation: args.isQldRooming ? args.form.studentAccommodation : false,
    qld_persons_at_premises: args.isQldRooming
      ? parseQldPersonsAtPremises(args.form.personsAtPremises)
      : null,
    qld_rent_payment_method_1: args.isQldRooming ? QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT : null,
    qld_rent_payment_method_2: args.isQldRooming ? args.form.rentPaymentMethod2.trim() || null : null,
    qld_rent_payment_method_2_costs: args.isQldRooming
      ? args.form.rentPaymentMethod2Costs.trim() || null
      : null,
    qld_rent_payment_method_2_financial_benefit: args.isQldRooming
      ? args.form.rentPaymentMethod2FinancialBenefit.trim() || null
      : null,
    qld_rent_last_increased_on: args.isQldRooming && date ? date : null,
  }
}

export function qldRoomingListingFormFromProperty(prop: {
  qld_shares_kitchen_or_bathroom?: boolean | null
  qld_student_accommodation?: boolean | null
  qld_persons_at_premises?: number | null
  qld_rent_payment_method_2?: string | null
  qld_rent_payment_method_2_costs?: string | null
  qld_rent_payment_method_2_financial_benefit?: string | null
  qld_rent_last_increased_on?: string | null
}): QldRoomingListingFormState {
  const date =
    typeof prop.qld_rent_last_increased_on === 'string' ? prop.qld_rent_last_increased_on.slice(0, 10) : ''
  return {
    sharesKitchenOrBathroom: parseQldYesNo(prop.qld_shares_kitchen_or_bathroom),
    studentAccommodation: Boolean(prop.qld_student_accommodation),
    personsAtPremises:
      prop.qld_persons_at_premises != null ? String(prop.qld_persons_at_premises) : '',
    rentPaymentMethod2: typeof prop.qld_rent_payment_method_2 === 'string' ? prop.qld_rent_payment_method_2 : '',
    rentPaymentMethod2Costs:
      typeof prop.qld_rent_payment_method_2_costs === 'string' ? prop.qld_rent_payment_method_2_costs : '',
    rentPaymentMethod2FinancialBenefit:
      typeof prop.qld_rent_payment_method_2_financial_benefit === 'string'
        ? prop.qld_rent_payment_method_2_financial_benefit
        : '',
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
  'Method 1 is direct credit to your payee account. That is the fee-free way the Act requires (s 98(2)(b)). You choose method 2. Account details are in Payee bank details, not here. Payment reference is the resident name and property address.'

export const QLD_ITEM_11_METHOD_2_COSTS_HELPER =
  'You must give the resident written notice of any costs of this way to pay before they enter the agreement (s 99B, maximum 40 penalty units). Direct credit has no extra cost beyond their usual bank fees. Write None if this method is the same.'

export const QLD_ITEM_11_METHOD_2_BENEFIT_HELPER =
  'The standard terms require you to declare any financial benefit you get from offering this way to pay (clause 7(5)). Write None if you do not receive one.'

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
    msg.includes('qld_persons_at_premises') ||
    msg.includes('qld_rent_payment_method') ||
    msg.includes('qld_rent_last_increased_on')
  )
}
