import type { QldGeneralTenancyAgreementProps } from '../../documents/rtaTypes.js'

/** Representative VIC Form 1 props for fill sample / visual review (not a live booking). */
export function vicForm1RepresentativeFixtureProps(): QldGeneralTenancyAgreementProps {
  return {
    documentId: 'vic-form1-fill-sample',
    generatedAt: '13/06/2026, 9:00:00 am',
    landlord: {
      fullName: 'Quinn Lee',
      companyName: 'Quinnvestments Pty Ltd',
      addressLine: '18 Malvina Street, Ryde, VIC, 2112',
      email: 'quinn.lessor@example.com',
      phone: '0410 025 719',
      residenceLocation: null,
    },
    tenant: {
      fullName: 'Robert Saltalamacchia',
      email: 'rob.tenant@example.com',
      phone: '0425 775 308',
      dateOfBirth: null,
      emergencyContactName: 'Jane Emergency',
      emergencyContactPhone: '0499 888 777',
      addressForServiceLine: '88 Student Lane, Carlton, VIC, 3053',
    },
    additionalTenantNames: ['Alex Co-Renter'],
    premises: {
      addressLine: '22 Rental Street, Fitzroy, VIC, 3065',
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
      platformFeePercent: 10,
      totalWeekly: 495,
      paymentMethod: 'Direct deposit',
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: 1800 },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: 'Quinn Lee - 0410 025 719',
      plumber: 'Quinn Lee - 0410 025 719',
      other: null,
    },
    electronicService: {
      landlordEmail: 'quinn.lessor@example.com',
      tenantEmail: 'rob.tenant@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode: '2112',
    premisesPostcode: '3065',
    rentPaymentBankDetails: {
      bsb: '063-000',
      accountNumber: '12345678',
      accountName: 'Quinnvestments Pty Ltd',
      bankName: 'Commonwealth Bank',
    },
    rentPaymentPreference: 'quni_platform',
    specialConditions: ['Maximum two occupants in the leased room unless agreed in writing.'],
    bookingNotes: 'Co-renter Alex approved on booking.',
  }
}
