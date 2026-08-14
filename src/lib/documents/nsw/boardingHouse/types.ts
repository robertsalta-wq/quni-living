import type { NswT3AdditionalCharge, NswT3SharedAreas } from '../../../tenancy/nswT3ListingFields.js'

export type NswBoardingHousePayout = {
  account_name: string
  bsb: string
  account_number: string
}

export type NswBoardingHouseAgreementProps = {
  documentId: string
  generatedAt: string
  proprietor: {
    fullName: string
    companyName: string | null
    abn: string | null
    addressLine: string
    email: string
    phone: string
  }
  resident: {
    fullName: string
    email: string
    phone: string
    emergencyContactName: string | null
    emergencyContactPhone: string | null
  }
  premises: {
    addressLine: string
    roomDescription: string
    furnished: boolean | null
    sharedAreas: NswT3SharedAreas
  }
  term: {
    startDate: string
    endDate: string | null
    periodic: boolean
    leaseLengthDescription: string
  }
  occupancyFeeWeeklyAud: number
  securityDepositAud: number | null
  payout: NswBoardingHousePayout | null
  paymentReference: string
  houseRules: string | null
  additionalCharges: NswT3AdditionalCharge[]
  /** v1 always empty. Seam for a later override-notice UI. */
  noticeOverrides?: {
    access?: Array<string | null>
    proprietorTermination?: Array<string | null>
    residentTermination?: Array<string | null>
  }
}

export const NSW_BOARDING_HOUSE_FORBIDDEN_MARKERS = [
  'Quni',
  'Principal',
  'NCAT does not apply',
  'facilitated through',
  'Rental Bonds Online',
  'Licence to Occupy',
  'Subject to final legal review',
  'Draft for legal review',
  'not for execution',
  'SAMPLE',
] as const
