import { renderToBuffer } from '@react-pdf/renderer'
import { NswResidentialTenancyAgreement } from '../api/documents/NswResidentialTenancyAgreement.js'
import { writeFileSync } from 'fs'

const testProps = {
  documentId: 'test-checkbox-001',
  generatedAt: '11/04/2026, 2:00:00 pm',
  landlord: {
    fullName: 'Test Landlord',
    phone: '0400000000',
    addressLine: '1 Test Street, Sydney, NSW, 2000',
    email: 'landlord@test.com',
  },
  tenant: {
    fullName: 'Test Tenant',
    phone: '0411111111',
    email: 'tenant@test.com',
    addressForServiceLine: null,
  },
  premises: { addressLine: '2 Test Road, Kensington, NSW, 2033' },
  term: {
    periodic: false,
    leaseLengthDescription: '6 months',
    startDate: '2026-04-18',
    endDate: '2026-10-18',
  },
  rent: {
    weeklyRent: 400,
    rentFrequency: 'weekly',
    paymentTimingDescription: 'Payable in advance each week.',
  },
  bond: { amount: 1600 },
  landlordAgent: null,
  urgentRepairsTradespeople: {
    electrician: 'Test Landlord — 0400000000',
    plumber: 'Test Landlord — 0400000000',
    other: null,
  },
  electronicService: {
    landlordConsentsToEmailService: true,
    landlordEmail: 'landlord@test.com',
    tenantConsentsToEmailService: true,
    tenantEmail: 'tenant@test.com',
  },
  additionalPremisesInclusions: [],
  maxOccupantsPermitted: 2,
}

const buffer = await renderToBuffer(NswResidentialTenancyAgreement(testProps))
writeFileSync('scripts/test-output.pdf', buffer)
console.log('Written to scripts/test-output.pdf')
