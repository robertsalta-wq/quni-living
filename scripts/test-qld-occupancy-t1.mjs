/**
 * Render sample QLD on-site licence PDF for review.
 * Output: scripts/test-qld-occupancy-t1.pdf (gitignored via scripts/*.pdf)
 *
 * Run: npx tsx scripts/test-qld-occupancy-t1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { QldLicenceToOccupyOnSite } = await import('../src/lib/documents/qld/occupancyGenerator.tsx')

const props = {
  documentId: 'qld-licence-review-001',
  generatedAt: '02/06/2026, 10:00:00 am',
  landlord: {
    fullName: 'Morgan Owner',
    companyName: null,
    addressLine: '12 Owner Street, West End, QLD, 4101',
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
  },
  premises: {
    addressLine: '12 Owner Street, West End, QLD, 4101',
    propertyType: 'private_room_landlord_on_site',
    roomType: 'Rear bedroom',
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
    paymentMethod: 'Direct credit to owner account (fee-free). Reference: resident name and property address.',
  },
  bond: { amount: 760 },
  specialConditions: [],
  bookingNotes: null,
  houseRules: 'Quiet hours 10pm–7am. No shoes on carpet.',
}

const el = React.createElement(QldLicenceToOccupyOnSite, props)
const buffer = await renderToBuffer(el)
const outPath = join(process.cwd(), 'scripts', 'test-qld-occupancy-t1.pdf')
writeFileSync(outPath, buffer)
console.log('Written:', outPath)
