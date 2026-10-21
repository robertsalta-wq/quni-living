/**
 * Whole-home vs by-the-room comparison. Every dollar is the visitor's input.
 * No default rents, no yields, no Quni-supplied running costs.
 * The $99 accept fee is display copy only and never enters the net.
 */

export const BY_THE_ROOM_PATH = '/by-the-room'
export const BY_THE_ROOM_LIST_PATH = '/signup?role=landlord'
export const BY_THE_ROOM_DISCLAIMER = 'Your own figures. Not a Quni estimate.'
export const BY_THE_ROOM_FEE_LINE = 'Free to list. $99 once, only when you accept a tenant.'

export const WEEKS_PER_YEAR = 52
export const ROOMS_MIN = 1
export const ROOMS_MAX = 4

/** NSW note shows when total residents reach this count. Rooms are a separate input. */
export const NSW_RESIDENTS_NOTE_MIN = 5

/**
 * PLACEHOLDER: approved NSW wording goes here.
 * An empty string renders nothing. Do not invent legal copy.
 */
export const NSW_RESIDENTS_NOTE = ''

/**
 * PLACEHOLDER: approved QLD wording goes here.
 * An empty string renders nothing. Do not invent legal copy.
 * This pitch is an owner who does not live at the property, so QLD rooming
 * accommodation is not keyed off room count. Do not use
 * QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS here.
 */
export const QLD_ROOMING_NOTE = ''

export type ByTheRoomStateCode = 'NSW' | 'QLD'

export function nswResidentsNoteTriggered(residents: number | null): boolean {
  return residents != null && Number.isInteger(residents) && residents >= NSW_RESIDENTS_NOTE_MIN
}

/** QLD note is state-selected, not a room or resident threshold. */
export function qldRoomingNoteTriggered(): boolean {
  return true
}

/** Returns approved copy, or null while the placeholder is still empty or the trigger is off. */
export function visibleStateNote(state: ByTheRoomStateCode | '', residents: number | null): string | null {
  if (state === 'QLD' && qldRoomingNoteTriggered()) {
    const copy = QLD_ROOMING_NOTE.trim()
    return copy || null
  }
  if (state === 'NSW' && nswResidentsNoteTriggered(residents)) {
    const copy = NSW_RESIDENTS_NOTE.trim()
    return copy || null
  }
  return null
}

export type ByTheRoomFigures = {
  currentWeekly: number
  currentAnnual: number
  grossWeekly: number
  grossAnnual: number
  netWeekly: number
  netAnnual: number
  differenceWeekly: number
  differenceAnnual: number
}

export type ByTheRoomEvaluation =
  | { status: 'ready'; figures: ByTheRoomFigures }
  | { status: 'need-rents' }
  | { status: 'need-furnishing-years' }
  | { status: 'empty-weeks' }

export type ByTheRoomFields = {
  wholeHomeWeekly: string
  roomRentsWeekly: string[]
  utilitiesWeekly: string
  internetWeekly: string
  furnishingOnce: string
  furnishingYears: string
  emptyWeeks: string
}

function parseMoneyDraft(raw: string): number | null | 'bad' {
  let t = raw.trim().replace(/[$,]/g, '')
  if (t.endsWith('.')) t = t.slice(0, -1)
  if (t === '') return null
  if (!/^\d+(\.\d+)?$/.test(t)) return 'bad'
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return 'bad'
  return n
}

function parseIntDraft(raw: string): number | null | 'bad' {
  const t = raw.trim()
  if (t === '') return null
  if (!/^\d+$/.test(t)) return 'bad'
  const n = Number(t)
  if (!Number.isInteger(n) || n < 0) return 'bad'
  return n
}

/** Blank costs are $0. Blank rents stay blank and block the result. */
export function evaluateByTheRoom(input: ByTheRoomFields): ByTheRoomEvaluation {
  if (input.roomRentsWeekly.length < ROOMS_MIN || input.roomRentsWeekly.length > ROOMS_MAX) {
    return { status: 'need-rents' }
  }

  const whole = parseMoneyDraft(input.wholeHomeWeekly)
  if (whole == null || whole === 'bad') return { status: 'need-rents' }

  const rents: number[] = []
  for (const raw of input.roomRentsWeekly) {
    const n = parseMoneyDraft(raw)
    if (n == null || n === 'bad') return { status: 'need-rents' }
    rents.push(n)
  }

  const utilities = parseMoneyDraft(input.utilitiesWeekly)
  const internet = parseMoneyDraft(input.internetWeekly)
  const furnishing = parseMoneyDraft(input.furnishingOnce)
  if (utilities === 'bad' || internet === 'bad' || furnishing === 'bad') return { status: 'need-rents' }

  const utilitiesN = utilities ?? 0
  const internetN = internet ?? 0
  const furnishingN = furnishing ?? 0

  const years = parseIntDraft(input.furnishingYears)
  if (years === 'bad') return { status: 'need-furnishing-years' }
  if (furnishingN > 0 && (years == null || years <= 0)) return { status: 'need-furnishing-years' }

  const empty = parseIntDraft(input.emptyWeeks)
  if (empty === 'bad' || (empty != null && empty > WEEKS_PER_YEAR)) return { status: 'empty-weeks' }
  const emptyN = empty ?? 0

  const furnishingAnnual = furnishingN > 0 && years != null && years > 0 ? furnishingN / years : 0
  const grossWeekly = rents.reduce((sum, n) => sum + n, 0)
  const grossAnnual = grossWeekly * WEEKS_PER_YEAR
  const currentAnnual = whole * WEEKS_PER_YEAR
  const netAnnual =
    grossAnnual -
    grossWeekly * emptyN -
    utilitiesN * WEEKS_PER_YEAR -
    internetN * WEEKS_PER_YEAR -
    furnishingAnnual
  const differenceAnnual = netAnnual - currentAnnual

  return {
    status: 'ready',
    figures: {
      currentWeekly: whole,
      currentAnnual,
      grossWeekly,
      grossAnnual,
      netWeekly: netAnnual / WEEKS_PER_YEAR,
      netAnnual,
      differenceWeekly: differenceAnnual / WEEKS_PER_YEAR,
      differenceAnnual,
    },
  }
}

/** Residents are a headcount, not a room count. Blank or zero is unanswered. */
export function parseResidentCount(raw: string): number | null {
  const n = parseIntDraft(raw)
  if (n == null || n === 'bad' || n < 1) return null
  return n
}
