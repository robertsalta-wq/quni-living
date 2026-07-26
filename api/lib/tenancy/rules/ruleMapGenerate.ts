import type { RuleMapRow, RuleMapState, TenancyRules } from './types.js'

/**
 * Emit product `TenancyRules` from a Q3 rule-map row's `bondByTier` slice.
 * Does not invent bond figures — only returns what the map already carries.
 */
export function tenancyRulesFromRuleMapRow(
  row: RuleMapRow,
  tier: 'T1' | 'T2',
): TenancyRules {
  if (!row.bondByTier) {
    throw new Error(
      `Rule map row ${row.id} has no bondByTier — cannot generate TenancyRules`,
    )
  }
  return { bond: row.bondByTier[tier] }
}

/** Look up Q3-{state} and generate typed bond rules for a tier. */
export function tenancyRulesFromRuleMap(
  rows: readonly RuleMapRow[],
  state: RuleMapState,
  tier: 'T1' | 'T2',
): TenancyRules {
  const id = `Q3-${state}` as const
  const row = rows.find((r) => r.id === id)
  if (!row) {
    throw new Error(`Rule map missing row ${id}`)
  }
  return tenancyRulesFromRuleMapRow(row, tier)
}
