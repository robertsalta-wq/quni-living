import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuniPlatformAddendum } from './QuniPlatformAddendum.tsx'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): QuniPlatformAddendumProps {
  return {
    documentId: 'addendum-nsw-test',
    generatedAt: '5 May 2026, 10:00:00 am',
    landlord: {
      fullName: 'Landlord One',
      companyName: null,
      addressLine: '1 Street, Sydney NSW 2000',
      email: 'landlord@example.com',
      phone: '0400 000 000',
    },
    tenant: {
      fullName: 'Tenant One',
      email: 'tenant@example.com',
      phone: '0401 000 000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: '2 Road, Sydney NSW 2001',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Room A',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 450,
      platformFeePercent: 10,
      totalWeekly: 495,
      paymentMethod: 'Bank transfer',
    },
    bond: { amount: null },
    utilitiesDescription: 'Electricity, water, gas and Wi-Fi',
    signingPackage: 'residential_tenancy',
    serviceTier: 'managed',
    allInclusive: true,
    billsIncluded: true,
    rentPaymentMethod: 'bank_transfer',
    bankDetails: {
      bsb: '123456',
      accountNumber: '12345678',
      accountName: 'Trust Account',
      bankName: 'Example Bank',
    },
    emergencyContact: '000',
    rentEnquiriesEmail: 'rent@quni.com.au',
    generalEnquiriesEmail: 'info@quni.com.au',
    houseCommunicationsChannel: 'Slack',
    utilitiesCap: 300,
    houseRules: null,
  }
}

describe('QuniPlatformAddendum (NSW)', () => {
  it('renders no-bond copy in summary and section 10 when bond amount is null', async () => {
    const buf = await renderToBuffer(
      React.createElement(QuniPlatformAddendum, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    expect(text).toContain('No bond required')
    expect(text).toContain('No bond is required for this tenancy')
  })
})
