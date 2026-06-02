import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { NswLicenceToOccupyOnSite, NSW_OCCUPANCY_PDF_MARKERS } from './occupancyGenerator.tsx'
import type { OccupancyAgreementProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): OccupancyAgreementProps {
  return {
    documentId: 'test-nsw-licence',
    generatedAt: '1 Jan 2026, 12:00:00 pm',
    landlord: {
      fullName: 'Jane Owner',
      companyName: null,
      addressLine: '1 Example St, Sydney NSW 2000',
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
      addressLine: '2 Demo Rd, Sydney NSW 2001',
      propertyType: 'private_room_landlord_on_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2026-02-01',
      endDate: '2027-01-31',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 300,
      platformFeePercent: 10,
      totalWeekly: 330,
      paymentMethod: 'Direct credit to owner account (fee-free)',
    },
    bond: { amount: 1200 },
    specialConditions: [],
    bookingNotes: null,
    houseRules: null,
  }
}

describe('NswLicenceToOccupyOnSite', () => {
  it('renders licence PDF without renter platform fee markers', async () => {
    const buf = await renderToBuffer(
      React.createElement(NswLicenceToOccupyOnSite, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    for (const marker of NSW_OCCUPANCY_PDF_MARKERS) {
      expect(text).toContain(marker.replace(/\s+/g, ' '))
    }
    expect(text).not.toMatch(/Platform fee \(/i)
    expect(text).not.toMatch(/Platform fee component/i)
    expect(text).not.toMatch(/total weekly payment/i)
    expect(text).toContain('not lodged with NSW Fair Trading')
    expect(text).not.toMatch(/must be lodged with NSW Fair Trading/i)
  })
})
