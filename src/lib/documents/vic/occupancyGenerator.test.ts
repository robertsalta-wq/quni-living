import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { VicLicenceToOccupyOnSite } from './occupancyGenerator.tsx'
import type { OccupancyAgreementProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): OccupancyAgreementProps {
  return {
    documentId: 'test-vic-licence',
    generatedAt: '1 Jan 2026, 12:00:00 pm',
    serviceTier: 'listing',
    landlord: {
      fullName: 'Jane Owner',
      companyName: null,
      addressLine: '1 Example St, Melbourne VIC 3000',
      email: 'jane@example.com',
      phone: '0400 000 000',
    },
    tenant: {
      fullName: 'Alex Resident',
      email: 'alex@example.com',
      phone: '0401 000 000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: '2 Demo Rd, Melbourne VIC 3001',
      propertyType: 'private_room_landlord_on_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2025-07-15',
      endDate: '2026-01-15',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 300,
      platformFeePercent: 0,
      totalWeekly: 300,
      paymentMethod: 'Direct credit (see clause 11)',
    },
    bond: { amount: 1200 },
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAcn: '675 990 968',
    platformTradingName: 'Quni Living',
    payout: {
      account_name: 'Jane Owner Trust',
      bsb: '123456',
      account_number: '987654321',
    },
    paymentReference: 'Alex Resident — 2 Demo Rd, Melbourne VIC 3001',
    schemeApplies: false,
    qldBondRemittancePreference: null,
    specialConditions: [
      'Licence fee payments are made by direct credit to the owner account as set out in clause 11.',
    ],
    bookingNotes: null,
    houseRules: null,
  }
}

describe('VicLicenceToOccupyOnSite', () => {
  it('renders payee block and bond+rent account cross-references', async () => {
    const buf = await renderToBuffer(
      React.createElement(VicLicenceToOccupyOnSite, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    expect(text).toContain('Jane Owner Trust')
    expect(text).toContain('123-456')
    expect(text).toContain('987654321')
    expect(text).toContain('Alex Resident — 2 Demo Rd, Melbourne VIC 3001')
    expect(text).toContain('paid to the account set out in clause 11')
    expect(text).toContain('paid to the same account set out in clause 11')
    expect(text).toContain('direct credit to the owner account as set out in clause 11')
    expect(text).not.toContain('powered by Stripe')
    expect(text).not.toContain('will be provided by the owner')
  })
})
