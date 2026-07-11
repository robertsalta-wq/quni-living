/**
 * Integration: edit booking terms → merge patch → regenerate occupancy PDF → extract text.
 * Simulates post-regenerate draft content (no live Supabase/DocuSeal).
 * Run via: npm run test:integration
 */
import React from 'react'
import { describe, expect, it } from 'vitest'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { NswLicenceToOccupyOnSite } from '../../../src/lib/documents/nsw/occupancyGenerator.tsx'
import type { OccupancyAgreementProps } from '../../documents/rtaTypes.js'
import { buildBookingTermsPatch } from './bookingTermsUpdate.js'
import { isPeriodicLeaseLength } from './leaseEndDate.js'

const property = {
  id: 'p1',
  bond_weeks: 4,
  state: 'NSW',
  property_type: 'private_room_landlord_on_site',
  is_registered_rooming_house: true,
}

const baseBooking = {
  id: 'b-accept',
  status: 'bond_pending',
  weekly_rent: 450,
  bond_amount: 1800,
  rent_breakdown: { base: 400, couple: 50, apply_weekly_rent: 450 },
  move_in_date: '2026-07-01',
  start_date: '2026-07-01',
  end_date: '2026-12-28',
  lease_length: '6 months',
  notes: 'Original landlord note',
  occupant_count: 1,
  housemates_count: 0,
  co_tenant: null,
}

function occupancyPropsFromBooking(booking: Record<string, unknown>): OccupancyAgreementProps {
  const moveIn = String(booking.move_in_date || booking.start_date || '').slice(0, 10)
  const leaseLen = typeof booking.lease_length === 'string' ? booking.lease_length : null
  const endDate = typeof booking.end_date === 'string' ? booking.end_date.slice(0, 10) : null
  const periodic = isPeriodicLeaseLength(leaseLen) || !endDate
  const notesRaw = typeof booking.notes === 'string' ? booking.notes.trim() : ''

  return {
    documentId: 'acceptance-doc',
    generatedAt: '1 Jul 2026, 12:00:00 pm',
    serviceTier: 'listing',
    landlord: {
      fullName: 'Jane Principal',
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
      startDate: moveIn,
      endDate: periodic ? null : endDate,
      periodic,
      leaseLengthDescription: leaseLen || 'As agreed',
    },
    rent: {
      weeklyRent: Number(booking.weekly_rent) || 450,
      platformFeePercent: 0,
      totalWeekly: Number(booking.weekly_rent) || 450,
      paymentMethod: 'Direct credit (see clause 11)',
    },
    bond: { amount: Number(booking.bond_amount) || 1800 },
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAcn: '675 990 968',
    platformTradingName: 'Quni Living',
    payout: {
      account_name: 'Jane Principal Trust',
      bsb: '123456',
      account_number: '987654321',
    },
    paymentReference: 'Alex Resident — 2 Demo Rd',
    schemeApplies: false,
    qldBondRemittancePreference: null,
    specialConditions: [],
    bookingNotes: notesRaw.length > 0 ? notesRaw : null,
    houseRules: null,
  }
}

async function pdfTextFromBooking(booking: Record<string, unknown>): Promise<string> {
  const props = occupancyPropsFromBooking(booking)
  const buf = await renderToBuffer(
    React.createElement(NswLicenceToOccupyOnSite, props) as Parameters<typeof renderToBuffer>[0],
  )
  const parser = new PDFParse({ data: buf })
  const parsed = await parser.getText()
  await parser.destroy()
  return parsed.text.replace(/\s+/g, ' ')
}

function formatAuDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

describe('booking terms → regenerate PDF (integration)', () => {
  it('prints updated notes, lease length, and end date after term edit', async () => {
    const built = await buildBookingTermsPatch(
      baseBooking,
      {
        notes: 'Parking included — updated special condition',
        lease_length: '12 months',
      },
      {
        property,
        primaryTenantEmail: 'alex@example.com',
        landlordProfileId: 'll1',
        reason: 'Agreed 12-month term with parking',
      },
    )

    expect(built.errors).toEqual([])
    expect(built.patch.end_date).toBe('2027-06-30')

    const regeneratedBooking = { ...baseBooking, ...built.patch }

    const beforeText = await pdfTextFromBooking(baseBooking)
    const afterText = await pdfTextFromBooking(regeneratedBooking)

    expect(beforeText).toContain('Original landlord note')
    expect(beforeText).not.toContain('Parking included — updated special condition')

    expect(afterText).toContain('Parking included — updated special condition')
    expect(afterText).toContain('12 months')
    expect(afterText).toContain(formatAuDate('2026-07-01'))
    expect(afterText).toContain(formatAuDate('2027-06-30'))
  })
})
