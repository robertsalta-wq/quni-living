import { describe, expect, it } from 'vitest'

import { nswTenancyRules } from './nsw.js'
import { qldTenancyRules } from './qld.js'
import { LANDLORD_RULE_MAP_ROWS } from './ruleMapData.js'
import { tenancyRulesFromRuleMap } from './ruleMapGenerate.js'
import {
  assertValidRuleMap,
  filterServedEligible,
  isServedEligible,
  validateRuleMapRow,
} from './ruleMapValidate.js'
import type { RuleMapRow } from './types.js'

function baseRow(overrides: Partial<RuleMapRow> = {}): RuleMapRow {
  return {
    id: 'TEST-ROW',
    question: 'test',
    state: 'NSW',
    productRegime: null,
    legalRegime: null,
    provision: null,
    rule: null,
    sourceUrl: null,
    sourceType: null,
    dateChecked: null,
    reviewDate: null,
    confidence: 'empty',
    needsSolicitor: false,
    notes: '',
    ...overrides,
  }
}

describe('landlord rule map - structure', () => {
  it('has 16 rows (8 questions × NSW/QLD)', () => {
    expect(LANDLORD_RULE_MAP_ROWS).toHaveLength(16)
  })

  it('ships a valid map (source-gate + confidence enum)', () => {
    expect(() => assertValidRuleMap(LANDLORD_RULE_MAP_ROWS)).not.toThrow()
  })

  it('keeps Q1–Q2 and Q4–Q8 fully empty (no rule / provision / legalRegime)', () => {
    const nonQ3 = LANDLORD_RULE_MAP_ROWS.filter((r) => !r.id.startsWith('Q3-'))
    expect(nonQ3).toHaveLength(14)
    for (const row of nonQ3) {
      expect(row.rule).toBeNull()
      expect(row.provision).toBeNull()
      expect(row.legalRegime).toBeNull()
      expect(row.sourceUrl).toBeNull()
      expect(row.dateChecked).toBeNull()
      expect(row.reviewDate).toBeNull()
      expect(row.confidence).toBe('empty')
      expect(row.bondByTier).toBeUndefined()
    }
  })
})

describe('landlord rule map - validator invariants', () => {
  it('fails when rule is set without sourceUrl (source-gate)', () => {
    const errors = validateRuleMapRow(
      baseRow({
        rule: 'Bond cannot exceed 4 weeks rent.',
        sourceUrl: null,
        confidence: 'sourced-unverified',
      }),
    )
    expect(errors.some((e) => e.includes('source-gate'))).toBe(true)
  })

  it('passes when rule and sourceUrl are both set', () => {
    const errors = validateRuleMapRow(
      baseRow({
        rule: 'Bond cannot exceed 4 weeks rent.',
        sourceUrl: 'https://www.nsw.gov.au/housing-and-construction/renting',
        sourceType: 'product',
        confidence: 'sourced-unverified',
      }),
    )
    expect(errors).toEqual([])
  })

  it('rejects unknown confidence values', () => {
    const errors = validateRuleMapRow(
      baseRow({ confidence: 'draft' as RuleMapRow['confidence'] }),
    )
    expect(errors.some((e) => e.includes('confidence'))).toBe(true)
  })

  it('served-eligibility: only verified rows pass the filter', () => {
    const empty = baseRow({ confidence: 'empty' })
    const verified = baseRow({
      confidence: 'verified',
      rule: 'Example.',
      sourceUrl: 'https://example.com',
      sourceType: 'primary-official',
    })
    const unverified = baseRow({
      confidence: 'sourced-unverified',
      rule: 'Example.',
      sourceUrl: 'https://example.com',
      sourceType: 'primary-official',
    })

    expect(isServedEligible(empty)).toBe(false)
    expect(isServedEligible(verified)).toBe(true)
    expect(isServedEligible(unverified)).toBe(false)
    expect(filterServedEligible([empty, verified, unverified])).toEqual([verified])
  })
})

describe('landlord rule map - Q3 bond compatibility', () => {
  it('generates TenancyRules deep-equal to nsw.ts / qld.ts for every tier', () => {
    const tiers = ['T1', 'T2'] as const
    for (const tier of tiers) {
      expect(tenancyRulesFromRuleMap(LANDLORD_RULE_MAP_ROWS, 'NSW', tier)).toEqual(
        nswTenancyRules(tier),
      )
      expect(tenancyRulesFromRuleMap(LANDLORD_RULE_MAP_ROWS, 'QLD', tier)).toEqual(
        qldTenancyRules(tier),
      )
    }
  })

  it('maps product authorityUrl onto Q3 sourceUrl', () => {
    const nsw = LANDLORD_RULE_MAP_ROWS.find((r) => r.id === 'Q3-NSW')
    const qld = LANDLORD_RULE_MAP_ROWS.find((r) => r.id === 'Q3-QLD')
    expect(nsw?.sourceType).toBe('product')
    expect(qld?.sourceType).toBe('product')
    expect(nsw?.sourceUrl).toBe(nswTenancyRules('T2').bond.schemeApplies
      ? nswTenancyRules('T2').bond.authorityUrl
      : null)
    expect(qld?.sourceUrl).toBe(qldTenancyRules('T2').bond.schemeApplies
      ? qldTenancyRules('T2').bond.authorityUrl
      : null)
    // Narrative law cells stay null until primary-source verify.
    expect(nsw?.rule).toBeNull()
    expect(qld?.rule).toBeNull()
    expect(nsw?.confidence).toBe('empty')
    expect(qld?.confidence).toBe('empty')
  })
})
