import { describe, expect, it } from 'vitest'
import { QLD_FORM_R18_CHECKS as C, QLD_FORM_R18_FIELDS as F } from './qldFormR18Fields.js'
import {
  QLD_FORM_R18_PART3_OVERFLOW_MESSAGE,
  QLD_FORM_R18_PART3_SPECIAL_TERMS,
  QldFormR18Part3OverflowError,
} from './qldFormR18Part3.js'
import {
  applyOfficialQldFormR18Fill,
  fillOfficialQldFormR18Pdf,
  loadOfficialQldFormR18Template,
} from './officialQldFormR18Fill.js'
import { qldFormR18SampleFillProps } from './qldFormR18SampleProps.js'

async function allPageText(pdfBytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: Uint8Array.from(pdfBytes), useSystemFonts: true }).promise
  const parts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return parts.join('\n')
}

describe('officialQldFormR18Fill', () => {
  it('loads Form R18 v15 with Part 3 Special terms', async () => {
    const doc = await loadOfficialQldFormR18Template()
    expect(doc.getPageCount()).toBe(11)
    expect(doc.getForm().getTextField(F.Special_terms).isMultiline()).toBe(true)
    expect(doc.getForm().getTextField(F.Special_terms).getMaxLength()).toBeUndefined()
  })

  it('fills Item 3 blank, Item 17 Yes only with attestation, and locked Part 3 text', async () => {
    const doc = await loadOfficialQldFormR18Template()
    const { filledFieldNames } = await applyOfficialQldFormR18Fill(doc, qldFormR18SampleFillProps())
    const form = doc.getForm()
    expect(form.getTextField(F.Agent_name).getText() || '').toBe('')
    expect(filledFieldNames).not.toContain(F.Agent_name)
    expect(form.getCheckBox(C.house_rules_given_yes).isChecked()).toBe(true)
    expect(form.getCheckBox(C.house_rules_given_no).isChecked()).toBe(false)
    expect(form.getCheckBox(C.notice_provider_email_yes).isChecked()).toBe(true)
    expect(form.getCheckBox(C.notice_provider_sms_no).isChecked()).toBe(true)
    expect(form.getCheckBox(C.notice_provider_fax_no).isChecked()).toBe(true)
    expect(form.getCheckBox(C.notice_resident_email_yes).isChecked()).toBe(true)
    expect(form.getCheckBox(C.notice_resident_fax_no).isChecked()).toBe(true)
    expect(form.getTextField(F.Special_terms).getText()).toBe(QLD_FORM_R18_PART3_SPECIAL_TERMS)
    expect(form.getTextField(F.Room_number).getText()).toBe('1')

    const noAttest = await loadOfficialQldFormR18Template()
    await applyOfficialQldFormR18Fill(noAttest, { ...qldFormR18SampleFillProps(), houseRulesProvided: false })
    expect(noAttest.getForm().getCheckBox(C.house_rules_given_yes).isChecked()).toBe(false)
    expect(noAttest.getForm().getCheckBox(C.house_rules_given_no).isChecked()).toBe(true)

    const { pdfBytes } = await fillOfficialQldFormR18Pdf(qldFormR18SampleFillProps())
    const all = await allPageText(pdfBytes)
    expect(all).not.toMatch(/Form 18a/)
    expect(all).not.toMatch(/\bForm 9\b/)
    expect(all).not.toMatch(/Form 1a/)
    expect(all).not.toMatch(/Form 14a/)
    const compact = all.replace(/\s+/g, ' ')
    expect(compact).toContain('Quni Living is not the provider')
    expect(compact).toContain('one-off platform fee')
    expect(compact).toMatch(/Direct credit/)
    expect(compact).toMatch(/Robert Resident/)
  })

  it('throws on Part 3 overflow instead of clipping', async () => {
    const oversized = Array.from(
      { length: 40 },
      (_, i) => `Overflow fixture ${i + 1}. This string is not the locked Part 3 special terms.`,
    ).join('\n')
    expect(oversized).not.toContain('Quinnvestments')
    await expect(
      fillOfficialQldFormR18Pdf({
        ...qldFormR18SampleFillProps(),
        specialTermsText: oversized,
      }),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(QldFormR18Part3OverflowError)
      expect((err as Error).message).toBe(QLD_FORM_R18_PART3_OVERFLOW_MESSAGE)
      return true
    })
  })

  it('ticks Item 15 Level 1 and does not invent an agent', async () => {
    const doc = await loadOfficialQldFormR18Template()
    const form = doc.getForm()
    expect(form.getCheckBox(C.item15_level_1).getName()).toBe('Level 1a')
    const { pdfBytes } = await fillOfficialQldFormR18Pdf(qldFormR18SampleFillProps())
    const text = await allPageText(pdfBytes)
    expect(text).toMatch(/Direct credit/)
    expect(text).toMatch(/Robert Resident/)
  })
})
