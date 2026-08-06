import {
  RULE_MAP_CONFIDENCE_VALUES,
  type RuleMapConfidence,
  type RuleMapRow,
} from './types.js'

function isRuleMapConfidence(v: unknown): v is RuleMapConfidence {
  return (
    typeof v === 'string' &&
    (RULE_MAP_CONFIDENCE_VALUES as readonly string[]).includes(v)
  )
}

/**
 * Source-gate and enum invariants for one rule-map row.
 * Returns human-readable error strings (empty = valid).
 */
export function validateRuleMapRow(row: RuleMapRow): string[] {
  const errors: string[] = []

  if (!isRuleMapConfidence(row.confidence)) {
    errors.push(
      `${row.id}: confidence must be one of ${RULE_MAP_CONFIDENCE_VALUES.join(' | ')} (got ${JSON.stringify(row.confidence)})`,
    )
  }

  // Source-gate: no rule may exist without a source.
  if (row.rule != null && row.sourceUrl == null) {
    errors.push(`${row.id}: rule is set but sourceUrl is null (source-gate)`)
  }

  return errors
}

/** Validate every row; throw AggregateError-style message on failure. */
export function assertValidRuleMap(rows: readonly RuleMapRow[]): void {
  const errors = rows.flatMap(validateRuleMapRow)
  if (errors.length > 0) {
    throw new Error(`Rule map validation failed:\n- ${errors.join('\n- ')}`)
  }
}

/**
 * Served-eligibility: only `verified` rows may feed the assistant or guides.
 * Exported as a helper/filter - not merely a comment.
 */
export function isServedEligible(row: RuleMapRow): boolean {
  return row.confidence === 'verified'
}

export function filterServedEligible(rows: readonly RuleMapRow[]): RuleMapRow[] {
  return rows.filter(isServedEligible)
}
