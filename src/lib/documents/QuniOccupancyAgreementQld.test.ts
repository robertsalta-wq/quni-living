import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuniOccupancyAgreementQld, QLD_OCCUPANCY_PDF_MARKERS } from './QuniOccupancyAgreementQld.tsx'
import type { OccupancyAgreementProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): OccupancyAgreementProps {
  return {
    documentId: 'test-doc-id',
    generatedAt: '1 Jan 2026, 12:00:00 pm',
    landlord: {
      fullName: 'Jane Provider',
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
      startDate: '2026-02-01',
      endDate: '2027-01-31',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 300,
      platformFeePercent: 5,
      totalWeekly: 315,
      paymentMethod: 'Via Quni Living platform (quni.com.au)',
    },
    bond: { amount: 1200 },
    specialConditions: [],
    bookingNotes: null,
    houseRules: null,
  }
}

describe('QuniOccupancyAgreementQld', () => {
  it('renders a PDF whose binary contains Queensland occupancy markers', async () => {
    const buf = await renderToBuffer(
      React.createElement(QuniOccupancyAgreementQld, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text.replace(/\s+/g, ' ')
    for (const marker of QLD_OCCUPANCY_PDF_MARKERS) {
      expect(text).toContain(marker.replace(/\s+/g, ' '))
    }
  })
})
