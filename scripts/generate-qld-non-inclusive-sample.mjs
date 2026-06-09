/**
 * Flattened QLD Form 18a sample: non-inclusive listing with long Item 14 overflow.
 * Output: scripts/test-qld-non-inclusive-item14-overflow.pdf (gitignored)
 *
 * Run: npx tsx scripts/generate-qld-non-inclusive-sample.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fillOfficialQldForm18aPdf } from '../api/lib/documents/officialQldForm18aFill.ts'
import { resolvePropertyUtilities } from '../src/lib/propertyUtilitiesResolver.ts'

const utilitiesResolution = resolvePropertyUtilities({
  featureNames: ['furnished'],
  waterUsageChargedSeparately: false,
  electricityEmbeddedNetwork: null,
  gasEmbeddedNetwork: null,
  waterSeparatelyMeteredEfficientAttestedAt: null,
  utilitiesServices: {
    electricity: {
      tenant_pays: true,
      individually_metered: false,
      apportionment_method:
        '50% of common area electricity usage divided equally among four bedrooms',
      how_must_be_paid: 'Invoiced quarterly to tenant via Quni platform',
    },
    gas: {
      tenant_pays: true,
      individually_metered: true,
      apportionment_method: null,
      how_must_be_paid: 'Paid direct to gas retailer on individual account',
    },
  },
})

const props = {
  documentId: 'qld-non-inclusive-item14-overflow-sample',
  generatedAt: '09/06/2026, 4:00:00 pm',
  landlord: {
    fullName: 'Quinn Lessor',
    companyName: null,
    addressLine: '10 Lessor Lane, West End, QLD, 4101',
    email: 'quinn.lessor@example.com',
    phone: '0400111222',
  },
  tenant: {
    fullName: 'Robert Tenant',
    email: 'robert.tenant@example.com',
    phone: '0411222333',
    dateOfBirth: null,
    emergencyContactName: 'Emergency Person',
    emergencyContactPhone: '0499888777',
    addressForServiceLine: null,
  },
  additionalTenantNames: [],
  premises: {
    addressLine: '22 Rental Street, West End, QLD, 4101',
    propertyType: 'private_room_landlord_off_site',
    roomType: 'Private room',
    furnished: true,
    linenSupplied: true,
    weeklyCleaningService: false,
  },
  premisesInclusionsLine: 'Room: Private room; Furnished',
  maxOccupantsPermitted: 2,
  term: {
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    periodic: false,
    leaseLengthDescription: '12 months',
  },
  rent: {
    weeklyRent: 450,
    platformFeePercent: 0,
    totalWeekly: 450,
    paymentMethod: 'Direct credit',
    rentFrequency: 'weekly',
    paymentTimingDescription: 'Payable in advance each week.',
  },
  bond: { amount: 1800 },
  landlordAgent: null,
  urgentRepairsTradespeople: {
    electrician: 'Quinn Lessor - 0400111222',
    plumber: 'Quinn Lessor - 0400111222',
    other: null,
  },
  electronicService: {
    landlordEmail: 'quinn.lessor@example.com',
    tenantEmail: 'robert.tenant@example.com',
    landlordConsentsToEmailService: true,
    tenantConsentsToEmailService: true,
  },
  lastRentIncreaseDate: null,
  landlordPostcode: '4101',
  premisesPostcode: '4101',
  rentPaymentBankDetails: {
    bsb: '123-456',
    accountNumber: '98765432',
    accountName: 'Quni Living Pty Ltd',
    bankName: 'Example Bank',
  },
  rentPaymentPreference: 'bank_transfer',
  utilitiesResolution,
  specialConditions: [],
  bookingNotes: null,
}

const { pdfBytes } = await fillOfficialQldForm18aPdf(props)
const outPath = join(process.cwd(), 'scripts', 'test-qld-non-inclusive-item14-overflow.pdf')
writeFileSync(outPath, pdfBytes)
console.log(`Wrote ${outPath} (${pdfBytes.length} bytes)`)
