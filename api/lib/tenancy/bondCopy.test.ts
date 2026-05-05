import { describe, expect, it } from 'vitest'

import { bondStepRegulatoryCopy, fallbackSchemeLodgementDeadlineBold } from './bondCopy.js'
import { nswTenancyRules } from './rules/nsw.js'
import { qldTenancyRules } from './rules/qld.js'
import { vicTenancyRules } from './rules/vic.js'

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

  it('NSW T2 includes statutory cap fragment from bond rules', () => {
    const copy = bondStepRegulatoryCopy(nswTenancyRules('T2').bond, 'NSW')
    expect(copy.bondCapFragment).toBe(' Under NSW law, bond cannot exceed 4 weeks rent.')
  })

  it('QLD T2 includes statutory cap fragment from bond rules', () => {
    const copy = bondStepRegulatoryCopy(qldTenancyRules('T2').bond, 'QLD')
    expect(copy.bondCapFragment).toBe(' Under Queensland law, bond cannot exceed 4 weeks rent.')
  })

  it('NSW T1 landlord-held omits cap fragment', () => {
    const copy = bondStepRegulatoryCopy(nswTenancyRules('T1').bond, 'NSW')
    expect(copy.mode).toBe('landlord_held')
    expect(copy.bondCapFragment).toBeNull()
  })

  it('VIC omits cap fragment when maxBondCopy is null', () => {
    const copy = bondStepRegulatoryCopy(vicTenancyRules('T2').bond, 'VIC')
    expect(copy.mode).toBe('scheme')
    expect(copy.bondCapFragment).toBeNull()
  })
})

describe('fallbackSchemeLodgementDeadlineBold', () => {
  it('matches QLD vs other states', () => {
    expect(fallbackSchemeLodgementDeadlineBold('QLD')).toBe('10 days')
    expect(fallbackSchemeLodgementDeadlineBold('NSW')).toBe('10 business days')
  })
})
