/**
 * Types for PDF agreements under the NSW Residential Tenancies Act 2010 (server-generated).
 *
 * - `OccupancyAgreementProps` — Quni Residential Occupancy Agreement (custom).
 * - `NswResidentialTenancyAgreementProps` — prescribed standard form FT6600 (Dec 2025);
 *   static clause text is sourced from `docs/ft6600-2025-12-17.txt`; these types cover
 *   schedule / variable fields only.
 * - `QuniPlatformAddendumProps` — Quni platform addendum for the residential tenancy package.
 */

export type RtaLandlordPdf = {
  fullName: string
  companyName: string | null
  addressLine: string
  email: string
  phone: string
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
  signingPackage: 'residential_tenancy'
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
}
