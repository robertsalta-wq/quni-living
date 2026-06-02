/**
 * Render sample VIC Form 1 + Quni platform addendum PDFs for review (Part A).
 * Output: scripts/test-vic-form1.pdf, scripts/test-vic-addendum.pdf (gitignored).
 *
 * Run: npx tsx scripts/test-vic-form1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'

/** @react-pdf/renderer via tsx requires React on global for transitive theme modules. */
globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { VicResidentialRentalAgreementForm1 } = await import(
  '../src/lib/documents/vic/form1Generator.tsx'
)
const { QuniPlatformAddendumVic } = await import('../src/lib/documents/vic/addendumGenerator.tsx')

const form1Props = {
  documentId: 'vic-form1-review-001',
  generatedAt: '02/06/2026, 10:00:00 am',
  landlord: {
    fullName: 'Alex Rental Provider',
    companyName: null,
    addressLine: '12 Provider Street, Carlton, VIC, 3053',
    email: 'alex.provider@example.com',
    phone: '0400111222',
  },
  tenant: {
    fullName: 'Jordan Renter',
    email: 'jordan.renter@example.com',
    phone: '0411222333',
    dateOfBirth: '2002-03-15',
    emergencyContactName: 'Sam Renter',
    emergencyContactPhone: '0411333444',
    addressForServiceLine: '88 Student Lane, Parkville, VIC, 3052',
  },
  additionalTenantNames: ['Casey Co-Renter'],
  premises: {
    addressLine: '45 Brunswick Street, Fitzroy, VIC, 3065',
    propertyType: 'private_room_landlord_off_site',
    roomType: 'Private room',
    furnished: true,
    linenSupplied: true,
    weeklyCleaningService: false,
  },
  premisesInclusionsLine: 'Furnished bedroom; shared kitchen and bathroom',
  maxOccupantsPermitted: 2,
  term: {
    startDate: '2026-07-20',
    endDate: '2027-01-20',
    periodic: false,
    leaseLengthDescription: '6 months',
  },
  rent: {
    weeklyRent: 420,
    platformFeePercent: 10,
    totalWeekly: 420,
    paymentMethod:
      'Direct deposit — Account name: Quni Living Pty Ltd; BSB: 123-456; Account number: 987654321. Tenants may also pay recurring rent via the Quni Living platform (quni.com.au).',
    rentFrequency: 'weekly',
    paymentTimingDescription: 'Payable in advance each week.',
  },
  bond: { amount: 1680 },
  landlordAgent: null,
  urgentRepairsTradespeople: {
    electrician: 'Alex Rental Provider — 0400111222',
    plumber: 'Alex Rental Provider — 0400111222',
    other: null,
  },
  electronicService: {
    landlordEmail: 'alex.provider@example.com',
    tenantEmail: 'jordan.renter@example.com',
    landlordConsentsToEmailService: true,
    tenantConsentsToEmailService: true,
  },
  lastRentIncreaseDate: null,
  landlordPostcode: '3053',
  premisesPostcode: '3065',
  rentPaymentBankDetails: {
    bsb: '123456',
    accountNumber: '987654321',
    accountName: 'Quni Living Pty Ltd',
    bankName: 'Example Bank',
  },
  rentPaymentPreference: 'quni_platform',
  specialConditions: [],
  bookingNotes: null,
}

const addendumProps = {
  documentId: 'vic-addendum-review-001',
  generatedAt: '02/06/2026, 10:00:00 am',
  landlord: form1Props.landlord,
  tenant: form1Props.tenant,
  premises: form1Props.premises,
  term: form1Props.term,
  rent: form1Props.rent,
  bond: form1Props.bond,
  utilitiesDescription:
    'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.',
  signingPackage: 'residential_tenancy',
  rentPaymentMethod: 'quni_platform',
  bankDetails: form1Props.rentPaymentBankDetails,
  emergencyContact: 'Sam Renter — 0411333444',
  rentEnquiriesEmail: 'rent@quni.com.au',
  generalEnquiriesEmail: 'hello@quni.com.au',
  houseCommunicationsChannel: 'Property WhatsApp group (house-related only)',
  utilitiesCap: 150,
  houseRules: 'Quiet hours 10pm–7am. No smoking indoors.',
  landlordServiceFeeText: '10%',
  cardSurchargeDomesticText: '1.7% + $0.30',
  cardSurchargeInternationalText: '3.5% + $0.30',
  moveOutLateCheckoutFeeText: '$50',
  moveOutInternationalTransferFeeText: '$50',
  platformLegalName: 'Quni Living Pty Ltd',
  platformAbn: '12 345 678 901',
  additionalTenantNames: form1Props.additionalTenantNames,
}

const form1El = React.createElement(VicResidentialRentalAgreementForm1, form1Props)
const addendumEl = React.createElement(QuniPlatformAddendumVic, addendumProps)

const form1Buffer = await renderToBuffer(form1El)
const addendumBuffer = await renderToBuffer(addendumEl)

const form1Path = join(process.cwd(), 'scripts', 'test-vic-form1.pdf')
const addendumPath = join(process.cwd(), 'scripts', 'test-vic-addendum.pdf')

writeFileSync(form1Path, form1Buffer)
writeFileSync(addendumPath, addendumBuffer)

console.log('Written:', form1Path)
console.log('Written:', addendumPath)
