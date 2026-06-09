import { describe, expect, it } from 'vitest'
import { StandardFonts } from 'pdf-lib'
import { QLD_FORM18A_RENAMED_FIELDS as F } from './qldForm18aRenamedFields.js'
import {
  QLD_FORM18A_SPECIAL_TERMS_POINTER,
  composeQldForm18aSpecialTermsText,
  resolveUtilitiesScheduleOverflow,
} from './qldForm18aScheduleOverflow.js'
import { loadOfficialQldForm18aTemplate } from './officialQldForm18aFill.js'
import { resolvePropertyUtilities } from '../../../src/lib/propertyUtilitiesResolver.js'

describe('qldForm18aScheduleOverflow', () => {
  it('writes Item 14 percentage directly without special-terms overflow', async () => {
    const doc = await loadOfficialQldForm18aTemplate()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const utilities = resolvePropertyUtilities({
      featureNames: ['furnished'],
      waterUsageChargedSeparately: false,
      electricityEmbeddedNetwork: null,
      gasEmbeddedNetwork: null,
      waterSeparatelyMeteredEfficientAttestedAt: null,
      utilitiesServices: {
        electricity: {
          tenant_pays: true,
          individually_metered: false,
          apportionment_percent: 25,
          how_must_be_paid: 'Invoiced quarterly',
        },
        gas: {
          tenant_pays: true,
          individually_metered: true,
          apportionment_percent: null,
          how_must_be_paid: 'Direct to retailer',
        },
      },
    })

    const result = resolveUtilitiesScheduleOverflow(doc.getForm(), font, utilities)
    const assignmentMap = new Map(result.scheduleAssignments)

    expect(assignmentMap.get(F.Cost_for_electricity)).toBe('25%')
    expect(assignmentMap.get(F.Cost_for_electricity)).not.toBe(QLD_FORM18A_SPECIAL_TERMS_POINTER)
    expect(assignmentMap.get(F.How_gas_must_be_paid_for)).toBe('Direct to retailer')
    expect(result.specialTermsLines).toEqual([])
  })

  it('overflows long Item 15 how-paid text to Special Terms', async () => {
    const doc = await loadOfficialQldForm18aTemplate()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const longHowPaid = 'Pay '.repeat(120)
    const utilities = resolvePropertyUtilities({
      featureNames: ['furnished'],
      waterUsageChargedSeparately: false,
      electricityEmbeddedNetwork: null,
      gasEmbeddedNetwork: null,
      waterSeparatelyMeteredEfficientAttestedAt: null,
      utilitiesServices: {
        electricity: {
          tenant_pays: true,
          individually_metered: false,
          apportionment_percent: 25,
          how_must_be_paid: longHowPaid,
        },
        gas: {
          tenant_pays: false,
          individually_metered: null,
          apportionment_percent: null,
          how_must_be_paid: null,
        },
      },
    })

    const result = resolveUtilitiesScheduleOverflow(doc.getForm(), font, utilities)
    const assignmentMap = new Map(result.scheduleAssignments)

    expect(assignmentMap.get(F.Cost_for_electricity)).toBe('25%')
    expect(assignmentMap.get(F.How_electricity_must_be_paid_for)).toBe(QLD_FORM18A_SPECIAL_TERMS_POINTER)
    expect(result.specialTermsLines.some((l) => l.includes('how must be paid (Item 15)'))).toBe(true)
  })

  it('composes Special Terms only as Nil when genuinely empty', () => {
    expect(
      composeQldForm18aSpecialTermsText({
        utilitiesOverflowLines: [],
        specialConditions: [],
        bookingNotes: null,
      }),
    ).toBe('Nil additional special terms at execution.')
  })
})
