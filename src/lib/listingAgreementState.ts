import { listingStateFromLandlordProfile } from './adminConciergeListing'
import { postcodeStateConflictMessage } from './australianPostcodeState'

/**
 * States Quni can write an agreement for, in the order the Location notice lists them.
 * Add a state here and the notice updates. The full AU list stays on the concierge helper.
 */
const LISTING_AGREEMENT_STATES = [
  { code: 'NSW', label: 'NSW' },
  { code: 'QLD', label: 'Queensland' },
  { code: 'VIC', label: 'Victoria' },
] as const

const UNSUPPORTED_LISTING_STATE_NAMES: Record<string, string> = {
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  ACT: 'the ACT',
  NT: 'the Northern Territory',
}

function listingAgreementStateLabels(): string {
  const labels = LISTING_AGREEMENT_STATES.map((state) => state.label)
  if (labels.length <= 1) return labels[0] ?? ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

/** States Quni can write an agreement for. The full AU list stays on the concierge helper. */
export function isListingAgreementState(state: string | null | undefined): boolean {
  const code = (state ?? '').trim().toUpperCase()
  return LISTING_AGREEMENT_STATES.some((entry) => entry.code === code)
}

export function unsupportedListingStateNotice(state: string): { heading: string; body: string } | null {
  const code = (state ?? '').trim().toUpperCase()
  if (!code || isListingAgreementState(code)) return null
  const name = UNSUPPORTED_LISTING_STATE_NAMES[code] ?? code
  const sentenceName = name.charAt(0).toUpperCase() + name.slice(1)
  return {
    heading: `We're not in ${name} yet`,
    body: `Quni currently lists properties in ${listingAgreementStateLabels()}. ${sentenceName} is coming soon, so check back shortly.`,
  }
}

export function unsupportedListingStateMessage(state: string): string {
  return unsupportedListingStateNotice(state)?.body ?? ''
}

/**
 * Why a parsed address must stay unconfirmed.
 * Unsupported states are refused before a postcode mismatch, so a consistent
 * SA address is still refused. An empty state is not a refusal: the form
 * still has to collect one.
 */
export function addressConfirmRefusal(
  state: string | null | undefined,
  postcode: string | null | undefined,
): string | null {
  const code = (listingStateFromLandlordProfile(state) ?? '').trim()
  if (code && !isListingAgreementState(code)) return unsupportedListingStateMessage(code)
  return postcodeStateConflictMessage(postcode, code)
}

export function listingStateChangeConfirmMessage(fromState: string): string {
  return `Changing the state clears the answers for ${fromState.trim().toUpperCase()}. Continue?`
}

function answerPresent(value: unknown): boolean {
  if (value == null || value === false || value === '') return false
  if (typeof value === 'number') return true
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.some(answerPresent)
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(answerPresent)
  return true
}

/** True when the current state's own fields hold something a state change would wipe. */
export function hasListingStateSpecificAnswers(
  state: string | null | undefined,
  answers: {
    nsw?: unknown
    qld?: unknown
    vic?: unknown
    utilities?: unknown
    registration?: unknown
    qldBondIsCustom?: boolean
  },
): boolean {
  const code = (state ?? '').trim().toUpperCase()
  if (code === 'NSW') return answerPresent(answers.nsw) || answerPresent(answers.registration)
  if (code === 'QLD') {
    return (
      answerPresent(answers.qld) ||
      answerPresent(answers.utilities) ||
      answerPresent(answers.registration) ||
      Boolean(answers.qldBondIsCustom)
    )
  }
  if (code === 'VIC') {
    return answerPresent(answers.vic) || answerPresent(answers.utilities) || answerPresent(answers.registration)
  }
  return false
}

export function listingStateChangeNeedsConfirm(input: {
  fromState: string | null | undefined
  toState: string | null | undefined
  hasSpecificAnswers: boolean
}): boolean {
  const from = listingStateFromLandlordProfile(input.fromState)
  const to = (input.toState ?? '').trim().toUpperCase()
  if (!from || !isListingAgreementState(from) || from === to) return false
  return input.hasSpecificAnswers
}
