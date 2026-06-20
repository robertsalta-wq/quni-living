import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { QldLicenceToOccupyOnSite, QLD_OCCUPANCY_PDF_MARKERS } from './occupancyGenerator.tsx'
import type { OccupancyAgreementProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): OccupancyAgreementProps {
  return {
    documentId: 'test-qld-licence',
    generatedAt: '1 Jan 2026, 12:00:00 pm',
    serviceTier: 'listing',
    landlord: {
      fullName: 'Jane Owner',
      companyName: null,
      addressLine: '1 Example St, Brisbane QLD 4000',
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
      addressLine: '2 Demo Rd, Brisbane QLD 4001',
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
      paymentMethod: 'Direct credit to owner account (fee-free)',
    },
    bond: { amount: 1200 },
    specialConditions: [],
    bookingNotes: null,
    houseRules: null,
  }
}

describe('QldLicenceToOccupyOnSite', () => {
  it('renders licence PDF with RTA bond and no renter platform fee', async () => {
    const buf = await renderToBuffer(
      React.createElement(QldLicenceToOccupyOnSite, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    for (const marker of QLD_OCCUPANCY_PDF_MARKERS) {
      expect(text).toContain(marker.replace(/\s+/g, ' '))
    }
    expect(text).not.toMatch(/Platform fee \(/i)
    expect(text).not.toMatch(/Platform fee component/i)
    expect(text).not.toMatch(/total weekly payment/i)
    expect(text).toContain('15/07/2025')
    expect(text).toContain('12 Condition report')
    expect(text).not.toMatch(/deducted from amounts payable to the owner/i)
  })

  it('renders no-bond schedule and body copy when bond amount is null', async () => {
    const props = { ...minimalProps(), bond: { amount: null } }
    const buf = await renderToBuffer(
      React.createElement(QldLicenceToOccupyOnSite, props) as Parameters<typeof renderToBuffer>[0],
    )
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    expect(text).toContain('None agreed')
    expect(text).toContain('No bond is required unless otherwise agreed in writing.')
  })
})
