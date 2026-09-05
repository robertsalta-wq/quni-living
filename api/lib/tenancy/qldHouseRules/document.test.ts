import { describe, expect, it } from 'vitest'
import {
  QLD_HOUSE_RULES_COMMON_AREAS_REQUIRED,
  QLD_HOUSE_RULES_FORBIDDEN_ALL_RESIDENTS_CLEANING,
  buildQldHouseRulesDocument,
  qldHouseRulesDocumentPlainText,
  qldHouseRulesHasProviderCleaningCarveOut,
  qldHouseRulesHasWorkingDogCarveOut,
} from './document'
import { sanitizeQldHouseRuleExtras } from './subjects'
import { parseQldRoomingHouseRulesStored } from './stored'
import { SCHEDULE_7_RULE_3_2, SCHEDULE_7_RULE_7_2 } from './schedule7'

describe('buildQldHouseRulesDocument', () => {
  it('refuses when the rule 3(5) common-areas insert is blank', () => {
    const blank = buildQldHouseRulesDocument({ commonAreas: '   ' })
    expect(blank.ok).toBe(false)
    if (!blank.ok) expect(blank.error).toBe(QLD_HOUSE_RULES_COMMON_AREAS_REQUIRED)
  })

  it('inserts the common-areas description into rule 3(5) and keeps carve-outs', () => {
    const built = buildQldHouseRulesDocument({
      commonAreas: 'kitchen, bathrooms, and lounge',
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const text = qldHouseRulesDocumentPlainText(built.document)
    expect(text).toContain('Common areas in these rental premises include kitchen, bathrooms, and lounge.')
    expect(qldHouseRulesHasWorkingDogCarveOut(built.document)).toBe(true)
    expect(qldHouseRulesHasProviderCleaningCarveOut(built.document)).toBe(true)
    expect(text).toContain(SCHEDULE_7_RULE_7_2)
    expect(text).toContain(SCHEDULE_7_RULE_3_2)
  })

  it('accepts extras only under the seven s 268(1) subjects', () => {
    const built = buildQldHouseRulesDocument({
      commonAreas: 'kitchen and bathrooms',
      extras: {
        smoking: 'No smoking inside.',
        guests: 'Guests leave by 10pm.',
        cleaning: 'Everyone mops the hallway daily.',
        using_shared_facilities: '   ',
      },
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.document.extraRules.map((b) => b.subject)).toEqual(['smoking', 'guests'])
    const text = qldHouseRulesDocumentPlainText(built.document)
    expect(text).toContain('No smoking inside.')
    expect(text).not.toContain('Everyone mops the hallway daily.')
  })

  it('does not generate an all-residents common-area cleaning rule', () => {
    const built = buildQldHouseRulesDocument({ commonAreas: 'kitchen' })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const text = qldHouseRulesDocumentPlainText(built.document)
    expect(text).not.toContain(QLD_HOUSE_RULES_FORBIDDEN_ALL_RESIDENTS_CLEANING)
    expect(built.document.extraRules).toEqual([])
  })

  it('strips unknown extra keys at the sanitizer', () => {
    expect(sanitizeQldHouseRuleExtras({ cleaning: 'x', smoking: 'No smoking.' })).toEqual({
      smoking: 'No smoking.',
    })
  })

  it('parses stored listing JSON without reading marketing house_rules', () => {
    expect(parseQldRoomingHouseRulesStored({ commonAreas: 'lounge', extras: { pets: 'no' } })).toEqual({
      commonAreas: 'lounge',
      extras: {},
    })
    expect(
      parseQldRoomingHouseRulesStored({
        commonAreas: 'lounge',
        extras: { keeping_pets: 'Ask first.' },
      }),
    ).toEqual({
      commonAreas: 'lounge',
      extras: { keeping_pets: 'Ask first.' },
    })
  })
})
