import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  QLD_HOUSE_RULES_FORBIDDEN_ALL_RESIDENTS_CLEANING,
  buildQldHouseRulesDocument,
  type QldHouseRulesVariant,
} from '../lib/tenancy/qldHouseRules/document'
import { SCHEDULE_7_RULE_3_2, SCHEDULE_7_RULE_7_2 } from '../lib/tenancy/qldHouseRules/schedule7'
import { QldHouseRulesPdf, QLD_HOUSE_RULES_PDF_MARKERS } from './QldHouseRulesPdf.tsx'

const GENERATED_AT = '5 September 2026, 8:00:00 pm'

async function pdfText(variant: QldHouseRulesVariant, extras?: Record<string, string>): Promise<string> {
  const built = buildQldHouseRulesDocument({
    commonAreas: 'kitchen, bathrooms, hallway',
    extras,
    premisesLine: '12 Example Street, Jamboree Heights QLD 4074',
  })
  if (!built.ok) throw new Error(built.error)
  const buf = await renderToBuffer(
    React.createElement(QldHouseRulesPdf, {
      variant,
      document: built.document,
      generatedAtLabel: GENERATED_AT,
    }) as Parameters<typeof renderToBuffer>[0],
  )
  const parser = new PDFParse({ data: buf })
  const parsed = await parser.getText()
  await parser.destroy()
  return parsed.text.replace(/\s+/g, ' ')
}

describe('QldHouseRulesPdf', () => {
  it('prints Schedule 7 carve-outs and the common-areas insert on both variants', async () => {
    for (const variant of ['resident', 'wall'] as const) {
      const text = await pdfText(variant)
      expect(text).toContain('kitchen, bathrooms, hallway')
      expect(text).toContain(SCHEDULE_7_RULE_7_2)
      expect(text).toContain(SCHEDULE_7_RULE_3_2)
      expect(text).toContain(QLD_HOUSE_RULES_PDF_MARKERS.prescribedHeading)
      expect(text).not.toContain(QLD_HOUSE_RULES_FORBIDDEN_ALL_RESIDENTS_CLEANING)
      expect(text).toContain('12 Example Street, Jamboree Heights QLD 4074')
      expect(text).toContain('SL 2025-89')
      expect(text).toContain('reprint current from 1 September 2026')
      expect(text).toContain(GENERATED_AT)
      expect(text).toContain(QLD_HOUSE_RULES_PDF_MARKERS.platformEntity)
      expect(text).not.toContain('Quni Living Pty Ltd')
    }
  })

  it('uses the s 275 banner on the resident copy and the s 276 banner on the wall copy', async () => {
    const resident = await pdfText('resident')
    const wall = await pdfText('wall')
    expect(resident).toContain('s 275')
    expect(resident).toContain(QLD_HOUSE_RULES_PDF_MARKERS.residentBanner.replace(/\s+/g, ' '))
    expect(wall).toContain('s 276')
    expect(wall).toContain('HOUSE RULES')
    expect(wall).toContain(QLD_HOUSE_RULES_PDF_MARKERS.wallBanner.replace(/\s+/g, ' '))
  })

  it('prints provider extras under the s 268(1) heading only', async () => {
    const text = await pdfText('resident', { smoking: 'No smoking inside the house.' })
    expect(text).toContain(QLD_HOUSE_RULES_PDF_MARKERS.extrasHeading)
    expect(text).toContain('Smoking')
    expect(text).toContain('No smoking inside the house.')
  })
})
