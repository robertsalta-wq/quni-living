import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { EMPTY_NSW_T3_SHARED_AREAS } from '../../../tenancy/nswT3ListingFields.js'
import {
  NswBoardingHouseOccupancyAgreement,
  NSW_BOARDING_HOUSE_FORBIDDEN_MARKERS,
  NSW_BOARDING_HOUSE_PDF_MARKERS,
} from './generator.tsx'
import type { NswBoardingHouseAgreementProps } from './types.js'

function sampleProps(overrides: Partial<NswBoardingHouseAgreementProps> = {}): NswBoardingHouseAgreementProps {
  return {
    documentId: 'test-nsw-boarding-house',
    generatedAt: '14 Aug 2026, 12:00:00 pm',
    proprietor: {
      fullName: 'Pat Proprietor',
      companyName: null,
      abn: '12 345 678 901',
      addressLine: '10 Host Street, Newtown NSW 2042',
      email: 'pat@example.com',
      phone: '0400 111 222',
    },
    resident: {
      fullName: 'Alex Resident',
      email: 'alex@example.com',
      phone: '0401 000 000',
      emergencyContactName: 'Sam Resident',
      emergencyContactPhone: '0402 000 000',
    },
    premises: {
      addressLine: '45 Boarding Street, Newtown, NSW, 2042',
      roomDescription: 'Room 3, first floor rear',
      furnished: true,
      sharedAreas: {
        kitchen: true,
        bathroom: true,
        commonRoom: false,
        laundry: true,
        other: '',
      },
    },
    term: {
      startDate: '2026-08-20',
      endDate: '2027-02-20',
      periodic: false,
      leaseLengthDescription: '6 months',
    },
    occupancyFeeWeeklyAud: 350,
    securityDepositAud: 700,
    payout: {
      account_name: 'Pat Proprietor',
      bsb: '123456',
      account_number: '987654321',
    },
    paymentReference: 'Alex Resident - 45 Boarding Street',
    houseRules: 'Quiet hours 10pm-7am. Shared kitchen cleaned after use.',
    additionalCharges: [],
    ...overrides,
  }
}

async function pdfText(props: NswBoardingHouseAgreementProps): Promise<string> {
  const buf = await renderToBuffer(
    React.createElement(NswBoardingHouseOccupancyAgreement, props) as Parameters<typeof renderToBuffer>[0],
  )
  expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  const parser = new PDFParse({ data: buf })
  const parsed = await parser.getText()
  await parser.destroy()
  return parsed.text.replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2').replace(/\s+/g, ' ')
}

describe('NswBoardingHouseOccupancyAgreement', () => {
  it('prints locked Fair Trading body and forbids T1/Quni markers', async () => {
    const text = await pdfText(sampleProps())
    for (const marker of NSW_BOARDING_HOUSE_PDF_MARKERS) {
      expect(text).toContain(marker.replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2').replace(/\s+/g, ' '))
    }
    for (const forbidden of NSW_BOARDING_HOUSE_FORBIDDEN_MARKERS) {
      expect(text).not.toContain(forbidden)
    }
    expect(text).toContain('Room 3, first floor rear')
    expect(text).toContain('Either party may apply to the NSW Civil and Administrative Tribunal (NCAT)')
    expect(text).toContain('$700.00')
    expect(text).toContain('Pat Proprietor')
    expect(text).toContain('123-456')
    expect(text).toContain('Quiet hours 10pm-7am')
    expect(text).toContain('Statement of House Rules')
    expect(text).toContain('are included in Annexure 2')
    expect(text).not.toContain('Schedule of Additional Charges')
  })

  it('requires the room description and shared-area ticks on the particulars', async () => {
    const text = await pdfText(sampleProps())
    expect(text).toContain('Room 3, first floor rear')
    expect(text).toContain('Kitchen/s')
    expect(text).toContain('Laundry')
  })

  it('omits Annexure 2 and extra sign tags when there are no charge rows', async () => {
    const text = await pdfText(sampleProps({ additionalCharges: [] }))
    expect(text).not.toContain('Schedule of Additional Charges')
    expect(text).not.toContain('Annexure 2 Proprietor Signature')
    expect(text).toContain('Proprietor Signature')
    expect(text).toContain('Resident Signature')
  })

  it('mounts Annexure 2 with extra DocuSeal tags when charge rows exist', async () => {
    const text = await pdfText(
      sampleProps({
        additionalCharges: [
          {
            item: 'Electricity',
            amount: 'Actual cost',
            whenDue: 'Monthly',
            howCalculated: 'Metered use apportioned equally among occupied rooms',
          },
        ],
      }),
    )
    expect(text).toContain('Annexure 2')
    expect(text).toContain('Schedule of Additional Charges')
    expect(text).toContain('Electricity')
    expect(text).toContain('Metered use apportioned equally among occupied rooms')
    expect(text).toContain('Annexure 2 Proprietor Signature')
    expect(text).toContain('Annexure 2 Resident Signature')
  })

  it('leaves clause 5 and 11 override columns blank by default', async () => {
    const text = await pdfText(sampleProps())
    expect(text).toContain('Notice under this agreement (if different)')
    expect(text).toContain('Immediate access*')
    expect(text).toContain('48 hours')
    expect(text).toContain('4 weeks')
  })

  it('renders a dummy override in the same third column when provided', async () => {
    const text = await pdfText(
      sampleProps({
        noticeOverrides: { access: ['12 hours', null, null, null, null] },
      }),
    )
    expect(text).toContain('12 hours')
  })

  it('ticks furnished without attaching an inventory', async () => {
    const text = await pdfText(sampleProps({ premises: { ...sampleProps().premises, furnished: true } }))
    expect(text).toContain('furnished')
    expect(text).toContain('if furnished, an inventory can be attached')
    expect(text).not.toContain('Inventory of furniture')
  })

  it('prints a blank Statement of House Rules body when none are set', async () => {
    const text = await pdfText(sampleProps({ houseRules: null }))
    expect(text).toContain('Statement of House Rules')
    expect(text).not.toContain('Quiet hours 10pm-7am')
  })

  it('does not fall back to room_type when a room description is supplied', async () => {
    const text = await pdfText(sampleProps())
    expect(text).toContain('Room 3, first floor rear')
    expect(text).not.toContain('single')
  })
})

describe('NswBoardingHouseAgreementProps shared-area default', () => {
  it('does not silently tick all four common areas', () => {
    expect(EMPTY_NSW_T3_SHARED_AREAS).toEqual({
      kitchen: false,
      bathroom: false,
      commonRoom: false,
      laundry: false,
      other: '',
    })
  })
})
