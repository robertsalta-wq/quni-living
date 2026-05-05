import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  item9RentPaymentMethodPair,
  QldGeneralTenancyAgreement,
} from './QldGeneralTenancyAgreement.tsx'
import type { QldGeneralTenancyAgreementProps } from '../../../api/documents/rtaTypes.js'
import { QLD_FORM18A_PDF_MARKERS } from './qld/form18aPdfMarkers.ts'

function minimalProps(): QldGeneralTenancyAgreementProps {
  return {
    documentId: 'form18a-test-id',
    generatedAt: '5 May 2026, 10:00:00 am',
    landlord: {
      fullName: 'Lessor One',
      companyName: null,
      addressLine: '1 Street, Brisbane QLD 4000',
      email: 'lessor@example.com',
      phone: '0400 000 000',
    },
    tenant: {
      fullName: 'Tenant One',
      email: 'tenant@example.com',
      phone: '0401 000 000',
      dateOfBirth: null,
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '0402 000 000',
    },
    additionalTenantNames: [],
    premises: {
      addressLine: '2 Road, Brisbane QLD 4001',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Room A',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    premisesInclusionsLine: 'Room: Room A; Furnished',
    maxOccupantsPermitted: 2,
    term: {
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 400,
      platformFeePercent: 3,
      totalWeekly: 412,
      paymentMethod: 'Direct deposit as described below',
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: 1600 },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: 'Lessor One — 0400 000 000',
      plumber: 'Lessor One — 0400 000 000',
      other: null,
    },
    electronicService: {
      landlordEmail: 'lessor@example.com',
      tenantEmail: 'tenant@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode: '4000',
    premisesPostcode: '4001',
    rentPaymentBankDetails: {
      bsb: '123456',
      accountNumber: '12345678',
      accountName: 'Trust Account',
      bankName: 'Example Bank',
    },
    rentPaymentPreference: 'bank_transfer',
    specialConditions: [],
    bookingNotes: null,
  }
}

describe('item9RentPaymentMethodPair', () => {
  it('bank_transfer uses two bank-account channels (s.83 / standard term 8(3))', () => {
    const p = item9RentPaymentMethodPair('bank_transfer')
    expect(p.method1).toMatch(/Electronic funds transfer/i)
    expect(p.method2).toMatch(/Over-the-counter deposit/i)
  })

  it('quni_platform pairs platform with direct credit', () => {
    const p = item9RentPaymentMethodPair('quni_platform')
    expect(p.method1).toMatch(/Quni Living platform/i)
    expect(p.method2).toMatch(/Direct credit/i)
  })
})

describe('QldGeneralTenancyAgreement', () => {
  it('renders a PDF whose extracted text includes prescribed Form 18a markers', async () => {
    const buf = await renderToBuffer(
      React.createElement(QldGeneralTenancyAgreement, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    for (const marker of QLD_FORM18A_PDF_MARKERS) {
      expect(text).toContain(marker.replace(/\s+/g, ' '))
    }
    expect(text).toContain('Method 1:')
    expect(text).toContain('Method 2:')
    const bankPair = item9RentPaymentMethodPair('bank_transfer')
    expect(text).toContain(bankPair.method1.replace(/\s+/g, ' '))
    expect(text).toContain(bankPair.method2.replace(/\s+/g, ' '))
  })

  it('renders platform + direct credit Item 9 lines when rentPaymentPreference is quni_platform', async () => {
    const props = { ...minimalProps(), rentPaymentPreference: 'quni_platform' as const }
    const buf = await renderToBuffer(
      React.createElement(QldGeneralTenancyAgreement, props) as Parameters<typeof renderToBuffer>[0],
    )
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    const plat = item9RentPaymentMethodPair('quni_platform')
    expect(text).toContain(plat.method1.replace(/\s+/g, ' '))
    expect(text).toContain(plat.method2.replace(/\s+/g, ' '))
  })
})
