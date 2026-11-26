/**
 * Victorian rooming house agreement facts.
 * Capacity of four or more on an off-site room or a shared room selects this package.
 * The registration flag does not.
 */

export const VIC_ROOMING_GENERATOR_ID = 'vic-rooming-house'

export const VIC_ROOMING_SIGNING_PACKAGE = 'rooming_house_vic'

export const VIC_ROOMING_FIXED_TERM_MESSAGE =
  'A Victorian rooming house agreement has to be a fixed term with an end date. Choose 3 months, 6 months, 12 months, or 2 years.'

export const VIC_ROOMING_TWO_RESIDENTS_MESSAGE =
  "This agreement has room for two residents. A booking for more than two people can't be requested on this listing."

export const VIC_ROOMING_OPERATOR_EMAIL_REQUIRED =
  'Quni gives this agreement by email, so the operator has to agree to electronic service before it can be sent.'

export const VIC_ROOMING_RESIDENT_EMAIL_REQUIRED =
  'The resident has to answer yes or no to electronic service before this agreement is sent.'

export const VIC_ROOMING_CONDITION_REPORT_REQUIRED =
  'Choose whether the condition report has been provided or will be provided on or before move-in. That choice is required before the agreement generates.'

export const VIC_ROOMING_CAPACITY_REQUIRED =
  'Enter how many people can live in this building, including you if you live there, before this Victorian listing can be published.'

/** Frozen CAV files the signing package gives the resident with the agreement. */
export const VIC_ROOMING_MOVE_IN_FILES = [
  {
    id: 'rights_and_duties',
    path: 'docs/vic/rooming-house-rights-and-duties-s124.pdf',
    label: 'statement of rights and duties',
  },
  { id: 'residents_guide', path: 'docs/vic/rooming-house-residents-guide.pdf', label: 'residents guide' },
  {
    id: 'notice_exclusive',
    path: 'docs/vic/rooming-house-notice-exclusive-occupancy.pdf',
    label: 'notice of exclusive occupancy',
  },
  {
    id: 'notice_shared',
    path: 'docs/vic/rooming-house-notice-shared-room.pdf',
    label: 'notice of a shared room right',
  },
] as const

/**
 * Fixed-term package only. The section 124 statement says a resident on a fixed-term
 * rooming house agreement gives at least 14 days' notice to leave, and otherwise 2 days.
 */
export const VIC_ROOMING_RESIDENT_NOTICE_TO_LEAVE =
  "To leave before the end date, give at least 14 days' notice. This package is a fixed-term rooming house agreement. The statement of rights and duties, given with the agreement, says a resident on a fixed-term agreement gives 14 days' notice, and otherwise gives 2 days' notice."

export const VIC_ROOMING_PAYMENT_METHODS_MESSAGE =
  'Tick at least one fee-free method (bank deposit, BPAY, or other electronic payment including Centrepay) and allow Centrepay or another electronic transfer. Cash only, cheque only, or direct debit only cannot be published. BPAY and other electronic payment do not print account details. Only bank deposit prints the account name, BSB, and account number.'

export type VicRoomingPayMethods = {
  directDebit: boolean
  bankDeposit: boolean
  cash: boolean
  cheque: boolean
  bpay: boolean
  otherEft: boolean
}

export type VicRoomingConditionReport = 'provided' | 'will_be_provided'

export function parseVicPremisesOccupantCapacity(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1 || n > 99) return null
  return n
}

export function isVicRoomingPropertyType(propertyType: string | null | undefined): boolean {
  const t = String(propertyType || '').trim()
  return t === 'private_room_landlord_off_site' || t === 'shared_room'
}

/**
 * Agreement routing for Victoria. On-site with the registration flag stays unsupported,
 * matching the path that already exists. On-site without the flag stays the licence.
 * An entire place stays Form 1.
 */
export function vicRoomingRouting(args: {
  propertyType: string | null | undefined
  isRegisteredRoomingHouse?: boolean | null
  premisesOccupantCapacity: unknown
}):
  | { kind: 'rooming' }
  | { kind: 'form1' }
  | { kind: 'licence' }
  | { kind: 'unsupported'; reason: string } {
  const propertyType = String(args.propertyType || '').trim()
  const flagged = Boolean(args.isRegisteredRoomingHouse)
  if (propertyType === 'private_room_landlord_on_site') {
    if (flagged) {
      return {
        kind: 'unsupported',
        reason: 'Registered rooming house is only valid for private room (landlord off-site) listings.',
      }
    }
    return { kind: 'licence' }
  }
  if (propertyType === 'entire_property') return { kind: 'form1' }
  if (!isVicRoomingPropertyType(propertyType)) {
    return { kind: 'unsupported', reason: 'unknown_property_type' }
  }
  const capacity = parseVicPremisesOccupantCapacity(args.premisesOccupantCapacity)
  if (capacity == null) {
    return { kind: 'unsupported', reason: VIC_ROOMING_CAPACITY_REQUIRED }
  }
  if (capacity >= 4) return { kind: 'rooming' }
  return { kind: 'form1' }
}

export function vicRoomingPayMethodsFromRow(row: object | null | undefined): VicRoomingPayMethods {
  const r = (row ?? {}) as Record<string, unknown>
  return {
    directDebit: Boolean(r.vic_rooming_pay_direct_debit),
    bankDeposit: Boolean(r.vic_rooming_pay_bank_deposit),
    cash: Boolean(r.vic_rooming_pay_cash),
    cheque: Boolean(r.vic_rooming_pay_cheque),
    bpay: Boolean(r.vic_rooming_pay_bpay),
    otherEft: Boolean(r.vic_rooming_pay_other_eft),
  }
}

export function vicRoomingPayMethodsPublishError(methods: VicRoomingPayMethods): string | null {
  const feeFree = methods.bankDeposit || methods.bpay || methods.otherEft
  const electronic = methods.bankDeposit || methods.bpay || methods.otherEft || methods.directDebit
  const any =
    methods.directDebit ||
    methods.bankDeposit ||
    methods.cash ||
    methods.cheque ||
    methods.bpay ||
    methods.otherEft
  if (!any || !feeFree || !electronic) return VIC_ROOMING_PAYMENT_METHODS_MESSAGE
  return null
}

export function vicRoomingPaymentDetailsLine(methods: VicRoomingPayMethods, bank: {
  accountName?: string | null
  bsb?: string | null
  accountNumber?: string | null
} | null): string {
  if (!methods.bankDeposit || !bank) return ''
  const name = (bank.accountName || '').trim()
  const bsb = (bank.bsb || '').trim()
  const number = (bank.accountNumber || '').trim()
  if (!name || !bsb || !number) return ''
  return `Account name: ${name}. BSB: ${bsb}. Account number: ${number}.`
}

/** Dollars per week. Null when blank, zero, or not a number. */
export function parseVicRoomingUnsharedWeeklyRent(value: unknown): number | null {
  if (value == null || value === '') return null
  const raw = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''))
  if (!Number.isFinite(raw) || raw <= 0) return null
  return Math.round(raw * 100) / 100
}

export const VIC_ROOMING_UNSHARED_RENT_REQUIRED =
  'Enter the weekly rent this room would be if it were not shared. The shared room notice prints that figure next to the rent the resident pays.'

export const VIC_ROOMING_UNSHARED_RENT_HIGHER =
  'The weekly rent if this room were not shared must be higher than the shared weekly rent. The notice says the resident pays less because the room is shared.'

export const VIC_ROOMING_UNSHARED_RENT_ACCEPT_MESSAGE =
  'This listing can stay published. Accepting a booking is blocked until you enter the weekly rent this room would be if it were not shared. The shared room notice prints that figure.'

/**
 * Shared-room comparison on the CAV notice. Required only when publishing a room that uses the rooming house agreement.
 * A figure that is present must be higher than the shared weekly rent even on a draft.
 */
export function vicRoomingUnsharedWeeklyRentError(args: {
  propertyType: unknown
  sharedWeeklyRent: unknown
  unsharedWeeklyRent: unknown
  required: boolean
}): string | null {
  if (args.propertyType !== 'shared_room') return null
  const amount = parseVicRoomingUnsharedWeeklyRent(args.unsharedWeeklyRent)
  const shared = Number(args.sharedWeeklyRent)
  if (amount == null) return args.required ? VIC_ROOMING_UNSHARED_RENT_REQUIRED : null
  if (!Number.isFinite(shared) || !(amount > shared)) return VIC_ROOMING_UNSHARED_RENT_HIGHER
  return null
}

export function vicRoomingUnsharedRentAcceptBlock(args: {
  propertyType: unknown
  unsharedWeeklyRent: unknown
}): { ok: true } | { ok: false; message: string } {
  if (args.propertyType !== 'shared_room') return { ok: true }
  if (parseVicRoomingUnsharedWeeklyRent(args.unsharedWeeklyRent) == null) {
    return { ok: false, message: VIC_ROOMING_UNSHARED_RENT_ACCEPT_MESSAGE }
  }
  return { ok: true }
}

export function vicRoomingPublishErrors(args: {
  capacity: unknown
  registrationNumber: unknown
  operatorLicenceNumber: unknown
  operatorAcceptsElectronicService: unknown
  houseRules: unknown
  roomNumber: unknown
  pay: VicRoomingPayMethods
  attestationCurrent: boolean
  propertyType: unknown
  sharedWeeklyRent: unknown
  unsharedWeeklyRent: unknown
}): string | null {
  if (parseVicPremisesOccupantCapacity(args.capacity) == null) return VIC_ROOMING_CAPACITY_REQUIRED
  const payErr = vicRoomingPayMethodsPublishError(args.pay)
  if (payErr) return payErr
  if (!String(args.registrationNumber || '').trim() || !String(args.operatorLicenceNumber || '').trim()) {
    return 'Enter the council registration number and the rooming house operator licence number.'
  }
  if (!args.attestationCurrent) {
    return 'Confirm the council registration and the operator licence are current before publishing.'
  }
  if (args.operatorAcceptsElectronicService !== true) return VIC_ROOMING_OPERATOR_EMAIL_REQUIRED
  if (!String(args.houseRules || '').trim()) return 'Enter the rooming house rules before publishing.'
  if (!String(args.roomNumber || '').trim()) return 'Enter the room number printed on the agreement.'
  const unshared = vicRoomingUnsharedWeeklyRentError({
    propertyType: args.propertyType,
    sharedWeeklyRent: args.sharedWeeklyRent,
    unsharedWeeklyRent: args.unsharedWeeklyRent,
    required: true,
  })
  if (unshared) return unshared
  return null
}

export function vicRoomingMoveInPackGap(
  present: (relativePath: string) => boolean,
): { ok: true } | { ok: false; message: string } {
  const missing = VIC_ROOMING_MOVE_IN_FILES.filter((file) => !present(file.path)).map((file) => file.label)
  if (missing.length === 0) return { ok: true }
  return {
    ok: false,
    message: `This listing can stay published. Accepting a booking is blocked until every move-in document is included with the agreement. Missing: ${missing.join(', ')}.`,
  }
}

export function vicRoomingApplyBlock(args: {
  leaseLength: unknown
  endDate: unknown
  occupantCount: unknown
}): { ok: true } | { ok: false; message: string } {
  const lease = typeof args.leaseLength === 'string' ? args.leaseLength.trim() : ''
  const end = typeof args.endDate === 'string' ? args.endDate.trim() : ''
  if (!end || lease === 'Flexible') return { ok: false, message: VIC_ROOMING_FIXED_TERM_MESSAGE }
  const count = Math.floor(Number(args.occupantCount))
  if (!Number.isFinite(count) || count > 2) return { ok: false, message: VIC_ROOMING_TWO_RESIDENTS_MESSAGE }
  return { ok: true }
}

export function parseVicRoomingConditionReport(value: unknown): VicRoomingConditionReport | null {
  if (value === 'provided' || value === 'will_be_provided') return value
  return null
}

/** Rent asked on or before move-in must not exceed 14 days of weekly rent. */
export function vicRoomingRentInAdvanceError(args: {
  weeklyRent: number
  amountDueOnOrBeforeMoveIn: number
}): string | null {
  const weekly = Number(args.weeklyRent)
  const due = Number(args.amountDueOnOrBeforeMoveIn)
  if (!Number.isFinite(weekly) || weekly <= 0) return 'Weekly rent is required for this agreement.'
  if (!Number.isFinite(due) || due < 0) return 'Rent due on or before move-in is not a valid amount.'
  const cap = Math.round(weekly * 2 * 100) / 100
  if (due > cap + 0.001) {
    return 'This agreement cannot ask for more than 14 days of rent in advance.'
  }
  return null
}
