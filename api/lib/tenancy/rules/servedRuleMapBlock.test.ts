import { describe, expect, it } from 'vitest'
import { formatServedRuleMapBlock } from './servedRuleMapBlock'
import type { RuleMapRow } from './types'

function row(partial: Partial<RuleMapRow> & Pick<RuleMapRow, 'id' | 'confidence' | 'confidenceUrl' | 'confidence'>): RuleMapRow {
  return {
    question: 'Q?',
    state: 'NSW',
    productRegime: null,
    legalRegime: null,
    provision: null,
    sourceType: 'primary-official',
    dateChecked: null,
    reviewDate: null,
    needsSolicitor: false,
    notes: '',
    ...partial,
  }
}

describe('formatServedRuleMapBlock', () => {
  it('returns empty string when no verified rows', () => {
    expect(
      formatServedRuleMapBlock([
        row({
          id: 'Q1-NSW',
          confidence: 'sourced-unverified',
          rule: 'A rule',
          sourceUrl: 'https://example.com',
        }),
      ]),
    ).toBe('')
  })

  it('includes only verified rows with rule + sourceUrl', () => {
    const block = formatServedRuleMapBlock([
      row({
        id: 'Q1-NSW',
        confidence: 'verified',
        rule: 'Spare-room rule text.',
        sourceUrl: 'https://www.fairtrading.nsw.gov.au/example',
        question: 'Spare room?',
      }),
      row({
        id: 'Q2-NSW',
        confidence: 'empty',
        rule: null,
        sourceUrl: null,
      }),
    ])
    expect(block).toContain('SERVED RULE MAP')
    expect(block).toContain('Spare-room rule text.')
    expect(block).toContain('https://www.fairtrading.nsw.gov.au/example')
    expect(block).not.toContain('Q2-NSW')
  })
})
