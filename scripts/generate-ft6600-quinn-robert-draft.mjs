/**
 * Regenerate flattened FT6600 draft for Quinn/Robert spec booking (visual QA).
 * Run: node scripts/generate-ft6600-quinn-robert-draft.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'scripts', 'test-official-form-spike', 'quinn-robert-ft6600-filled.pdf')

const { fillOfficialNswFt6600Pdf } = await import('../api/lib/documents/officialNswFt6600Fill.ts')

const QUINN_ROBERT_FT6600_PROPS = {
  documentId: 'nsw-ft6600-quinn-robert',
  generatedAt: '03/06/2026, 10:00:00 am',
  landlord: {
    fullName: 'Quinn Lee',
    companyName: null,
    addressLine: '18 Malvina Street, Ryde, NSW, 2112',
    email: 'quinniele90@gmail.com',
    phone: '+61410025719',
  },
  tenant: {
    fullName: 'Robert Saltalamacchia',
    email: 'rob@3thingsatonce.com.au',
    phone: '+61425775308',
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    addressForServiceLine: null,
  },
  additionalTenantNames: [],
  premises: {
    addressLine: 'Unit 406/311 Hume Highway, Liverpool, NSW, 2170',
    propertyType: 'private_room_landlord_off_site',
    roomType: 'Private room',
    furnished: true,
    linenSupplied: true,
    weeklyCleaningService: false,
  },
  premisesPartDescription: null,
  additionalPremisesInclusions: [],
  maxOccupantsPermitted: 2,
  term: {
    startDate: '2026-06-10',
    endDate: '2026-12-10',
    periodic: false,
    leaseLengthDescription: '6 months',
  },
  rent: {
    weeklyRent: 400,
    platformFeePercent: 0,
    totalWeekly: 400,
    paymentMethod:
      'Direct deposit - Account name: QUINNVESTMENTS PTY LTD; BSB: 939-200; Account number: 823175945',
    rentFrequency: 'weekly',
    paymentTimingDescription: 'Payable in advance each week.',
  },
  bond: { amount: 800 },
  landlordAgent: null,
  urgentRepairsTradespeople: { electrician: null, plumber: null, other: null },
  electronicService: {
    landlordEmail: 'quinniele90@gmail.com',
    tenantEmail: 'rob@3thingsatonce.com.au',
    landlordConsentsToEmailService: false,
    tenantConsentsToEmailService: false,
  },
  billsIncluded: true,
  specialConditions: [],
  bookingNotes: null,
}

const { pdfBytes } = await fillOfficialNswFt6600Pdf(QUINN_ROBERT_FT6600_PROPS)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, pdfBytes)
console.log('wrote', out, pdfBytes.length, 'bytes')
