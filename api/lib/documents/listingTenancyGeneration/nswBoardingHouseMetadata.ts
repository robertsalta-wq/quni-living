import type { Json } from '../../../../src/lib/database.types.js'
import { stripDocusealEmbedSrcFromMetadata } from '../../booking/listingAgreementMetadata.js'
import type { NswT3AdditionalCharge } from '../../../../src/lib/tenancy/nswT3ListingFields.js'

export const NSW_BOARDING_HOUSE_GENERATOR_ID = 'nsw-boarding-house'

export function nswBoardingHouseLeaseMetadata(
  existing: unknown,
  charges: NswT3AdditionalCharge[],
): Json {
  const base = stripDocusealEmbedSrcFromMetadata(existing)
  return {
    ...base,
    generator: NSW_BOARDING_HOUSE_GENERATOR_ID,
    additional_charges: charges.map((row) => ({
      item: row.item,
      amount: row.amount,
      when_due: row.whenDue,
      how_calculated: row.howCalculated,
    })),
  }
}
