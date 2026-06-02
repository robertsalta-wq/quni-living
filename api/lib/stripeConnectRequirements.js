/**
 * Human-readable Stripe Connect requirement summaries for landlord UI.
 */

/** @param {string} field */
function humanizeRequirementField(field) {
  if (!field || typeof field !== 'string') return 'Additional information'
  if (field.startsWith('business_profile.')) return 'Business information'
  if (field.includes('verification.document') || field.includes('verification.additional_document')) {
    return 'Photo ID verification'
  }
  if (field.startsWith('individual.')) return 'Personal details'
  if (field.startsWith('company.')) return 'Company details'
  if (field.startsWith('external_account')) return 'Bank account'
  if (field.startsWith('tos_acceptance')) return 'Terms acceptance'
  return field.replace(/\./g, ' · ').replace(/_/g, ' ')
}

/**
 * @param {{ requirements?: {
 *   currently_due?: string[]
 *   eventually_due?: string[]
 *   past_due?: string[]
 *   pending_verification?: string[]
 *   errors?: Array<{ requirement?: string; reason?: string; code?: string }>
 * } } | null | undefined} account
 */
export function summarizeStripeConnectRequirements(account) {
  const req = account?.requirements ?? {}
  const errors = Array.isArray(req.errors) ? req.errors : []
  const currentlyDue = Array.isArray(req.currently_due) ? req.currently_due : []
  const pendingVerification = Array.isArray(req.pending_verification) ? req.pending_verification : []

  /** @type {Array<{ kind: 'error' | 'due' | 'pending'; label: string; detail: string | null }>} */
  const items = []
  const seen = new Set()

  for (const err of errors) {
    const label = humanizeRequirementField(err.requirement ?? '')
    const detail = typeof err.reason === 'string' && err.reason.trim() ? err.reason.trim() : err.code ?? null
    const key = `${label}:${detail ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ kind: 'error', label, detail })
  }

  for (const field of [...currentlyDue, ...pendingVerification]) {
    const label = humanizeRequirementField(field)
    if (seen.has(label)) continue
    seen.add(label)
    items.push({
      kind: pendingVerification.includes(field) ? 'pending' : 'due',
      label,
      detail: null,
    })
  }

  return {
    items,
    hasErrors: errors.length > 0,
    pendingCount: items.length,
    readyToEnable:
      currentlyDue.length === 0 && errors.length === 0 && pendingVerification.length === 0,
  }
}
