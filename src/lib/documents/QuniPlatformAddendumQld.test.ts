import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuniPlatformAddendumQld, QLD_PLATFORM_ADDENDUM_PDF_MARKERS } from './QuniPlatformAddendumQld.tsx'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): QuniPlatformAddendumProps {
  return {
    documentId: 'addendum-test-id',
    generatedAt: '5 May 2026, 10:00:00 am',
    landlord: {
      fullName: 'Landlord One',
      companyName: null,
      addressLine: '1 Street, Brisbane QLD 4000',
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
      addressLine: '2 Road, Brisbane QLD 4001',
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
      weeklyRent: 400,
      platformFeePercent: 10,
      totalWeekly: 440,
      paymentMethod: 'Bank transfer',
    },
    bond: { amount: 1600 },
    utilitiesDescription: 'Electricity, water, gas and Wi-Fi',
    signingPackage: 'residential_tenancy_qld',
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

describe('QuniPlatformAddendumQld', () => {
  it('renders a PDF whose extracted text includes Queensland platform addendum markers', async () => {
    const buf = await renderToBuffer(
      React.createElement(QuniPlatformAddendumQld, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    for (const marker of QLD_PLATFORM_ADDENDUM_PDF_MARKERS) {
      expect(text).toContain(marker.replace(/\s+/g, ' '))
    }
  })

  it('renders no-bond copy in summary and section 10 when bond amount is null', async () => {
    const props = { ...minimalProps(), bond: { amount: null } }
    const buf = await renderToBuffer(
      React.createElement(QuniPlatformAddendumQld, props) as Parameters<typeof renderToBuffer>[0],
    )
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    expect(text).toContain('No bond required')
    expect(text).toContain('No bond is required for this tenancy')
  })
})
