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
  it('overflows long Item 14 apportionment to Special Terms with schedule pointer', async () => {
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
          apportionment_method:
            '50% of common area electricity usage divided equally among four bedrooms',
          how_must_be_paid: 'Invoiced quarterly',
        },
        gas: {
          tenant_pays: true,
          individually_metered: true,
          apportionment_method: null,
          how_must_be_paid: 'Direct to retailer',
        },
      },
    })

    const result = resolveUtilitiesScheduleOverflow(doc.getForm(), font, utilities)
    const assignmentMap = new Map(result.scheduleAssignments)

    expect(assignmentMap.get(F.Cost_for_electricity)).toBe(QLD_FORM18A_SPECIAL_TERMS_POINTER)
    expect(assignmentMap.get(F.How_gas_must_be_paid_for)).toBe('Direct to retailer')
    expect(result.specialTermsLines.some((l) => l.includes('Electricity apportionment (Item 14)'))).toBe(
      true,
    )
    expect(result.specialTermsLines.some((l) => l.includes('four bedrooms'))).toBe(true)
  })

  it('keeps short Item 14 apportionment in the schedule field', async () => {
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
          apportionment_method: '50% of common-area electricity',
          how_must_be_paid: 'Quarterly invoice',
        },
        gas: {
          tenant_pays: false,
          individually_metered: null,
          apportionment_method: null,
          how_must_be_paid: null,
        },
      },
    })

    const result = resolveUtilitiesScheduleOverflow(doc.getForm(), font, utilities)
    const assignmentMap = new Map(result.scheduleAssignments)

    expect(assignmentMap.get(F.Cost_for_electricity)).toBe('50% of common-area electricity')
    expect(result.specialTermsLines).toEqual([])
  })

  it('composes Special Terms only as Nil when genuinely empty', () => {
    expect(
      composeQldForm18aSpecialTermsText({
        utilitiesOverflowLines: [],
        specialConditions: [],
        bookingNotes: null,
      }),
    ).toBe('Nil additional special terms at execution.')

    expect(
      composeQldForm18aSpecialTermsText({
        utilitiesOverflowLines: ['Electricity apportionment (Item 14): 50% shared'],
        specialConditions: [],
        bookingNotes: null,
      }),
    ).toContain('Electricity apportionment (Item 14)')
  })
})
