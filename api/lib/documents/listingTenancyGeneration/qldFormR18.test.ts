import { describe, expect, it } from 'vitest'
import { getListingTenancyGenerator } from './registry.js'
import { resolveTenancyPackage } from '../../resolveTenancyPackage.js'
import {
  buildQldFormR18Pdfs,
  QLD_FORM_R18_GENERATOR_ID,
  qldFormR18SamplePackageProps,
} from './qldFormR18.js'

async function pdfText(pdfBytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: Uint8Array.from(pdfBytes), useSystemFonts: true }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return pages.join('\n')
}

describe('qld-form-r18 listing generator', () => {
  it('is on the listing registry and QLD T3 is supported', () => {
    expect(getListingTenancyGenerator(QLD_FORM_R18_GENERATOR_ID)).not.toBeNull()
    const pkg = resolveTenancyPackage({
      state: 'QLD',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    })
    expect(pkg.supported).toBe(true)
    expect(pkg.generator).toBe(QLD_FORM_R18_GENERATOR_ID)
    expect(pkg.tier).toBe('T3')
  })

  it('packs Form R18 with a resident house-rules copy and no Form 18a or Form 9', async () => {
    const sample = qldFormR18SamplePackageProps()
    const { r18Buffer, houseRulesBuffer } = await buildQldFormR18Pdfs({
      r18: sample.r18,
      houseRules: sample.houseRules,
      generatedAt: new Date('2026-09-08T00:00:00+10:00'),
    })
    const r18Text = await pdfText(r18Buffer)
    const rulesText = await pdfText(houseRulesBuffer)
    expect(r18Text).not.toMatch(/Form 18a/)
    expect(r18Text).not.toMatch(/\bForm 9\b/)
    expect(r18Text).not.toMatch(/Form 1a/)
    expect(r18Text).not.toMatch(/Form 14a/)
    expect(r18Text).toMatch(/Direct credit/)
    expect(r18Text.replace(/\s+/g, ' ')).toContain('Resident room 1')
    expect(rulesText).toMatch(/Give this copy to the proposed resident/)
    expect(rulesText).toMatch(/s 275/)
    expect(rulesText).toMatch(/Kitchen, bathrooms, and shared living room/)
    expect(rulesText).not.toMatch(/Form 18a/)
  })
})
