/**
 * Types for PDF agreements under the NSW Residential Tenancies Act 2010 (server-generated).
 *
 * - `OccupancyAgreementProps` - Quni Residential Occupancy Agreement (custom).
 * - `NswResidentialTenancyAgreementProps` - prescribed standard form FT6600 (Dec 2025);
 *   static clause text is sourced from `docs/ft6600-2025-12-17.txt`; these types cover
 *   schedule / variable fields only.
 * - `QuniPlatformAddendumProps` - Quni platform addendum for the residential tenancy package (NSW or QLD signing package).
 * - `QldGeneralTenancyAgreementProps` - RTA Form 18a schedule fill inputs (official PDF AcroForm).
 */

export type RtaLandlordPdf = {
  fullName: string
  companyName: string | null
  addressLine: string
  email: string
  phone: string
  /** FT6600 overseas / non-NSW residence line; omit when landlord ordinarily resides in NSW. */
  residenceLocation: string | null
}

export type RtaTenantPdf = {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  /** Tenant address for service of notices (FT6600); omit schedule lines when null/absent. */
  addressForServiceLine?: string | null
}

export type RtaPremisesPdf = {
  addressLine: string
  propertyType: string | null
  roomType: string | null
  furnished: boolean | null
  linenSupplied: boolean | null
  weeklyCleaningService: boolean | null
  /** QLD on-site: rooms occupied/available for residents (s 43 declaration). */
  roomsRentedToResidents?: number | null
}

export type RtaTermPdf = {
  startDate: string
  endDate: string | null
  periodic: boolean
  leaseLengthDescription: string
}

export type RtaRentPdf = {
  weeklyRent: number
  platformFeePercent: number
  totalWeekly: number
  paymentMethod: string
}

export type RtaBondPdf = {
  amount: number | null
}

export type OccupancyAgreementProps = {
  documentId: string
  generatedAt: string
  /** Listing (default) or Managed - drives Clause 11 owner-side fee wording. */
  serviceTier?: 'listing' | 'managed'
  landlord: RtaLandlordPdf
  tenant: RtaTenantPdf
  premises: RtaPremisesPdf
  term: RtaTermPdf
  rent: RtaRentPdf
  bond: RtaBondPdf
  specialConditions: string[]
  bookingNotes: string | null
  /** Property house rules text; omit PDF section when null or whitespace-only. */
  houseRules: string | null
}

/** Landlord's agent row on the FT6600 schedule (optional). */
export type NswRtaLandlordAgent = {
  name: string
  licenseNumber: string | null
  businessAddress: string
  phone: string
  email: string | null
}

/**
 * Names of tradespersons "named in this agreement" for urgent repairs (clause 20.4).
 * Use null or empty string where the printed form should leave a line blank.
 */
export type NswRtaUrgentRepairsContacts = {
  electrician: string | null
  plumber: string | null
  other: string | null
}

/** Rent and payment lines on the agreement schedule (Quni still stores weekly figures in `RtaRentPdf`). */
export type NswRtaRentSchedule = RtaRentPdf & {
  rentFrequency: 'weekly' | 'fortnightly' | 'monthly'
  /** Plain-language timing, e.g. when each period is due in advance. */
  paymentTimingDescription: string
}

/** NSW FT6600 schedule compliance fields sourced from properties.* columns. */
export type NswFt6600PropertyCompliance = {
  smokeAlarmType: 'hardwired' | 'battery' | null
  smokeAlarmBatteryTenantReplaceable: boolean | null
  smokeAlarmBatteryType: string | null
  smokeAlarmBackupTenantReplaceable: boolean | null
  smokeAlarmBackupBatteryType: string | null
  strataOcResponsibleForAlarms: boolean | null
  waterUsageChargedSeparately: boolean | null
  electricityEmbeddedNetwork: boolean | null
  gasEmbeddedNetwork: boolean | null
  strataBylawsApplicable: boolean | null
}

/** Email addresses and consent for electronic service of notices (clause 50). */
export type NswRtaElectronicService = {
  landlordEmail: string
  tenantEmail: string
  landlordConsentsToEmailService: boolean
  tenantConsentsToEmailService: boolean
}

/**
 * Props for the prescribed NSW Residential Tenancy Agreement PDF (FT6600).
 * Fixed clauses, notes, and signature labels are rendered verbatim from `docs/ft6600-2025-12-17.txt`.
 */
export type NswResidentialTenancyAgreementProps = {
  documentId: string
  generatedAt: string
  /** Resolved from `bookings.service_tier_final` at generation time. */
  serviceTier?: 'listing' | 'managed'
  landlord: RtaLandlordPdf
  /** Primary tenant (tenant 1); co-tenant rows use `additionalTenantNames`. */
  tenant: RtaTenantPdf
  /** Names only for tenants 2–4 (optional signature blocks on FT6600). */
  additionalTenantNames: string[]
  premises: RtaPremisesPdf
  /** If only part of the premises is let; null if the whole premises. */
  premisesPartDescription: string | null
  /** Additional items/areas included with "residential premises" (clause 1 / schedule). */
  additionalPremisesInclusions: string[]
  /** Maximum number of residents permitted (schedule; clause 16.5). */
  maxOccupantsPermitted: number | null
  term: RtaTermPdf
  rent: NswRtaRentSchedule
  bond: RtaBondPdf
  landlordAgent: NswRtaLandlordAgent | null
  urgentRepairsTradespeople: NswRtaUrgentRepairsContacts
  electronicService: NswRtaElectronicService
  /** Listing has bills/utilities included - legacy fallback for water usage when property column unset. */
  billsIncluded?: boolean | null
  /** Landlord-entered FT6600 schedule compliance (properties table). */
  propertyCompliance: NswFt6600PropertyCompliance
  specialConditions: string[]
  bookingNotes: string | null
}

/**
 * Queensland Form 18a - General Tenancy Agreement (prescribed schedule fields + Part 2 verbatim body).
 * Part 2 standard terms ship in the official RTA PDF (`docs/qld/form18a-renamed.pdf`); not re-typeset.
 */
export type QldGeneralTenancyAgreementProps = {
  documentId: string
  generatedAt: string
  landlord: RtaLandlordPdf
  tenant: RtaTenantPdf
  /** Optional co-tenants for Items 2.1 (2) and (3); platform usually has one tenant. */
  additionalTenantNames: string[]
  premises: RtaPremisesPdf
  /** Item 5.2 inclusions line (furniture, goods, etc.). */
  premisesInclusionsLine: string | null
  maxOccupantsPermitted: number | null
  term: RtaTermPdf
  rent: NswRtaRentSchedule
  bond: RtaBondPdf
  landlordAgent: NswRtaLandlordAgent | null
  urgentRepairsTradespeople: NswRtaUrgentRepairsContacts
  electronicService: NswRtaElectronicService
  /** Item 11 - day last rent increased (ISO date) or null if unknown / N/A. */
  lastRentIncreaseDate: string | null
  /** Item 1 - lessor postcode (schedule line). */
  landlordPostcode: string
  /** Item 5.1 - premises postcode. */
  premisesPostcode: string
  /** Item 9 - direct credit details when rent is paid by bank transfer. */
  rentPaymentBankDetails: {
    bsb: string
    accountNumber: string
    accountName: string
    bankName: string
  } | null
  /**
   * `bookings.rent_payment_method` - drives at least two Item 9 methods (Standard term 8(3) / s.83).
   * Single enum per booking; rendering pairs methods to match operational reality.
   */
  rentPaymentPreference: 'bank_transfer' | 'quni_platform' | null
  /** When set, Items 13–15 derive from canonical utilities resolver; omit for legacy hard-coded fill. */
  utilitiesResolution?: import('../../src/lib/propertyUtilitiesResolver.js').PropertyUtilitiesResolution | null
  specialConditions: string[]
  bookingNotes: string | null
}

/** Quni platform addendum PDF (paired with prescribed RTA form in the signing package). */
export type QuniPlatformAddendumProps = {
  documentId: string
  generatedAt: string
  landlord: RtaLandlordPdf
  tenant: RtaTenantPdf
  premises: RtaPremisesPdf
  term: RtaTermPdf
  rent: RtaRentPdf
  bond: RtaBondPdf
  utilitiesDescription: string
  /** NSW FT6600 package vs QLD Form 18a vs VIC Form 1 + Quni addendum. */
  signingPackage: 'residential_tenancy' | 'residential_tenancy_qld' | 'residential_tenancy_vic'
  rentPaymentMethod: 'bank_transfer' | 'quni_platform' | null
  bankDetails: {
    bsb: string
    accountNumber: string
    accountName: string
    bankName: string
  }
  emergencyContact: string
  rentEnquiriesEmail: string
  generalEnquiriesEmail: string
  houseCommunicationsChannel: string
  /** Quarterly utilities cap (AUD), e.g. from `pricing_config` tier `t2`. */
  utilitiesCap: number
  /** Property-specific rules text; may be platform default when property has none. */
  houseRules: string | null
  landlordServiceFeeText?: string
  cardSurchargeDomesticText?: string
  cardSurchargeInternationalText?: string
  moveOutLateCheckoutFeeText?: string
  moveOutInternationalTransferFeeText?: string
  /** From `platform_config` (`business.legal_name`). Empty/absent → PDF uses default legal name helper. */
  platformLegalName?: string | null
  platformAbn?: string | null
  platformAcn?: string | null
  /** From `platform_config` (`business.director_name`). Shown on identification line when set. */
  platformDirectorName?: string | null
  /** Additional named tenants (e.g. co-tenant from booking snapshot). */
  additionalTenantNames?: string[]
}
