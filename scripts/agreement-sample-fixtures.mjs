export const SAMPLE_GENERATED_AT = '02/06/2026, 10:00:00 am'

const LANDLORD = {
  fullName: 'Alex Rental Provider',
  companyName: null,
  addressLine: '12 Provider Street, Carlton, VIC, 3053',
  email: 'alex.provider@example.com',
  phone: '0400111222',
}

const TENANT = {
  fullName: 'Jordan Renter',
  email: 'jordan.renter@example.com',
  phone: '0411222333',
  dateOfBirth: '2002-03-15',
  emergencyContactName: 'Sam Renter',
  emergencyContactPhone: '0411333444',
  addressForServiceLine: '88 Student Lane, Parkville, VIC, 3052',
}

const SHARED_TERM = {
  startDate: '2025-07-15',
  endDate: '2026-01-15',
  periodic: false,
  leaseLengthDescription: '6 months',
}

const SHARED_RENT = {
  weeklyRent: 420,
  platformFeePercent: 10,
  totalWeekly: 420,
  paymentMethod:
    'Direct deposit - Account name: Quni Living Pty Ltd; BSB: 123-456; Account number: 987654321. Tenants may also pay recurring rent via the Quni Living platform (quni.com.au).',
}

const SHARED_BOND = { amount: 1680 }

const SHARED_BANK = {
  bsb: '123456',
  accountNumber: '987654321',
  accountName: 'Quni Living Pty Ltd',
  bankName: 'Example Bank',
}

function premisesFor(state, suburb, postcode, propertyType, roomType) {
  return {
    addressLine: `45 Brunswick Street, ${suburb}, ${state}, ${postcode}`,
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
    landlord: { ...LANDLORD, addressLine: '12 Owner Street, Newtown, NSW, 2042' },
    tenant: { ...TENANT, fullName: 'Jordan Resident', email: 'jordan.resident@example.com' },
    premises: premisesFor('NSW', 'Newtown', '2042', 'private_room_landlord_on_site', 'Front bedroom'),
    term: { ...SHARED_TERM },
    rent: {
      weeklyRent: 420,
      platformFeePercent: 0,
      totalWeekly: 420,
      paymentMethod: 'Direct credit to owner account (fee-free). Reference: resident name and property address.',
    },
    bond: { amount: 840 },
    specialConditions: [],
    bookingNotes: null,
    houseRules: 'Quiet hours 10pm-7am. Shared kitchen cleaned after use.',
  }
}

export function qldOccupancySampleProps() {
  return {
    documentId: 'qld-occupancy-review-001',
    generatedAt: SAMPLE_GENERATED_AT,
    serviceTier: 'listing',
    landlord: { ...LANDLORD, addressLine: '12 Owner Street, West End, QLD, 4101' },
    tenant: { ...TENANT, fullName: 'Jordan Resident', email: 'jordan.resident@example.com' },
    premises: premisesFor('QLD', 'West End', '4101', 'private_room_landlord_on_site', 'Rear bedroom'),
    term: { ...SHARED_TERM },
    rent: {
      weeklyRent: 380,
      platformFeePercent: 0,
      totalWeekly: 380,
      paymentMethod: 'Direct credit to owner account (fee-free). Reference: resident name and property address.',
    },
    bond: { amount: 760 },
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
    landlord: { ...LANDLORD, addressLine: '12 Owner Street, Carlton, VIC, 3053' },
    tenant: { ...TENANT, fullName: 'Jordan Resident', email: 'jordan.resident@example.com' },
    premises: premisesFor('VIC', 'Carlton', '3053', 'private_room_landlord_on_site', 'Bedroom 2 (rear)'),
    term: { ...SHARED_TERM },
    rent: {
      weeklyRent: 380,
      platformFeePercent: 0,
      totalWeekly: 380,
      paymentMethod: 'Direct credit to owner account (fee-free). Reference: resident name and property address.',
    },
    bond: { amount: 760 },
    specialConditions: ['Co-occupant (partner) may stay up to 3 nights per week with owner consent.'],
    bookingNotes: null,
    houseRules: 'Quiet hours 10pm-7am. No shoes on carpet. Owner uses kitchen 7-9am weekdays.',
  }
}

export function nswT2AgreementSampleProps() {
  return {
    documentId: 'nsw-ft6600-review-001',
    generatedAt: SAMPLE_GENERATED_AT,
    landlord: { ...LANDLORD, addressLine: '25 Enmore Road, Newtown, NSW, 2042' },
    tenant: { ...TENANT, fullName: 'Jordan Tenant', email: 'jordan.tenant@example.com' },
    additionalTenantNames: ['Casey Co-Renter'],
    premises: premisesFor('NSW', 'Newtown', '2042', 'private_room_landlord_off_site', 'Private room'),
    premisesInclusionsLine: 'Furnished bedroom; shared kitchen and bathroom',
    maxOccupantsPermitted: 2,
    term: { ...SHARED_TERM },
    rent: { ...SHARED_RENT, rentFrequency: 'weekly', paymentTimingDescription: 'Payable in advance each week.' },
    bond: { ...SHARED_BOND },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: 'Alex Rental Provider - 0400111222',
      plumber: 'Alex Rental Provider - 0400111222',
      other: null,
    },
    electronicService: {
      landlordEmail: LANDLORD.email,
      tenantEmail: 'jordan.tenant@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode: '2042',
    premisesPostcode: '2042',
    rentPaymentBankDetails: { ...SHARED_BANK },
    rentPaymentPreference: 'quni_platform',
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
    landlord: { ...LANDLORD, addressLine: '88 Boundary Street, West End, QLD, 4101' },
    tenant: { ...TENANT, fullName: 'Jordan Tenant', email: 'jordan.tenant@example.com' },
    premises: premisesFor('QLD', 'West End', '4101', 'private_room_landlord_off_site', 'Private room'),
    landlordPostcode: '4101',
    premisesPostcode: '4101',
  }
}

export function vicT2AgreementSampleProps() {
  return {
    ...nswT2AgreementSampleProps(),
    documentId: 'vic-form1-review-001',
    landlord: { ...LANDLORD, addressLine: '12 Provider Street, Carlton, VIC, 3053' },
    tenant: { ...TENANT, fullName: 'Jordan Renter', email: 'jordan.renter@example.com' },
    premises: premisesFor('VIC', 'Fitzroy', '3065', 'private_room_landlord_off_site', 'Private room'),
    landlordPostcode: '3053',
    premisesPostcode: '3065',
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
    serviceTier: 'managed',
    allInclusive: true,
    billsIncluded: true,
    listingDisclosureLabels: ['Bills included', 'Water included in rent'],
    rentPaymentMethod: 'quni_platform',
    bankDetails: { ...SHARED_BANK },
    emergencyContact: 'Sam Renter - 0411333444',
    rentEnquiriesEmail: 'rent@quni.com.au',
    generalEnquiriesEmail: 'hello@quni.com.au',
    houseCommunicationsChannel: 'Property WhatsApp group (house-related only)',
    utilitiesCap: 150,
    houseRules: 'Quiet hours 10pm-7am. No smoking indoors.',
    landlordServiceFeeText: '10%',
    cardSurchargeDomesticText: '1.7% + $0.30',
    cardSurchargeInternationalText: '3.5% + $0.30',
    moveOutLateCheckoutFeeText: '$50',
    moveOutInternationalTransferFeeText: '$50',
    platformLegalName: 'Quni Living Pty Ltd',
    platformAbn: '12 345 678 901',
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
