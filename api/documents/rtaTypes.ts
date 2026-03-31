/** Props for the NSW Residential Tenancy Agreement PDF (server-generated). */
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

export type ResidentialTenancyAgreementProps = {
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
}
