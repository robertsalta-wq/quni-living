import { describe, expect, it } from 'vitest'

import { bondStepRegulatoryCopy, fallbackSchemeLodgementDeadlineBold } from './bondCopy.js'
import { nswTenancyRules } from './rules/nsw.js'
import { qldTenancyRules } from './rules/qld.js'

describe('bondStepRegulatoryCopy', () => {
  it('NSW T2 uses business days in the scheme deadline', () => {
    const copy = bondStepRegulatoryCopy(nswTenancyRules('T2').bond, 'NSW')
    expect(copy.mode).toBe('scheme')
    expect(copy.schemeBoldDeadline).toBe('10 business days')
  })

  it('QLD T1 uses calendar days in the scheme deadline', () => {
    const copy = bondStepRegulatoryCopy(qldTenancyRules('T1').bond, 'QLD')
    expect(copy.mode).toBe('scheme')
    expect(copy.schemeBoldDeadline).toBe('10 days')
  })
})

describe('fallbackSchemeLodgementDeadlineBold', () => {
  it('matches QLD vs other states', () => {
    expect(fallbackSchemeLodgementDeadlineBold('QLD')).toBe('10 days')
    expect(fallbackSchemeLodgementDeadlineBold('NSW')).toBe('10 business days')
  })
})
