import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  VIC_ROOMING_HOUSE_FORM_REFERENCE,
  fillOfficialVicRoomingHousePdf,
  loadOfficialVicRoomingHouseTemplate,
  type VicRoomingHouseFillProps,
} from './officialVicRoomingHouseFill.js'

const payOff = {
  directDebit: false,
  bankDeposit: false,
  cash: false,
  cheque: false,
  bpay: false,
  otherEft: false,
}

function sample(overrides: Partial<VicRoomingHouseFillProps> = {}): VicRoomingHouseFillProps {
  return {
    agreementDateLabel: '24/11/2026',
    roomNumber: 'Room 4',
    streetAddress: '9 Test Street',
    suburb: 'Melbourne',
    postcode: '3000',
    itemsLetWithRoom: 'Desk and lamp',
    operatorName: 'Ada Operator',
    operatorAddress: '1 Operator Lane, Melbourne VIC',
    operatorPostcode: '3000',
    operatorPhone: '0400000000',
    operatorAbn: '12345678901',
    operatorEmail: 'ada@example.com',
    resident1Name: 'Sam Resident',
    resident1Address: '',
    resident1Postcode: '',
    resident1Phone: '0400111111',
    resident1Email: 'sam@example.com',
    resident2Name: '',
    resident2Address: '',
    resident2Postcode: '',
    resident2Phone: '',
    resident2Email: '',
    startDateLabel: '01/12/2026',
    endDateLabel: '31/05/2027',
    weeklyRent: '400.00',
    rentDueDay: 'Tuesday',
    firstRentDueLabel: '01/12/2026',
    bondAmount: '1600.00',
    bondDueLabel: '01/12/2026',
    pay: { ...payOff, bankDeposit: true, bpay: true },
    bankAccountName: 'Ada Operator',
    bankBsb: '123-456',
    bankAccountNumber: '99887766',
    operatorAcceptsElectronicService: true,
    residentAcceptsElectronicService: false,
    urgentContactName: 'Ada Operator',
    urgentContactPhone: '0400000000',
    urgentContactEmail: 'ada@example.com',
    conditionReport: 'will_be_provided',
    ...overrides,
  }
}

async function textOf(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise
  let out = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    out += content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    out += '\n'
  }
  return out
}

describe('official Victorian rooming house agreement', () => {
  it('keeps the frozen prescribed form, including the printed citation', async () => {
    const blank = await loadOfficialVicRoomingHouseTemplate()
    expect(blank.getPageCount()).toBe(VIC_ROOMING_HOUSE_FORM_REFERENCE.pageCount)
    expect(blank.getForm().getFields()).toHaveLength(0)
    const text = await textOf(await blank.save())
    expect(text).toContain('Section 93A(2(b)')
    expect(text).toContain('at least 90 days')
    expect(text).toContain('28 days')
  })

  it('prints the resident, the weekly tick, bank details, and a no for the resident', async () => {
    const { pdfBytes } = await fillOfficialVicRoomingHousePdf(sample())
    const doc = await PDFDocument.load(pdfBytes)
    expect(doc.getPageCount()).toBe(9)
    const text = await textOf(pdfBytes)
    expect(text).toContain('Sam Resident')
    expect(text).toContain('99887766')
    expect(text).toContain('Desk and lamp')
    expect(text).toContain('Resident Signature')
    expect(text).toContain('type=signature;width=')
    expect(text).toContain('type=date;width=')
    expect(text).not.toContain('Resident 2 Signature')
    expect(text).toContain('OFFICIAL')
  })

  it('places dates, the week tick, and urgent contact inside the boxes, and can omit signing tags', async () => {
    const { pdfBytes } = await fillOfficialVicRoomingHousePdf(sample({ signingTags: false }))
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdf = await pdfjs.getDocument({ data: pdfBytes, useSystemFonts: true }).promise
    const located: { str: string; x: number; y: number; page: number }[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        located.push({ str: item.str, x: item.transform[4], y: item.transform[5], page: i })
      }
    }
    const start = located.find((item) => item.page === 2 && item.str === '01/12/2026' && item.y > 330 && item.y < 370)
    const end = located.find((item) => item.page === 2 && item.str === '31/05/2027')
    const week = located.find((item) => item.page === 2 && item.str === 'X')
    const phone = located.find((item) => item.page === 4 && item.str === '0400000000')
    const email = located.find((item) => item.page === 4 && item.str === 'ada@example.com')
    expect(start && start.x).toBeGreaterThan(255)
    expect(start && start.y).toBeGreaterThan(349)
    expect(end && end.x).toBeGreaterThan(419)
    expect(end && end.y).toBeGreaterThan(349)
    expect(week && week.x).toBeGreaterThan(172)
    expect(week && week.x).toBeLessThan(182)
    expect(phone && phone.x).toBeGreaterThan(170)
    expect(email && email.x).toBeGreaterThan(170)
    expect(email && email.y).toBeGreaterThan(722)
    const serviceEmail = located.find((item) => item.page === 3 && item.str === 'ada@example.com')
    expect(serviceEmail && serviceEmail.x).toBeGreaterThan(298)
    expect(serviceEmail && serviceEmail.y).toBeGreaterThan(245)
    expect(serviceEmail && serviceEmail.y).toBeLessThan(276)
    expect(located.some((item) => item.str.includes('{{'))).toBe(false)

    const resident = await fillOfficialVicRoomingHousePdf(
      sample({ signingTags: false, residentAcceptsElectronicService: true }),
    )
    const residentPdf = await pdfjs.getDocument({ data: resident.pdfBytes, useSystemFonts: true }).promise
    const residentPage = await residentPdf.getPage(3)
    const residentContent = await residentPage.getTextContent()
    const residentEmail = residentContent.items.find(
      (item) => 'str' in item && item.str === 'sam@example.com',
    )
    expect(residentEmail && 'transform' in residentEmail && residentEmail.transform[4]).toBeGreaterThan(298)
    expect(residentEmail && 'transform' in residentEmail && residentEmail.transform[5]).toBeGreaterThan(139)
    expect(residentEmail && 'transform' in residentEmail && residentEmail.transform[5]).toBeLessThan(171)
  })

  it('leaves payment details blank when only BPAY is ticked', async () => {
    const { pdfBytes } = await fillOfficialVicRoomingHousePdf(
      sample({ pay: { ...payOff, bpay: true } }),
    )
    const text = await textOf(pdfBytes)
    expect(text).not.toContain('99887766')
    expect(text).toContain('Sam Resident')
  })
})
