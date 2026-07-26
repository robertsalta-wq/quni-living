import { LANDLORD_RULE_MAP_ROWS } from './ruleMapData.js'
import { filterServedEligible } from './ruleMapValidate.js'
import type { RuleMapRow } from './types.js'

/**
 * Format verified rule-map rows for the chat system prompt.
 * Empty when no rows are `confidence === 'verified'` (expected until Rob verifies).
 */
export function formatServedRuleMapBlock(
  rows: readonly RuleMapRow[] = LANDLORD_RULE_MAP_ROWS,
): string {
  const served = filterServedEligible(rows).filter(
    (r) => typeof r.rule === 'string' && r.rule.trim() && typeof r.sourceUrl === 'string' && r.sourceUrl.trim(),
  )
  if (served.length === 0) return ''

  const body = served
    .map((r) => {
      const bits = [
        `ID: ${r.id}`,
        `State: ${r.state}`,
        `Q: ${r.question}`,
        `Rule: ${r.rule}`,
        `Source: ${r.sourceUrl}`,
      ]
      if (r.provision) bits.push(`Provision: ${r.provision}`)
      return bits.join('\n')
    })
    .join('\n\n')

  return [
    '',
    '--- SERVED RULE MAP (verified only — Branch 1 attributable for tenancy/landlord-law) ---',
    'Tenancy / landlord-law answers MUST come from these rows (or another attributable primary source in RELEVANT KNOWLEDGE). Cite the Source URL. If the question is not covered here and no attributable source exists, use Branch 2 (refer / seek legal advice).',
    body,
    '--- END SERVED RULE MAP ---',
  ].join('\n')
}
