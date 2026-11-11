export const SAMPLE_GENERATED_AT = '02/06/2026, 10:00:00 am'

const LANDLORD = {
  fullName: 'Sam Sample',
  companyName: null,
  addressLine: '1 Sample Street, Exampletown NSW 2000',
  email: 'sam.sample@example.com',
  phone: '0400000000',
}

const TENANT = {
  fullName: 'Jordan Example',
  email: 'jordan.example@example.com',
  phone: '0400000001',
  dateOfBirth: '2002-03-15',
  emergencyContactName: 'Riley Example',
  emergencyContactPhone: '0400000002',
  addressForServiceLine: '2 Example Lane, Sampletown VIC 3000',
}

const SHARED_TERM = {
  startDate: '2025-07-15',
  endDate: '2026-01-15',
  periodic: false,
  leaseLengthDescription: '6 months',
}

const SHARED_RENT = {
  weeklyRent: 420,
  platformFeePercent: 0,
  totalWeekly: 420,
  paymentMethod:
    'Direct deposit to Sam Sample, Example Bank, BSB 000-000, account 00000000.',
}

const SHARED_BOND = { amount: 1680 }

const SHARED_BANK = {
  bsb: '000-000',
  accountNumber: '00000000',
  accountName: 'Sam Sample',
  bankName: 'Example Bank',
}

const SAMPLE_COMPLIANCE = {
  smokeAlarmType: 'battery',
  smokeAlarmBatteryTenantReplaceable: true,
  smokeAlarmBatteryType: '9V',
  smokeAlarmBackupTenantReplaceable: null,
  smokeAlarmBackupBatteryType: null,
  strataOcResponsibleForAlarms: false,
  waterUsageChargedSeparately: false,
  electricityEmbeddedNetwork: false,
  gasEmbeddedNetwork: false,
  strataBylawsApplicable: false,
}

function premisesFor(state, suburb, postcode, propertyType, roomType) {
  return {
    addressLine: `9 Sample Road, ${suburb}, ${state}, ${postcode}`,
    propertyType,
    roomType,
    furnished: true,
    linenSupplied: true,
    weeklyCleaningService: false,
  }
}

export function nswOccupancySampleProps() {
  return {
    documentId: 'nsw-occupancy-review-001',
    generatedAt: SAMPLE_GENERATED_AT,
    serviceTier: 'listing',
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAcn: '675 990 968',
    platformTradingName: 'Quni Living',
    landlord: { ...LANDLORD, addressLine: '1 Sample Street, Exampletown NSW 2000' },
    tenant: { ...TENANT },
    premises: premisesFor('NSW', 'Exampletown', '2000', 'private_room_landlord_on_site', 'Front bedroom'),
    term: { ...SHARED_TERM },
    rent: {
      weeklyRent: 420,
      platformFeePercent: 0,
      totalWeekly: 420,
      paymentMethod: 'Direct credit to Sam Sample, Example Bank, BSB 000-000, account 00000000.',
    },
    bond: { amount: 840 },
    payout: {
      account_name: 'Sam Sample',
      bsb: '000-000',
      account_number: '00000000',
    },
    paymentReference: 'Jordan Example - 9 Sample Road, Exampletown NSW 2000',
    specialConditions: [],
    bookingNotes: null,
    houseRules: 'Quiet hours 10pm-7am. Shared kitchen cleaned after use.',
  }
}

export function nswT3BoardingHouseSampleProps() {
  return {
    documentId: 'nsw-t3-boarding-house-001',
    generatedAt: SAMPLE_GENERATED_AT,
    proprietor: {
      fullName: 'Sam Sample',
      companyName: null,
      abn: null,
      addressLine: '1 Sample Street, Exampletown NSW 2000',
      email: 'sam.sample@example.com',
      phone: '0400000000',
    },
    resident: {
      fullName: 'Jordan Example',
      email: 'jordan.example@example.com',
      phone: '0400000001',
      emergencyContactName: 'Riley Example',
      emergencyContactPhone: '0400000002',
    },
    premises: {
      addressLine: '9 Sample Road, Exampletown NSW 2000',
      roomDescription: 'Room 3, first floor rear',
      furnished: true,
      sharedAreas: {
        kitchen: true,
        bathroom: true,
        commonRoom: true,
        laundry: true,
        other: '',
      },
    },
    term: { ...SHARED_TERM },
    occupancyFeeWeeklyAud: 420,
    securityDepositAud: 840,
    payout: {
      account_name: 'Sam Sample',
      bsb: '000-000',
      account_number: '00000000',
    },
    paymentReference: 'Jordan Example - 9 Sample Road, Exampletown NSW 2000',
    houseRules: 'Quiet hours 10pm-7am. Shared kitchen cleaned after use.',
    additionalCharges: [
      {
        item: 'Electricity',
        amount: 'Actual cost',
        whenDue: 'Monthly in arrears',
        howCalculated: 'Proprietor cost of supply, apportioned equally among occupied rooms',
      },
    ],
  }
}

export function qldOccupancySampleProps() {
  return {
    documentId: 'qld-occupancy-review-001',
    generatedAt: SAMPLE_GENERATED_AT,
    serviceTier: 'listing',
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAcn: '675 990 968',
    platformTradingName: 'Quni Living',
    landlord: { ...LANDLORD, addressLine: '1 Sample Street, Exampletown QLD 4000' },
    tenant: { ...TENANT },
    premises: premisesFor('QLD', 'Exampletown', '4000', 'private_room_landlord_on_site', 'Rear bedroom'),
    term: { ...SHARED_TERM },
    rent: {
      weeklyRent: 380,
      platformFeePercent: 0,
      totalWeekly: 380,
      paymentMethod: 'Direct credit to Sam Sample, Example Bank, BSB 000-000, account 00000000.',
    },
    bond: { amount: 760 },
    payout: {
      account_name: 'Sam Sample',
      bsb: '000-000',
      account_number: '00000000',
    },
    paymentReference: 'Jordan Example - 9 Sample Road, Exampletown QLD 4000',
    specialConditions: [],
    bookingNotes: null,
    houseRules: 'Quiet hours 10pm-7am. No shoes on carpet.',
  }
}

export function vicOccupancySampleProps() {
  return {
    documentId: 'vic-occupancy-review-001',
    generatedAt: SAMPLE_GENERATED_AT,
    serviceTier: 'listing',
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAcn: '675 990 968',
    platformTradingName: 'Quni Living',
    landlord: { ...LANDLORD, addressLine: '1 Sample Street, Exampletown VIC 3000' },
    tenant: { ...TENANT },
    premises: premisesFor('VIC', 'Exampletown', '3000', 'private_room_landlord_on_site', 'Bedroom 2 (rear)'),
    term: { ...SHARED_TERM },
    rent: {
      weeklyRent: 380,
      platformFeePercent: 0,
      totalWeekly: 380,
      paymentMethod: 'Direct credit to Sam Sample, Example Bank, BSB 000-000, account 00000000.',
    },
    bond: { amount: 760 },
    payout: {
      account_name: 'Sam Sample',
      bsb: '000-000',
      account_number: '00000000',
    },
    paymentReference: 'Jordan Example - 9 Sample Road, Exampletown VIC 3000',
    specialConditions: ['Co-occupant (partner) may stay up to 3 nights per week with owner consent.'],
    bookingNotes: null,
    houseRules: 'Quiet hours 10pm-7am. No shoes on carpet. Owner uses kitchen 7-9am weekdays.',
  }
}

export function nswT2AgreementSampleProps() {
  return {
    documentId: 'nsw-ft6600-review-001',
    generatedAt: SAMPLE_GENERATED_AT,
    landlord: { ...LANDLORD, addressLine: '1 Sample Street, Exampletown NSW 2000' },
    tenant: { ...TENANT },
    additionalTenantNames: ['Casey Example'],
    premises: premisesFor('NSW', 'Exampletown', '2000', 'private_room_landlord_off_site', 'Private room'),
    premisesInclusionsLine: 'Furnished bedroom; shared kitchen and bathroom',
    maxOccupantsPermitted: 2,
    term: { ...SHARED_TERM },
    rent: { ...SHARED_RENT, rentFrequency: 'weekly', paymentTimingDescription: 'Payable in advance each week.' },
    bond: { ...SHARED_BOND },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: 'Sam Sample - 0400000000',
      plumber: 'Sam Sample - 0400000000',
      other: null,
    },
    electronicService: {
      landlordEmail: LANDLORD.email,
      tenantEmail: 'jordan.example@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode: '2000',
    premisesPostcode: '2000',
    propertyCompliance: { ...SAMPLE_COMPLIANCE },
    serviceTier: 'listing',
    billsIncluded: false,
    rentPaymentBankDetails: { ...SHARED_BANK },
    rentPaymentPreference: 'bank_transfer',
    specialConditions: [],
    bookingNotes: null,
    premisesPartDescription: null,
    additionalPremisesInclusions: [],
  }
}

export function qldT2AgreementSampleProps() {
  return {
    ...nswT2AgreementSampleProps(),
    documentId: 'qld-form18a-review-001',
    landlord: { ...LANDLORD, addressLine: '1 Sample Street, Exampletown QLD 4000' },
    tenant: { ...TENANT },
    premises: premisesFor('QLD', 'Exampletown', '4000', 'private_room_landlord_off_site', 'Private room'),
    landlordPostcode: '4000',
    premisesPostcode: '4000',
  }
}

export function vicT2AgreementSampleProps() {
  return {
    ...nswT2AgreementSampleProps(),
    documentId: 'vic-form1-review-001',
    landlord: { ...LANDLORD, addressLine: '1 Sample Street, Exampletown VIC 3000' },
    tenant: { ...TENANT },
    premises: premisesFor('VIC', 'Exampletown', '3000', 'private_room_landlord_off_site', 'Private room'),
    landlordPostcode: '3000',
    premisesPostcode: '3000',
  }
}

function addendumFromAgreement(base, signingPackage) {
  return {
    documentId: `${base.documentId.replace('-review-', '-addendum-review-')}`,
    generatedAt: base.generatedAt,
    landlord: base.landlord,
    tenant: base.tenant,
    premises: base.premises,
    term: base.term,
    rent: base.rent,
    bond: base.bond,
    utilitiesDescription:
      'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.',
    signingPackage,
    serviceTier: 'listing',
    allInclusive: false,
    billsIncluded: false,
    listingDisclosureLabels: [],
    rentPaymentMethod: 'bank_transfer',
    bankDetails: { ...SHARED_BANK },
    emergencyContact: 'Riley Example - 0400000002',
    rentEnquiriesEmail: 'sam.sample@example.com',
    generalEnquiriesEmail: 'info@quni.com.au',
    houseCommunicationsChannel: 'Sample house chat',
    utilitiesCap: null,
    houseRules: 'Quiet hours 10pm-7am. No smoking indoors.',
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAbn: '65 675 990 968',
    platformAcn: '675 990 968',
    additionalTenantNames: base.additionalTenantNames,
  }
}

export function nswAddendumSampleProps() {
  return addendumFromAgreement(nswT2AgreementSampleProps(), 'residential_tenancy')
}

export function qldAddendumSampleProps() {
  return addendumFromAgreement(qldT2AgreementSampleProps(), 'residential_tenancy_qld')
}

export function vicAddendumSampleProps() {
  return addendumFromAgreement(vicT2AgreementSampleProps(), 'residential_tenancy_vic')
}
