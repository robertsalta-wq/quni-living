/**
 * Render sample VIC on-site licence-to-occupy PDF (Part A review).
 * Output: scripts/test-vic-occupancy-t1.pdf (gitignored via scripts/*.pdf)
 *
 * Run: npx tsx scripts/test-vic-occupancy-t1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { VicLicenceToOccupyOnSite } = await import('../src/lib/documents/vic/occupancyGenerator.tsx')

/** @type {import('../api/documents/rtaTypes.js').OccupancyAgreementProps} */
const props = {
  documentId: 'vic-licence-review-001',
  generatedAt: '02/06/2026, 10:00:00 am',
  landlord: {
    fullName: 'Morgan Owner',
    companyName: null,
    addressLine: '12 Owner Street, Carlton, VIC, 3053',
    email: 'morgan.owner@example.com',
    phone: '0400111222',
  },
  tenant: {
    fullName: 'Jordan Resident',
    email: 'jordan.resident@example.com',
    phone: '0411222333',
    dateOfBirth: '2002-03-15',
    emergencyContactName: 'Sam Resident',
    emergencyContactPhone: '0411333444',
    addressForServiceLine: '88 Student Lane, Parkville, VIC, 3052',
  },
  premises: {
    addressLine: '12 Owner Street, Carlton, VIC, 3053',
    propertyType: 'private_room_landlord_on_site',
    roomType: 'Bedroom 2 (rear)',
    furnished: true,
    linenSupplied: true,
    weeklyCleaningService: false,
  },
  term: {
    startDate: '2026-07-20',
    endDate: '2027-01-20',
    periodic: false,
    leaseLengthDescription: '6 months',
  },
  rent: {
    weeklyRent: 380,
    platformFeePercent: 10,
    totalWeekly: 418,
    paymentMethod:
      'Direct credit to owner account (fee-free). Reference: resident name and property address.',
  },
  bond: { amount: 760 },
  specialConditions: ['Co-occupant (partner) may stay up to 3 nights per week with owner consent.'],
  bookingNotes: null,
  houseRules: 'Quiet hours 10pm–7am. No shoes on carpet. Owner uses kitchen 7–9am weekdays.',
}

const el = React.createElement(VicLicenceToOccupyOnSite, props)
const buffer = await renderToBuffer(el)
const outPath = join(process.cwd(), 'scripts', 'test-vic-occupancy-t1.pdf')
writeFileSync(outPath, buffer)
console.log('Written:', outPath)
